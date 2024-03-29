/*
 * Sonatype Nexus (TM) Open Source Version
 * Copyright (c) 2008-present Sonatype, Inc.
 * All rights reserved. Includes the third-party code listed at http://links.sonatype.com/products/nexus/oss/attributions.
 *
 * This program and the accompanying materials are made available under the terms of the Eclipse Public License Version 1.0,
 * which accompanies this distribution and is available at http://www.eclipse.org/legal/epl-v10.html.
 *
 * Sonatype Nexus (TM) Professional Version is available from Sonatype, Inc. "Sonatype" and "Sonatype Nexus" are trademarks
 * of Sonatype, Inc. Apache Maven is a trademark of the Apache Software Foundation. M2eclipse is a trademark of the
 * Eclipse Foundation. All other trademarks are the property of their respective owners.
 */
package org.sonatype.nexus.blobstore.file;

import java.io.ByteArrayInputStream;
import java.util.List;
import java.util.stream.Collectors;

import org.sonatype.nexus.blobstore.api.Blob;
import org.sonatype.nexus.blobstore.api.BlobStore;
import org.sonatype.nexus.blobstore.file.internal.SoftDeletedBlobsStoreImpl;
import org.sonatype.nexus.blobstore.file.internal.datastore.DatastoreFileBlobDeletionIndex;
import org.sonatype.nexus.blobstore.file.internal.orient.OrientFileBlobDeletionIndex;
import org.sonatype.nexus.blobstore.file.store.SoftDeletedBlobsData;
import org.sonatype.nexus.blobstore.file.store.SoftDeletedBlobsStore;
import org.sonatype.nexus.blobstore.file.store.internal.SoftDeletedBlobsDAO;
import org.sonatype.nexus.datastore.api.DataSessionSupplier;
import org.sonatype.nexus.testdb.DataSessionRule;
import org.sonatype.nexus.transaction.TransactionModule;

import com.google.common.collect.ImmutableMap;
import com.google.inject.Guice;
import com.google.inject.Provides;
import org.junit.Rule;
import org.junit.Test;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.sonatype.nexus.blobstore.api.BlobStore.BLOB_NAME_HEADER;
import static org.sonatype.nexus.blobstore.api.BlobStore.CREATED_BY_HEADER;
import static org.sonatype.nexus.blobstore.api.BlobStore.DIRECT_PATH_BLOB_HEADER;

/**
 * {@link FileBlobStore} integration tests.
 */
public class DatastoreFileBlobStoreIT
    extends FileBlobStoreITSupport
{
  @Rule
  public DataSessionRule sessionRule = new DataSessionRule().access(SoftDeletedBlobsDAO.class);

  private SoftDeletedBlobsStore store;

  @Override
  protected FileBlobDeletionIndex fileBlobDeletionIndex() {
    if (store == null) {
      store = Guice.createInjector(new TransactionModule()
      {
        @Provides
        DataSessionSupplier getDataSessionSupplier() {
          return sessionRule;
        }
      }).getInstance(SoftDeletedBlobsStoreImpl.class);
    }

    return new DatastoreFileBlobDeletionIndex(store);
  }

  @Test
  public void testDeletedIndexMigrationFromOrient() throws Exception {
    BlobStore underTest = createBlobStore("migration-test", new OrientFileBlobDeletionIndex());

    // Delete multiple blobs to populate the index
    byte[] content = randomBytes();
    Blob blob1 = underTest.create(new ByteArrayInputStream(content), ImmutableMap.of(
        CREATED_BY_HEADER, "test",
        BLOB_NAME_HEADER, "health-check/repositoryName/bundle1.gz",
        DIRECT_PATH_BLOB_HEADER, "true"
    ));
    underTest.delete(blob1.getId(), "deleted");

    Blob blob2 = underTest.create(new ByteArrayInputStream(content), ImmutableMap.of(
        CREATED_BY_HEADER, "test",
        BLOB_NAME_HEADER, "health-check/repositoryName/bundle2.gz",
        DIRECT_PATH_BLOB_HEADER, "true"
    ));
    underTest.delete(blob2.getId(), "deleted");

    underTest.stop();

    // User has upgraded to SQL
    underTest = createBlobStore("migration-test", fileBlobDeletionIndex());

    List<String> storedBlobIds = store.readRecords(null, "migration-test").stream()
        .map(SoftDeletedBlobsData::getBlobId)
        .collect(Collectors.toList());

    assertThat(storedBlobIds, containsInAnyOrder(blob1.getId().toString(), blob2.getId().toString()));

    underTest.stop();

    underTest.remove();
  }
}
