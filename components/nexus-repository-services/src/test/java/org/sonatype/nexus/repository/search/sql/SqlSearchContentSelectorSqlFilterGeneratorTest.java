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
package org.sonatype.nexus.repository.search.sql;

import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import org.sonatype.goodies.testsupport.TestSupport;
import org.sonatype.nexus.repository.rest.SearchFieldSupport;
import org.sonatype.nexus.repository.rest.SearchMappings;
import org.sonatype.nexus.repository.rest.internal.DefaultSearchMappings;
import org.sonatype.nexus.selector.CselSelector;
import org.sonatype.nexus.selector.SelectorConfiguration;
import org.sonatype.nexus.selector.SelectorManager;
import org.sonatype.nexus.selector.SelectorSqlBuilder;

import com.google.common.collect.ImmutableMap;
import com.google.common.collect.ImmutableSet;
import org.junit.Before;
import org.junit.Test;
import org.mockito.Mock;

import static java.util.Arrays.asList;
import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.collection.IsMapContaining.hasEntry;
import static org.hamcrest.collection.IsMapContaining.hasKey;
import static org.hamcrest.core.Is.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.when;
import static org.sonatype.nexus.repository.rest.internal.DefaultSearchMappings.SEARCH_REPOSITORY_NAME;

public class SqlSearchContentSelectorSqlFilterGeneratorTest
    extends TestSupport
{
  public static final String REPOSITORY_CONDITION_FORMAT = "repositoryConditionFormat";

  public static final String REPOSITORY_NAME_PARAM = "repositoryNameParam";

  public static final String REPOSITORY_NAME_VALUE = "repositoryNameValue";

  @Mock
  private SelectorConfiguration configuration1;

  @Mock
  private SelectorConfiguration configuration2;

  @Mock
  private SelectorManager selectorManager;

  @Mock
  private SqlSearchQueryConditionBuilder conditionBuilder;

  protected Map<String, SearchFieldSupport> fieldMappings;

  private SqlSearchContentSelectorSqlFilterGenerator underTest;

  @Before
  public void setup() {
    Map<String, SearchMappings> searchMappings = new HashMap<>();
    searchMappings.put("default", new DefaultSearchMappings());
    underTest = new SqlSearchContentSelectorSqlFilterGenerator(selectorManager, conditionBuilder, searchMappings);
  }

  @Test
  public void shouldCreateContentSelectorSqlFilter() throws Exception {
    Set<String> repositories = ImmutableSet.of("repo1", "repo2");
    mockSelectorConfiguration();
    mockCondition(repositories);

    SqlSearchContentSelectorFilter filter =
        underTest.createFilter(asList(configuration1, configuration2), repositories, "raw");

    assertThat(filter.hasFilters(), is(true));
    assertThat(filter.queryFormat(),
        is("((#{filterParams.s0p0} AND repositoryConditionFormat)" +
            " OR (#{filterParams.s1p0} AND repositoryConditionFormat))"));

    assertThat(filter.queryParameters(), hasEntry(REPOSITORY_NAME_PARAM, REPOSITORY_NAME_VALUE));
    assertThat(filter.queryParameters(), hasKey("s0p0"));
    assertThat(filter.queryParameters(), hasKey("s1p0"));
  }

  private void mockCondition(final Set<String> repositories) {
    Map<String, String> params = ImmutableMap.of(REPOSITORY_NAME_PARAM, REPOSITORY_NAME_VALUE);
    SqlSearchQueryCondition repositoryCondition = getRepositoryCondition(params);
    when(conditionBuilder.condition(SEARCH_REPOSITORY_NAME, repositories, "s0p_")).thenReturn(repositoryCondition);
    when(conditionBuilder.condition(SEARCH_REPOSITORY_NAME, repositories, "s1p_")).thenReturn(repositoryCondition);
  }

  private SqlSearchQueryCondition getRepositoryCondition(final Map<String, String> params) {
    return new SqlSearchQueryCondition(REPOSITORY_CONDITION_FORMAT, params);
  }

  private void mockSelectorConfiguration() throws Exception {
    when(configuration1.getType()).thenReturn(CselSelector.TYPE);
    when(configuration2.getType()).thenReturn(CselSelector.TYPE);

    doAnswer(invocationOnMock -> {
      Object[] arguments = invocationOnMock.getArguments();
      SelectorSqlBuilder selectorSqlBuilder = (SelectorSqlBuilder) arguments[1];
      selectorSqlBuilder.appendLiteral("value");
      return invocationOnMock;
    }).when(selectorManager).toSql(any(), any());
  }
}
