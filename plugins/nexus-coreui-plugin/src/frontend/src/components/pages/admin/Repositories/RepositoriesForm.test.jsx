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
import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  getAllByRole,
  getByRole,
  queryByRole
} from '@testing-library/react';
import {when} from 'jest-when';
import '@testing-library/jest-dom/extend-expect';
import TestUtils from '@sonatype/nexus-ui-plugin/src/frontend/src/interface/TestUtils';

import axios from 'axios';
import UIStrings from '../../../../constants/UIStrings';

import RepositoriesForm from './RepositoriesForm';

import {repositoryUrl} from './RepositoriesFormMachine';
import {repositoriesUrl} from './facets/GenericGroupConfiguration';
import {RECIPES_URL} from './facets/GenericFormatConfiguration';
import {ROUTING_RULES_URL} from './facets/GenericOptionsConfiguration';
import {mergeDeepRight} from 'ramda';
import {genericDefaultValues} from './RepositoryFormDefaultValues';

jest.mock('axios');

jest.mock('@sonatype/nexus-ui-plugin', () => ({
  ...jest.requireActual('@sonatype/nexus-ui-plugin'),
  ExtAPIUtils: {
    request: (action, method, data = null) =>
      jest.requireMock('axios').get('/service/extdirect', {
        action,
        method,
        data,
        type: 'rpc',
        tid: '8'
      }),
    useExtMachine: jest.requireActual('@sonatype/nexus-ui-plugin').ExtAPIUtils.useExtMachine,
    extractResult: jest.requireActual('@sonatype/nexus-ui-plugin').ExtAPIUtils.extractResult
  }
}));

const {EDITOR} = UIStrings.REPOSITORIES;

const BLOB_STORE_EXT_REQUEST = {
  action: 'coreui_Blobstore',
  method: 'readNames',
  data: null,
  type: 'rpc',
  tid: '8'
};

function CLEANUP_EXT_REQUEST(format = 'maven2') {
  return {
    action: 'cleanup_CleanupPolicy',
    method: 'readByFormat',
    data: [
      {
        filter: [
          {
            property: 'format',
            value: format
          }
        ]
      }
    ],
    type: 'rpc',
    tid: '8'
  };
}

describe('RepositoriesForm', () => {
  const getCheckbox = (fieldsetLabel) => {
    const container = screen.queryByRole('group', {name: fieldsetLabel});
    return container ? queryByRole(container, 'checkbox') : null;
  };

  const selectors = {
    ...TestUtils.selectors,
    getCreateButton: () => screen.getByText(EDITOR.CREATE_BUTTON, {selector: 'button'}),
    getSaveButton: () => screen.getByText(EDITOR.SAVE_BUTTON, {selector: 'button'}),
    getCancelButton: () => screen.queryByText('Cancel'),
    getReadOnlyUrl: () => screen.getByText(EDITOR.URL_LABEL, {selector: 'dt'}),
    getFormatSelect: () => screen.getByLabelText(EDITOR.FORMAT_LABEL),
    getTypeSelect: () => screen.getByLabelText(EDITOR.TYPE_LABEL),
    getNameInput: () => screen.getByLabelText(EDITOR.NAME_LABEL),
    getBlobStoreSelect: () => screen.getByLabelText(EDITOR.BLOB_STORE_LABEL),
    getDeploymentPolicySelect: () => screen.queryByLabelText(EDITOR.DEPLOYMENT_POLICY_LABEL),
    getStatusCheckbox: () => screen.getByRole('checkbox', {name: EDITOR.STATUS_DESCR}),
    getProprietaryComponentsCheckbox: () =>
      screen.queryByRole('checkbox', {
        name: EDITOR.PROPRIETARY_COMPONENTS_DESCR
      }),
    getHostedSectionTitle: () => screen.queryByText(EDITOR.HOSTED_CAPTION),
    getCleanupSectionTitle: () => screen.queryByText(EDITOR.CLEANUP_CAPTION),
    getGroupSectionTitle: () => screen.queryByText(EDITOR.GROUP_CAPTION),
    getTransferListOption: (optionLabel) => screen.getByLabelText(optionLabel),
    getRoutingRuleSelect: () => screen.queryByLabelText(EDITOR.ROUTING_RULE_LABEL),
    getRemoteUrlInput: () => screen.queryByLabelText(EDITOR.REMOTE_STORAGE_LABEL),
    getContentMaxAgeInput: () => screen.getByLabelText(EDITOR.MAX_COMP_AGE_LABEL),
    getMetadataMaxAgeInput: () => screen.getByLabelText(EDITOR.MAX_META_AGE_LABEL),
    getAuthTypeSelect: () => screen.getByLabelText(EDITOR.AUTH_TYPE_LABEL),
    getUsernameInput: () => screen.queryByLabelText(EDITOR.USERNAME_LABEL),
    getPasswordInput: () => screen.queryByLabelText(EDITOR.PASSWORD_LABEL),
    getNtlmHostInput: () => screen.queryByLabelText(EDITOR.NTLM_HOST_LABEL),
    getNtlmDomainInput: () => screen.queryByLabelText(EDITOR.NTLM_DOMAIN_LABEL),
    getUserAgentSuffixInput: () => screen.getByLabelText(EDITOR.USER_AGENT_LABEL),
    getRetriesInput: () => screen.getByLabelText(EDITOR.RETRIES_LABEL),
    getTimeoutInput: () => screen.getByLabelText(EDITOR.TIMEOUT_LABEL),
    getTimeToLiveInput: () => screen.getByLabelText(EDITOR.NEGATIVE_CACHE_TTL_LABEL),
    getBlockedCheckbox: () => screen.getByRole('checkbox', {name: EDITOR.BLOCK_DESCR}),
    getAutoBlockCheckbox: () => screen.getByRole('checkbox', {name: EDITOR.AUTO_BLOCK_DESCR}),
    getCookiesCheckbox: () => getCheckbox(EDITOR.COOKIES_LABEL),
    getRedirectsCheckbox: () => getCheckbox(EDITOR.REDIRECTS_LABEL),
    getContentValidationCheckbox: () => getCheckbox(EDITOR.CONTENT_VALIDATION_LABEL),
    getRewritePackageUrlsCheckbox: () => getCheckbox(EDITOR.REWRITE_URLS_LABEL),
    getRepodataDepthSelect: () => screen.getByLabelText(EDITOR.REPODATA_DEPTH_LABEL),
    getLayoutPolicySelect: () => screen.getByLabelText(EDITOR.LAYOUT_POLICY_LABEL),
    getContentDispositionSelect: () => screen.getByLabelText(EDITOR.CONTENT_DISPOSITION_LABEL),
    getRemoveNonCataloguedCheckbox: () => getCheckbox(EDITOR.REMOVE_NON_CATALOGED_LABEL),
    getRemoveQuarantinedCheckbox: () => getCheckbox(EDITOR.REMOVE_QUARANTINED_LABEL),
    getVersionPolicySelect: () => screen.getByLabelText(EDITOR.VERSION_POLICY_LABEL)
  };

  const renderView = (itemId = '') => {
    return render(<RepositoriesForm itemId={itemId} onDone={onDone} />);
  };

  const onDone = jest.fn();

  const RECIPES_RESPONSE = [
    {format: 'bower', type: 'proxy'},
    {format: 'maven2', type: 'group'},
    {format: 'maven2', type: 'hosted'},
    {format: 'maven2', type: 'proxy'},
    {format: 'npm', type: 'proxy'},
    {format: 'nuget', type: 'hosted'},
    {format: 'nuget', type: 'proxy'},
    {format: 'nuget', type: 'group'},
    {format: 'p2', type: 'proxy'},
    {format: 'raw', type: 'proxy'},
    {format: 'raw', type: 'hosted'},
    {format: 'raw', type: 'group'},
    {format: 'yum', type: 'hosted'}
  ];

  const BLOB_STORES_RESPONSE = [{name: 'default'}, {name: 'blob-store-1'}, {name: 'blob-store-2'}];

  const BLOB_STORES_OPTIONS = [{name: EDITOR.SELECT_STORE_OPTION}, ...BLOB_STORES_RESPONSE];

  const FORMAT_OPTIONS = [
    {name: EDITOR.SELECT_FORMAT_OPTION},
    {name: 'bower'},
    {name: 'maven2'},
    {name: 'npm'},
    {name: 'nuget'},
    {name: 'p2'},
    {name: 'raw'},
    {name: 'yum'}
  ];

  const TYPE_OPTIONS = [
    {name: EDITOR.SELECT_TYPE_OPTION},
    {name: 'group'},
    {name: 'proxy'},
    {name: 'hosted'}
  ];

  const MAVEN_REPOS_RESPONSE = [
    {id: 'maven-central', name: 'maven-central'},
    {id: 'maven-releases', name: 'maven-releases'},
    {id: 'maven-snapshots', name: 'maven-snapshots'}
  ];

  const MAVEN_CLEANUP_RESPONSE = [
    {id: 'policy-all-fomats', name: 'policy-all-fomats'},
    {id: 'policy-maven-1', name: 'policy-maven-1'},
    {id: 'policy-maven-2', name: 'policy-maven-2'}
  ];

  const ROUTING_RULES_RESPONSE = [
    {id: 'routing-rule-1', name: 'routing-rule-1'},
    {id: 'routing-rule-2', name: 'routing-rule-2'}
  ];

  beforeEach(() => {
    when(axios.get)
      .calledWith(expect.stringContaining(repositoriesUrl({format: 'maven2'})))
      .mockResolvedValue({data: MAVEN_REPOS_RESPONSE});
    when(axios.get)
      .calledWith(expect.stringContaining(RECIPES_URL))
      .mockResolvedValue({data: RECIPES_RESPONSE});
    when(axios.get)
      .calledWith('/service/extdirect', BLOB_STORE_EXT_REQUEST)
      .mockResolvedValue({data: TestUtils.makeExtResult(BLOB_STORES_RESPONSE)});
    when(axios.get)
      .calledWith('/service/extdirect', CLEANUP_EXT_REQUEST())
      .mockResolvedValue({data: TestUtils.makeExtResult(MAVEN_CLEANUP_RESPONSE)});
    when(axios.get)
      .calledWith(expect.stringContaining(ROUTING_RULES_URL))
      .mockResolvedValue({data: ROUTING_RULES_RESPONSE});
  });

  it('renders the form and populates dropdowns when type is group', async () => {
    const format = 'maven2';

    renderView();

    await waitForElementToBeRemoved(selectors.queryLoadingMask());

    validateSelect(selectors.getFormatSelect(), FORMAT_OPTIONS);

    expect(selectors.getTypeSelect()).toBeDisabled();

    await TestUtils.changeField(selectors.getFormatSelect, format);

    expect(selectors.getTypeSelect()).toBeEnabled();

    validateSelect(selectors.getTypeSelect(), TYPE_OPTIONS);

    await TestUtils.changeField(selectors.getTypeSelect, 'group');

    await waitFor(() => validateSelect(selectors.getBlobStoreSelect(), BLOB_STORES_OPTIONS, ''));

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining(repositoriesUrl({format})))
    );

    MAVEN_REPOS_RESPONSE.forEach((repo) => {
      expect(selectors.getTransferListOption(repo.name)).toBeInTheDocument();
    });

    expect(selectors.getContentValidationCheckbox()).not.toBeInTheDocument();
    expect(selectors.getHostedSectionTitle()).not.toBeInTheDocument();
    expect(selectors.getCleanupSectionTitle()).not.toBeInTheDocument();
  });

  it('renders the form and populates dropdowns when type is hosted', async () => {
    const format = 'maven2';
    const blobStoreResponse = [{name: 'default'}];
    const blobStoreOptions = [{name: EDITOR.SELECT_STORE_OPTION}, ...blobStoreResponse];
    when(axios.get)
      .calledWith('/service/extdirect', BLOB_STORE_EXT_REQUEST)
      .mockResolvedValue({data: TestUtils.makeExtResult(blobStoreResponse)});

    renderView();

    await waitForElementToBeRemoved(selectors.queryLoadingMask());

    await TestUtils.changeField(selectors.getFormatSelect, format);
    await TestUtils.changeField(selectors.getTypeSelect, 'hosted');

    await waitFor(() =>
      validateSelect(selectors.getBlobStoreSelect(), blobStoreOptions, 'default')
    );

    const deploymentPolicyOptions = Object.values(EDITOR.DEPLOYMENT_POLICY_OPTIONS).map((name) => ({
      name
    }));
    validateSelect(selectors.getDeploymentPolicySelect(), deploymentPolicyOptions, 'ALLOW_ONCE');

    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith('/service/extdirect', CLEANUP_EXT_REQUEST())
    );

    MAVEN_CLEANUP_RESPONSE.forEach((policy) => {
      expect(selectors.getTransferListOption(policy.name)).toBeInTheDocument();
    });

    expect(selectors.getContentValidationCheckbox()).toBeInTheDocument();
    expect(selectors.getGroupSectionTitle()).not.toBeInTheDocument();
  });

  it('renders the form and shows/hides auth fields when type is proxy', async () => {
    renderView();

    await waitForElementToBeRemoved(selectors.queryLoadingMask());

    await TestUtils.changeField(selectors.getFormatSelect, 'maven2');
    await TestUtils.changeField(selectors.getTypeSelect, 'proxy');

    expect(selectors.getRemoteUrlInput()).toBeInTheDocument();
    expect(selectors.getRoutingRuleSelect()).toBeInTheDocument();
    expect(selectors.getAuthTypeSelect()).toBeInTheDocument();

    expect(selectors.getGroupSectionTitle()).not.toBeInTheDocument();
    expect(selectors.getDeploymentPolicySelect()).not.toBeInTheDocument();

    expect(selectors.getUsernameInput()).not.toBeInTheDocument();
    expect(selectors.getPasswordInput()).not.toBeInTheDocument();
    expect(selectors.getNtlmHostInput()).not.toBeInTheDocument();
    expect(selectors.getNtlmDomainInput()).not.toBeInTheDocument();

    await TestUtils.changeField(selectors.getAuthTypeSelect, 'username');

    expect(selectors.getUsernameInput()).toBeInTheDocument();
    expect(selectors.getUsernameInput()).toBeInTheDocument();
    expect(selectors.getNtlmHostInput()).not.toBeInTheDocument();
    expect(selectors.getNtlmDomainInput()).not.toBeInTheDocument();

    await TestUtils.changeField(selectors.getAuthTypeSelect, 'ntlm');

    expect(selectors.getUsernameInput()).toBeInTheDocument();
    expect(selectors.getUsernameInput()).toBeInTheDocument();
    expect(selectors.getNtlmHostInput()).toBeInTheDocument();
    expect(selectors.getNtlmDomainInput()).toBeInTheDocument();
  });

  it('creates group repository', async () => {
    const format = 'maven2';
    const type = 'group';
    const url = repositoryUrl(format, type);
    const payload = {
      format,
      type,
      name: 'maven-group-1',
      online: false,
      storage: {
        blobStoreName: 'blob-store-1',
        strictContentTypeValidation: true
      },
      group: {
        memberNames: ['maven-releases', 'maven-snapshots']
      },
      maven: {
        contentDisposition: 'INLINE',
        layoutPolicy: 'STRICT',
        versionPolicy: 'RELEASE'
      }
    };

    renderView();

    await waitForElementToBeRemoved(selectors.queryLoadingMask());

    await TestUtils.changeField(selectors.getFormatSelect, format);
    await TestUtils.changeField(selectors.getTypeSelect, type);

    expect(selectors.getCreateButton()).toHaveClass('disabled');

    await TestUtils.changeField(selectors.getNameInput, payload.name);

    fireEvent.click(selectors.getStatusCheckbox());

    await TestUtils.changeField(selectors.getBlobStoreSelect, payload.storage.blobStoreName);

    fireEvent.click(selectors.getTransferListOption(payload.group.memberNames[0]));
    fireEvent.click(selectors.getTransferListOption(payload.group.memberNames[1]));

    expect(selectors.getCreateButton()).not.toHaveClass('disabled');

    fireEvent.click(selectors.getCreateButton());
    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(url, payload));
  });

  it('creates hosted repository', async () => {
    const format = 'maven2';
    const type = 'hosted';
    const url = repositoryUrl(format, type);
    const payload = {
      format,
      type,
      name: 'maven-hosted-1',
      online: true,
      storage: {
        blobStoreName: 'blob-store-1',
        strictContentTypeValidation: false,
        writePolicy: 'ALLOW'
      },
      component: {proprietaryComponents: true},
      cleanup: {policyNames: ['policy-all-fomats', 'policy-maven-1']},
      maven: {
        contentDisposition: 'INLINE',
        layoutPolicy: 'STRICT',
        versionPolicy: 'RELEASE'
      }
    };

    renderView();

    await waitForElementToBeRemoved(selectors.queryLoadingMask());

    await TestUtils.changeField(selectors.getFormatSelect, format);
    await TestUtils.changeField(selectors.getTypeSelect, type);
    await TestUtils.changeField(selectors.getNameInput, payload.name);
    await TestUtils.changeField(selectors.getDeploymentPolicySelect, payload.storage.writePolicy);
    await TestUtils.changeField(selectors.getBlobStoreSelect, payload.storage.blobStoreName);

    fireEvent.click(selectors.getContentValidationCheckbox());
    fireEvent.click(selectors.getProprietaryComponentsCheckbox());
    fireEvent.click(selectors.getTransferListOption(payload.cleanup.policyNames[0]));
    fireEvent.click(selectors.getTransferListOption(payload.cleanup.policyNames[1]));
    fireEvent.click(selectors.getCreateButton());

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(url, payload));
  });

  it('creates proxy repository', async () => {
    const format = 'p2';
    const type = 'proxy';
    const url = repositoryUrl(format, type);
    const payload = {
      format,
      type,
      name: 'p2-proxy-1',
      online: true,
      routingRule: 'routing-rule-1',
      storage: {
        blobStoreName: 'blob-store-1',
        strictContentTypeValidation: true
      },
      cleanup: null,
      proxy: {
        remoteUrl: 'https://repo123.net',
        contentMaxAge: '600',
        metadataMaxAge: '700'
      },
      negativeCache: {
        enabled: true,
        timeToLive: '800'
      },
      httpClient: {
        blocked: true,
        autoBlock: false,
        connection: null,
        authentication: null
      }
    };

    renderView();

    await waitForElementToBeRemoved(selectors.queryLoadingMask());

    await TestUtils.changeField(selectors.getFormatSelect, format);
    await TestUtils.changeField(selectors.getTypeSelect, type);
    await TestUtils.changeField(selectors.getNameInput, payload.name);
    await TestUtils.changeField(selectors.getBlobStoreSelect, payload.storage.blobStoreName);
    await TestUtils.changeField(selectors.getRoutingRuleSelect, payload.routingRule);
    await TestUtils.changeField(selectors.getRemoteUrlInput, payload.proxy.remoteUrl);
    await TestUtils.changeField(selectors.getContentMaxAgeInput, payload.proxy.contentMaxAge);
    await TestUtils.changeField(selectors.getMetadataMaxAgeInput, payload.proxy.metadataMaxAge);
    await TestUtils.changeField(selectors.getTimeToLiveInput, payload.negativeCache.timeToLive);

    fireEvent.click(selectors.getBlockedCheckbox());
    fireEvent.click(selectors.getAutoBlockCheckbox());

    fireEvent.click(selectors.getCreateButton());

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(url, payload));
  });

  it('creates proxy repository with http client settings', async () => {
    const format = 'maven2';
    const type = 'proxy';
    const url = repositoryUrl(format, type);
    const payload = {
      format,
      type,
      name: 'maven-proxy-1',
      online: true,
      routingRule: '',
      storage: {
        blobStoreName: 'default',
        strictContentTypeValidation: true
      },
      cleanup: null,
      proxy: {
        remoteUrl: 'https://repo123.net',
        contentMaxAge: -1,
        metadataMaxAge: 1440
      },
      negativeCache: {
        enabled: true,
        timeToLive: 1440
      },
      httpClient: {
        blocked: false,
        autoBlock: true,
        connection: {
          retries: '3',
          userAgentSuffix: 'user-agent-suffix-1',
          timeout: '100',
          enableCircularRedirects: true,
          enableCookies: true
        },
        authentication: {
          type: 'ntlm',
          username: 'user1',
          password: 'pass1',
          ntlmHost: 'ntlmhost1',
          ntlmDomain: 'ntlm.domain'
        }
      },
      maven: {
        contentDisposition: 'INLINE',
        layoutPolicy: 'STRICT',
        versionPolicy: 'RELEASE'
      }
    };

    renderView();

    await waitForElementToBeRemoved(selectors.queryLoadingMask());

    await TestUtils.changeField(selectors.getFormatSelect, format);
    await TestUtils.changeField(selectors.getTypeSelect, type);
    await TestUtils.changeField(selectors.getNameInput, payload.name);
    await TestUtils.changeField(selectors.getBlobStoreSelect, payload.storage.blobStoreName);
    await TestUtils.changeField(selectors.getRemoteUrlInput, payload.proxy.remoteUrl);

    await TestUtils.changeField(
      selectors.getAuthTypeSelect,
      payload.httpClient.authentication.type
    );
    await TestUtils.changeField(
      selectors.getUsernameInput,
      payload.httpClient.authentication.username
    );
    await TestUtils.changeField(
      selectors.getPasswordInput,
      payload.httpClient.authentication.password
    );
    await TestUtils.changeField(
      selectors.getNtlmHostInput,
      payload.httpClient.authentication.ntlmHost
    );
    await TestUtils.changeField(
      selectors.getNtlmDomainInput,
      payload.httpClient.authentication.ntlmDomain
    );
    await TestUtils.changeField(
      selectors.getUserAgentSuffixInput,
      payload.httpClient.connection.userAgentSuffix
    );
    await TestUtils.changeField(selectors.getRetriesInput, payload.httpClient.connection.retries);
    await TestUtils.changeField(selectors.getTimeoutInput, payload.httpClient.connection.timeout);

    fireEvent.click(selectors.getRedirectsCheckbox());
    fireEvent.click(selectors.getCookiesCheckbox());

    fireEvent.click(selectors.getCreateButton());

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(url, payload));
  });

  it('creates bower proxy repository', async () => {
    const format = 'bower';
    const type = 'proxy';
    const url = repositoryUrl(format, type);
    const name = 'bower-proxy-1';
    const payload = {
      ...genericDefaultValues.proxy,
      name,
      format,
      bower: {
        rewritePackageUrls: false
      }
    };
    payload.proxy.remoteUrl = 'https://repo123.net';
    payload.storage.blobStoreName = 'default';

    renderView();

    await waitForElementToBeRemoved(selectors.queryLoadingMask());

    await TestUtils.changeField(selectors.getFormatSelect, format);
    await TestUtils.changeField(selectors.getTypeSelect, type);
    await TestUtils.changeField(selectors.getNameInput, payload.name);
    await TestUtils.changeField(selectors.getBlobStoreSelect, payload.storage.blobStoreName);
    await TestUtils.changeField(selectors.getRemoteUrlInput, payload.proxy.remoteUrl);

    fireEvent.click(selectors.getRewritePackageUrlsCheckbox());

    fireEvent.click(selectors.getCreateButton());

    await waitFor(() => expect(axios.post).toHaveBeenCalledWith(url, payload));
  });

  it('filters types by format', async () => {
    when(axios.get)
      .calledWith(expect.stringContaining(repositoriesUrl('p2')))
      .mockResolvedValue({data: []});

    when(axios.get)
      .calledWith(expect.stringContaining(repositoriesUrl('nuget')))
      .mockResolvedValue({data: []});

    renderView();

    await waitForElementToBeRemoved(selectors.queryLoadingMask());

    await TestUtils.changeField(selectors.getFormatSelect, 'maven2');
    await TestUtils.changeField(selectors.getTypeSelect, 'group');
    expect(selectors.getGroupSectionTitle()).toBeInTheDocument();

    await TestUtils.changeField(selectors.getFormatSelect, 'nuget');
    expect(selectors.getTypeSelect()).toHaveValue('group');
    expect(selectors.getContentValidationCheckbox()).not.toBeInTheDocument();

    await TestUtils.changeField(selectors.getFormatSelect, 'p2');
    expect(selectors.getTypeSelect()).toHaveValue('');
    expect(selectors.getTypeSelect()).not.toContainElement(screen.queryByText('hosted'));
    expect(selectors.getTypeSelect()).not.toContainElement(screen.queryByText('group'));
  });

  it('calls onDone when cancelled', async () => {
    renderView();

    await waitForElementToBeRemoved(selectors.queryLoadingMask());
    await TestUtils.changeField(selectors.getFormatSelect, 'maven2');
    await TestUtils.changeField(selectors.getTypeSelect, 'group');

    fireEvent.click(selectors.getCancelButton());
    await waitFor(() => expect(onDone).toHaveBeenCalled());
  });

  it('edits raw hosted repositories', async function () {
    const repo = {
      name: 'raw-hosted',
      format: 'raw',
      url: 'http://localhost:8081/repository/raw-hosted',
      online: true,
      storage: {
        blobStoreName: 'default',
        strictContentTypeValidation: true,
        writePolicy: 'ALLOW_ONCE'
      },
      cleanup: {
        policyNames: []
      },
      component: {
        proprietaryComponents: false
      },
      type: 'hosted'
    };
    when(axios.get)
      .calledWith('/service/rest/internal/ui/repositories/repository/raw-hosted')
      .mockResolvedValueOnce({
        data: repo
      });

    renderView('raw-hosted');

    await waitForElementToBeRemoved(selectors.queryLoadingMask());

    validateSelect(selectors.getNameInput(), null, repo.name);
    validateSelect(selectors.getFormatSelect(), null, repo.format);
    validateSelect(selectors.getTypeSelect(), null, repo.type);
    expect(selectors.getReadOnlyUrl().nextSibling).toHaveTextContent(repo.url);
    expect(selectors.getContentValidationCheckbox()).toBeChecked();

    fireEvent.click(selectors.getContentValidationCheckbox());

    expect(selectors.getContentValidationCheckbox()).not.toBeChecked();

    fireEvent.click(selectors.getSaveButton());

    expect(axios.put).toBeCalledWith(
      '/service/rest/v1/repositories/raw/hosted/raw-hosted',
      mergeDeepRight(repo, {
        storage: {
          strictContentTypeValidation: false
        }
      })
    );
  });

  it('edits raw proxy repositories', async function () {
    const repo = {
      name: 'raw-proxy',
      format: 'raw',
      url: 'http://localhost:8081/repository/raw-proxy',
      online: true,
      storage: {
        blobStoreName: 'default',
        strictContentTypeValidation: true
      },
      cleanup: {
        policyNames: []
      },
      proxy: {
        remoteUrl: 'http://example.com',
        contentMaxAge: 1440,
        metadataMaxAge: 1440
      },
      negativeCache: {
        enabled: true,
        timeToLive: 1440
      },
      httpClient: {
        blocked: false,
        autoBlock: true,
        connection: {
          retries: 0,
          userAgentSuffix: '',
          timeout: 60,
          enableCircularRedirects: false,
          enableCookies: false,
          useTrustStore: false
        },
        authentication: null
      },
      routingRuleName: null,
      type: 'proxy'
    };
    when(axios.get)
      .calledWith('/service/rest/internal/ui/repositories/repository/raw-proxy')
      .mockResolvedValueOnce({
        data: repo
      });

    renderView('raw-proxy');

    await waitForElementToBeRemoved(selectors.queryLoadingMask());

    await TestUtils.changeField(selectors.getRemoteUrlInput, 'http://other.com');

    fireEvent.click(selectors.getSaveButton());

    expect(axios.put).toBeCalledWith(
      '/service/rest/v1/repositories/raw/proxy/raw-proxy',
      mergeDeepRight(repo, {
        proxy: {
          remoteUrl: 'http://other.com'
        },
        routingRule: null
      })
    );
  });

  it('edits raw group repositories', async function () {
    const repo = {
      name: 'raw-group',
      format: 'raw',
      url: 'http://localhost:8081/repository/raw-group',
      online: true,
      storage: {
        blobStoreName: 'default',
        strictContentTypeValidation: true
      },
      group: {
        memberNames: ['raw-hosted', 'raw-proxy']
      },

      type: 'group'
    };
    when(axios.get)
      .calledWith('/service/rest/internal/ui/repositories/repository/raw-group')
      .mockResolvedValueOnce({
        data: repo
      });
    when(axios.get)
      .calledWith('/service/rest/internal/ui/repositories?format=raw')
      .mockResolvedValueOnce({
        data: [
          {
            id: 'raw-group',
            name: 'raw-group'
          },
          {
            id: 'raw-hosted',
            name: 'raw-hosted'
          },
          {
            id: 'raw-proxy',
            name: 'raw-proxy'
          }
        ]
      });

    renderView('raw-group');

    await waitForElementToBeRemoved(selectors.queryLoadingMask());

    fireEvent.click(screen.getByLabelText('raw-hosted'));

    fireEvent.click(selectors.getSaveButton());

    expect(axios.put).toBeCalledWith(
      '/service/rest/v1/repositories/raw/group/raw-group',
      mergeDeepRight(repo, {
        group: {
          memberNames: ['raw-proxy']
        },
        routingRule: undefined
      })
    );
  });

  it('renders yum hosted fields with correct default values', async () => {
    renderView();
    await waitForElementToBeRemoved(selectors.queryLoadingMask());
    await TestUtils.changeField(selectors.getFormatSelect, 'yum');
    await TestUtils.changeField(selectors.getTypeSelect, 'hosted');

    validateSelect(selectors.getRepodataDepthSelect(), null, 0);
    validateSelect(selectors.getLayoutPolicySelect(), null, 'STRICT');
  });

  it('renders raw fields with correct default values', async () => {
    renderView();
    await waitForElementToBeRemoved(selectors.queryLoadingMask());
    await TestUtils.changeField(selectors.getFormatSelect, 'raw');

    await TestUtils.changeField(selectors.getTypeSelect, 'proxy');
    validateSelect(selectors.getContentDispositionSelect(), null, 'ATTACHMENT');

    await TestUtils.changeField(selectors.getTypeSelect, 'hosted');
    validateSelect(selectors.getContentDispositionSelect(), null, 'ATTACHMENT');

    await TestUtils.changeField(selectors.getTypeSelect, 'group');
    validateSelect(selectors.getContentDispositionSelect(), null, 'ATTACHMENT');
  });

  it('renders npm proxy fields with correct default values', async () => {
    renderView();
    await waitForElementToBeRemoved(selectors.queryLoadingMask());
    await TestUtils.changeField(selectors.getFormatSelect, 'npm');
    await TestUtils.changeField(selectors.getTypeSelect, 'proxy');

    expect(selectors.getRemoveNonCataloguedCheckbox()).not.toBeChecked();
    expect(selectors.getRemoveQuarantinedCheckbox()).not.toBeChecked();
  });

  it('renders maven proxy fields with correct default values', async () => {
    renderView();
    await waitForElementToBeRemoved(selectors.queryLoadingMask());
    await TestUtils.changeField(selectors.getFormatSelect, 'maven2');
    await TestUtils.changeField(selectors.getTypeSelect, 'proxy');

    validateSelect(selectors.getContentDispositionSelect(), null, 'INLINE');
    validateSelect(selectors.getLayoutPolicySelect(), null, 'STRICT');
    validateSelect(selectors.getVersionPolicySelect(), null, 'RELEASE');
  });
});

const validateSelect = (selectElement, options, value) => {
  expect(selectElement).toBeInTheDocument();
  if (options) {
    options.forEach((option) => {
      expect(getByRole(selectElement, 'option', option)).toBeInTheDocument();
    });
    expect(getAllByRole(selectElement, 'option')).toHaveLength(options.length);
  }
  value && expect(selectElement).toHaveValue(value);
};
