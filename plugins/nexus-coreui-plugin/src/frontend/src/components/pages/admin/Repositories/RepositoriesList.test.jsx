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
import axios from 'axios';
import {
  fireEvent,
  waitForElementToBeRemoved,
  waitFor,
  getByText,
  screen
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/extend-expect';
import {ExtJS, TestUtils, ExtAPIUtils, APIConstants} from '@sonatype/nexus-ui-plugin';
import {when} from 'jest-when';

import RepositoriesList from './RepositoriesList';
import UIStrings from '../../../../constants/UIStrings';

jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn()
}));

jest.mock('@sonatype/nexus-ui-plugin', () => {
  return {
    ...jest.requireActual('@sonatype/nexus-ui-plugin'),
    ExtJS: {
      checkPermission: jest.fn().mockReturnValue(true)
    }
  };
});

const mockCopyUrl = jest.fn((event) => event.stopPropagation());

const {
  REPOSITORIES: {
    LIST: {
      HEALTH_CHECK: {ANALYZE_BUTTON, NOT_AVAILABLE_TOOLTIP, LOADING, ANALYZING, LOADING_ERROR},
      COLUMNS
    }
  },
  SETTINGS: {CANCEL_BUTTON_LABEL}
} = UIStrings;

const selectors = {
  healthCheck: {
    cell: (rowIndex) => screen.getAllByRole('row')[rowIndex].cells[5],
    get analyzeBtn() {
      return (rowIndex) => getByText(this.cell(rowIndex), ANALYZE_BUTTON);
    },
    modalMainBtn: () => screen.getByText(ANALYZE_BUTTON, {selector: 'button'}),
    modalOptionsBtn: () => screen.getByLabelText('more options', {selector: 'button'}),
    modalCancelBtn: () => screen.queryByText(CANCEL_BUTTON_LABEL, {selector: 'button'}),
    columnHeader: () => screen.queryByRole('columnheader', {name: COLUMNS.HEALTH_CHECK})
  }
};

describe('RepositoriesList', function () {
  const rows = [
    {
      name: 'maven-central',
      type: 'proxy',
      format: 'maven2',
      status: {online: true, description: 'Ready to Connect'},
      url: 'http://localhost:8081/repository/maven-central/'
    },
    {
      name: 'maven-public',
      type: 'group',
      format: 'maven2',
      status: {online: true},
      url: 'http://localhost:8081/repository/maven-public/'
    },
    {
      name: 'maven-releases',
      type: 'hosted',
      format: 'maven2',
      status: {online: true},
      url: 'http://localhost:8081/repository/maven-releases/'
    },
    {
      name: 'maven-snapshots',
      type: 'hosted',
      format: 'maven2',
      status: {online: false},
      url: 'http://localhost:8081/repository/maven-snapshots/'
    },
    {
      name: 'nuget-group',
      type: 'group',
      format: 'nuget',
      status: {online: true},
      url: 'http://localhost:8081/repository/nuget-group/'
    },
    {
      name: 'nuget-hosted',
      type: 'hosted',
      format: 'nuget',
      status: {online: true},
      url: 'http://localhost:8081/repository/nuget-hosted/'
    },
    {
      name: 'nuget.org-proxy',
      type: 'proxy',
      format: 'nuget',
      status: {
        online: true,
        description: 'Remote Auto Blocked and Unavailable',
        reason:
          'java.net.UnknownHostException: api.example.org: nodename nor servname provided, or not known'
      },
      url: 'http://localhost:8081/repository/nuget.org-proxy/'
    }
  ];

  function render() {
    return TestUtils.render(
      <RepositoriesList copyUrl={mockCopyUrl} />,
      ({container, getByText, getByPlaceholderText}) => ({
        tableHeader: (text) => getByText(text, {selector: 'thead *'}),
        filter: () => getByPlaceholderText('Filter by name'),
        tableRow: (index) => container.querySelectorAll('tbody tr')[index],
        tableRows: () => container.querySelectorAll('tbody tr'),
        urlButton: (index) =>
          container.querySelectorAll('button[title="Copy URL to Clipboard"]')[index],
        createButton: () => getByText(UIStrings.REPOSITORIES.LIST.CREATE_BUTTON)
      })
    );
  }

  it('renders the loading spinner', async function () {
    axios.get.mockReturnValue(new Promise(() => {}));

    const {loadingMask} = render();

    expect(loadingMask()).toBeInTheDocument();
  });

  it('renders the resolved empty text', async function () {
    axios.get.mockResolvedValue({data: []});

    const {loadingMask, getByText} = render();

    await waitForElementToBeRemoved(loadingMask);

    expect(getByText('There are no repositories available')).toBeInTheDocument();
  });

  it('renders the rows', async function () {
    axios.get.mockResolvedValue({data: rows});

    const {loadingMask, tableRow} = render();

    await waitForElementToBeRemoved(loadingMask);

    expect(tableRow(0).cells[0]).toHaveTextContent('maven-central');
    expect(tableRow(0).cells[1]).toHaveTextContent('proxy');
    expect(tableRow(0).cells[2]).toHaveTextContent('maven2');
    expect(tableRow(0).cells[3]).toHaveTextContent(/^Online - Ready to Connect$/);
    expect(tableRow(0).cells[4].querySelector('button')).toBeVisible();

    expect(tableRow(1).cells[0]).toHaveTextContent('maven-public');
    expect(tableRow(1).cells[1]).toHaveTextContent('group');
    expect(tableRow(1).cells[2]).toHaveTextContent('maven2');
    expect(tableRow(1).cells[3]).toHaveTextContent(/^Online$/);
    expect(tableRow(1).cells[4].querySelector('button')).toBeVisible();

    expect(tableRow(2).cells[0]).toHaveTextContent('maven-releases');
    expect(tableRow(2).cells[1]).toHaveTextContent('hosted');
    expect(tableRow(2).cells[2]).toHaveTextContent('maven2');
    expect(tableRow(2).cells[3]).toHaveTextContent(/^Online$/);
    expect(tableRow(2).cells[4].querySelector('button')).toBeVisible();

    expect(tableRow(3).cells[0]).toHaveTextContent('maven-snapshots');
    expect(tableRow(3).cells[1]).toHaveTextContent('hosted');
    expect(tableRow(3).cells[2]).toHaveTextContent('maven2');
    expect(tableRow(3).cells[3]).toHaveTextContent(/^Offline$/);
    expect(tableRow(3).cells[4].querySelector('button')).toBeVisible();

    expect(tableRow(4).cells[0]).toHaveTextContent('nuget-group');
    expect(tableRow(4).cells[1]).toHaveTextContent('group');
    expect(tableRow(4).cells[2]).toHaveTextContent('nuget');
    expect(tableRow(4).cells[3]).toHaveTextContent(/^Online$/);
    expect(tableRow(4).cells[4].querySelector('button')).toBeVisible();

    expect(tableRow(5).cells[0]).toHaveTextContent('nuget-hosted');
    expect(tableRow(5).cells[1]).toHaveTextContent('hosted');
    expect(tableRow(5).cells[2]).toHaveTextContent('nuget');
    expect(tableRow(5).cells[3]).toHaveTextContent(/^Online$/);
    expect(tableRow(5).cells[4].querySelector('button')).toBeVisible();

    expect(tableRow(6).cells[0]).toHaveTextContent('nuget.org-proxy');
    expect(tableRow(6).cells[1]).toHaveTextContent('proxy');
    expect(tableRow(6).cells[2]).toHaveTextContent('nuget');
    expect(tableRow(6).cells[3]).toHaveTextContent(
      /^Online - Remote Auto Blocked and Unavailable.*java.net.UnknownHostException: api.example.org: nodename nor servname provided, or not known$/
    );
    expect(tableRow(6).cells[4].querySelector('button')).toBeVisible();
  });

  it('sorts the rows by name', async function () {
    axios.get.mockResolvedValue({data: rows});

    const {loadingMask, tableHeader, tableRow} = render();

    await waitForElementToBeRemoved(loadingMask);

    expect(tableRow(0).cells[0]).toHaveTextContent('maven-central');
    expect(tableRow(1).cells[0]).toHaveTextContent('maven-public');
    expect(tableRow(2).cells[0]).toHaveTextContent('maven-releases');
    expect(tableRow(3).cells[0]).toHaveTextContent('maven-snapshots');
    expect(tableRow(4).cells[0]).toHaveTextContent('nuget-group');
    expect(tableRow(5).cells[0]).toHaveTextContent('nuget-hosted');
    expect(tableRow(6).cells[0]).toHaveTextContent('nuget.org-proxy');

    fireEvent.click(tableHeader('Name'));

    expect(tableRow(0).cells[0]).toHaveTextContent('nuget.org-proxy');
    expect(tableRow(1).cells[0]).toHaveTextContent('nuget-hosted');
    expect(tableRow(2).cells[0]).toHaveTextContent('nuget-group');
    expect(tableRow(3).cells[0]).toHaveTextContent('maven-snapshots');
    expect(tableRow(4).cells[0]).toHaveTextContent('maven-releases');
    expect(tableRow(5).cells[0]).toHaveTextContent('maven-public');
    expect(tableRow(6).cells[0]).toHaveTextContent('maven-central');
  });

  it('sorts the rows by type', async function () {
    axios.get.mockResolvedValue({data: rows});

    const {loadingMask, tableHeader, tableRow} = render();

    await waitForElementToBeRemoved(loadingMask);

    fireEvent.click(tableHeader('Type'));

    expect(tableRow(0).cells[1]).toHaveTextContent('group');
    expect(tableRow(1).cells[1]).toHaveTextContent('group');
    expect(tableRow(2).cells[1]).toHaveTextContent('hosted');
    expect(tableRow(3).cells[1]).toHaveTextContent('hosted');
    expect(tableRow(4).cells[1]).toHaveTextContent('hosted');
    expect(tableRow(5).cells[1]).toHaveTextContent('proxy');
    expect(tableRow(6).cells[1]).toHaveTextContent('proxy');

    fireEvent.click(tableHeader('Type'));

    expect(tableRow(0).cells[1]).toHaveTextContent('proxy');
    expect(tableRow(1).cells[1]).toHaveTextContent('proxy');
    expect(tableRow(2).cells[1]).toHaveTextContent('hosted');
    expect(tableRow(3).cells[1]).toHaveTextContent('hosted');
    expect(tableRow(4).cells[1]).toHaveTextContent('hosted');
    expect(tableRow(5).cells[1]).toHaveTextContent('group');
    expect(tableRow(6).cells[1]).toHaveTextContent('group');
  });

  it('sorts the rows by format', async function () {
    axios.get.mockResolvedValue({data: rows});

    const {loadingMask, tableHeader, tableRow} = render();

    await waitForElementToBeRemoved(loadingMask);

    fireEvent.click(tableHeader('Format'));

    expect(tableRow(0).cells[2]).toHaveTextContent('maven2');
    expect(tableRow(1).cells[2]).toHaveTextContent('maven2');
    expect(tableRow(2).cells[2]).toHaveTextContent('maven2');
    expect(tableRow(3).cells[2]).toHaveTextContent('maven2');
    expect(tableRow(4).cells[2]).toHaveTextContent('nuget');
    expect(tableRow(5).cells[2]).toHaveTextContent('nuget');
    expect(tableRow(6).cells[2]).toHaveTextContent('nuget');

    fireEvent.click(tableHeader('Format'));

    expect(tableRow(0).cells[2]).toHaveTextContent('nuget');
    expect(tableRow(1).cells[2]).toHaveTextContent('nuget');
    expect(tableRow(2).cells[2]).toHaveTextContent('nuget');
    expect(tableRow(3).cells[2]).toHaveTextContent('maven2');
    expect(tableRow(4).cells[2]).toHaveTextContent('maven2');
    expect(tableRow(5).cells[2]).toHaveTextContent('maven2');
    expect(tableRow(6).cells[2]).toHaveTextContent('maven2');
  });

  it('filters by name', async function () {
    axios.get.mockResolvedValue({data: rows});

    const {filter, loadingMask, tableRow, tableRows} = render();

    await waitForElementToBeRemoved(loadingMask);

    await TestUtils.changeField(filter, 'org');

    expect(tableRows().length).toBe(1);
    expect(tableRow(0).cells[0]).toHaveTextContent('nuget.org-proxy');
  });

  it('copies url on button press', async function () {
    axios.get.mockResolvedValue({data: rows});

    const {loadingMask, urlButton} = render();

    await waitForElementToBeRemoved(loadingMask);

    fireEvent.click(urlButton(0));

    expect(mockCopyUrl).toBeCalled();
  });

  it('disables the create button when not enough permissions', async function () {
    axios.get.mockResolvedValue({data: []});
    ExtJS.checkPermission.mockReturnValue(false);
    const {createButton, loadingMask} = render();
    await waitForElementToBeRemoved(loadingMask);

    expect(createButton()).toHaveClass('disabled');
  });

  describe('Health Check Column', () => {
    const rowIndices = {
      MAVEN_CENTRAL: 1, // helth-check available
      MAVEN_PUBLIC: 2,
      NUGET_HOSTED: 6,
      NUGET_ORG_PROXY: 7 // helth-check available
    };

    const {
      EXT: {
        URL: EXT_URL,
        HEALTH_CHECK: {
          ACTION,
          METHODS: {READ, UPDATE, ENABLE_ALL}
        }
      },
      REST: {
        INTERNAL: {REPOSITORIES_DETAILS}
      }
    } = APIConstants;

    const READ_HEALTH_CHECK_REQUEST = ExtAPIUtils.createRequestBody(ACTION, READ);

    const READ_HEALTH_CHECK_DATA = [
      {
        repositoryName: 'maven-central',
        enabled: false,
        analyzing: false
      },
      {
        repositoryName: 'nuget.org-proxy',
        enabled: false,
        analyzing: false
      }
    ];

    const READ_HEALTH_CHECK_RESPONSE = {data: TestUtils.makeExtResult(READ_HEALTH_CHECK_DATA)};

    const ENABLE_HEALTH_CHECK_ALL_REQUEST = ExtAPIUtils.createRequestBody(ACTION, ENABLE_ALL, [
      true
    ]);

    const ENABLE_HEALTH_CHECK_ALL_RESPONSE = {
      data: TestUtils.makeExtResult()
    };

    beforeEach(() => {
      when(axios.post)
        .calledWith(EXT_URL, READ_HEALTH_CHECK_REQUEST)
        .mockResolvedValue(READ_HEALTH_CHECK_RESPONSE);
      when(axios.get).calledWith(REPOSITORIES_DETAILS).mockResolvedValue({data: rows});
      ExtJS.checkPermission.mockReturnValue(true);
    });

    it('does not display health-check column if user has no read permissions', async () => {
      ExtJS.checkPermission.mockReturnValue(false);

      const {loadingMask} = render();

      await waitForElementToBeRemoved(loadingMask);

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(EXT_URL, READ_HEALTH_CHECK_REQUEST)
      );

      expect(selectors.healthCheck.columnHeader()).not.toBeInTheDocument();
    });

    it('displays correct cell content when repository supports and does not support health-check', async () => {
      const {loadingMask} = render();

      await waitForElementToBeRemoved(loadingMask);

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(EXT_URL, READ_HEALTH_CHECK_REQUEST)
      );

      expect(selectors.healthCheck.cell(rowIndices.MAVEN_CENTRAL)).toHaveTextContent(
        ANALYZE_BUTTON
      );
      expect(selectors.healthCheck.cell(rowIndices.MAVEN_PUBLIC)).toHaveTextContent(
        NOT_AVAILABLE_TOOLTIP
      );
      expect(selectors.healthCheck.cell(rowIndices.NUGET_HOSTED)).toHaveTextContent(
        NOT_AVAILABLE_TOOLTIP
      );
      expect(selectors.healthCheck.cell(rowIndices.MAVEN_CENTRAL)).toHaveTextContent(
        ANALYZE_BUTTON
      );
    });

    it('enables health check for a single repository', async () => {
      const enableRequest = ExtAPIUtils.createRequestBody(ACTION, UPDATE, [
        true,
        'maven-central',
        true
      ]);

      const enableData = {
        repositoryName: 'maven-central',
        enabled: true,
        analyzing: true
      };

      const enableResponse = {data: TestUtils.makeExtResult(enableData)};

      when(axios.post).calledWith(EXT_URL, enableRequest).mockResolvedValue(enableResponse);

      const readResponseData = [
        {
          repositoryName: 'maven-central',
          enabled: true,
          analyzing: true
        },
        {
          repositoryName: 'nuget.org-proxy',
          enabled: false
        }
      ];
      const readResponse = {
        data: TestUtils.makeExtResult(readResponseData)
      };

      const {loadingMask} = render();

      await waitForElementToBeRemoved(loadingMask);

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(EXT_URL, READ_HEALTH_CHECK_REQUEST)
      );

      const analyzeBtn = selectors.healthCheck.analyzeBtn(rowIndices.MAVEN_CENTRAL);
      userEvent.click(analyzeBtn);

      const cell1 = selectors.healthCheck.cell(rowIndices.MAVEN_CENTRAL);
      const cell2 = selectors.healthCheck.cell(rowIndices.NUGET_ORG_PROXY);

      when(axios.post)
        .calledWith(EXT_URL, READ_HEALTH_CHECK_REQUEST)
        .mockResolvedValueOnce(readResponse);

      userEvent.click(selectors.healthCheck.modalMainBtn());

      expect(cell1).toHaveTextContent(LOADING);

      await waitFor(() => expect(cell1).toHaveTextContent(ANALYZING));
      await waitFor(() => expect(cell2).toHaveTextContent(ANALYZE_BUTTON));
    });

    it('enables health check for all repositories', async () => {
      const readData = [
        {
          repositoryName: 'maven-central',
          enabled: true,
          analyzing: true
        },
        {
          repositoryName: 'nuget.org-proxy',
          enabled: true,
          analyzing: true
        }
      ];

      const readResponse = {
        data: TestUtils.makeExtResult(readData)
      };

      const {loadingMask, container} = render();

      await waitForElementToBeRemoved(loadingMask);

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(EXT_URL, READ_HEALTH_CHECK_REQUEST)
      );

      const analyzeBtn = selectors.healthCheck.analyzeBtn(rowIndices.MAVEN_CENTRAL);
      userEvent.click(analyzeBtn);

      const cell1 = selectors.healthCheck.cell(rowIndices.MAVEN_CENTRAL);
      const cell2 = selectors.healthCheck.cell(rowIndices.NUGET_ORG_PROXY);

      when(axios.post)
        .calledWith(EXT_URL, ENABLE_HEALTH_CHECK_ALL_REQUEST)
        .mockResolvedValue(ENABLE_HEALTH_CHECK_ALL_RESPONSE);

      when(axios.post)
        .calledWith(EXT_URL, READ_HEALTH_CHECK_REQUEST)
        .mockResolvedValueOnce(readResponse);

      userEvent.click(selectors.healthCheck.modalOptionsBtn());

      const modalAnalyzeAllBtn = container.querySelectorAll('.nx-dropdown-button')[1];

      userEvent.click(modalAnalyzeAllBtn);

      userEvent.click(selectors.healthCheck.modalMainBtn());

      expect(cell1).toHaveTextContent(LOADING);
      expect(cell2).toHaveTextContent(LOADING);

      await waitFor(() => expect(cell1).toHaveTextContent(ANALYZING));
      await waitFor(() => expect(cell2).toHaveTextContent(ANALYZING));
    });

    it('renders health check counters', async () => {
      const readData = [
        {
          repositoryName: 'maven-central',
          enabled: true,
          analyzing: false,
          securityIssueCount: 33,
          licenseIssueCount: 22
        },
        {
          repositoryName: 'nuget.org-proxy',
          enabled: false
        }
      ];

      const readResponse = {
        data: TestUtils.makeExtResult(readData)
      };

      when(axios.post)
        .calledWith(EXT_URL, READ_HEALTH_CHECK_REQUEST)
        .mockResolvedValueOnce(readResponse);

      const {loadingMask} = render();

      await waitForElementToBeRemoved(loadingMask);

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(EXT_URL, READ_HEALTH_CHECK_REQUEST)
      );

      const cell = selectors.healthCheck.cell(rowIndices.MAVEN_CENTRAL);

      const {securityIssueCount, licenseIssueCount} = readData[0];

      await waitFor(() =>
        expect(cell).toHaveTextContent('' + securityIssueCount + licenseIssueCount)
      );
    });

    it('closes modal and does not enable health-check on cancel', async () => {
      const {loadingMask} = render();

      await waitForElementToBeRemoved(loadingMask);

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(EXT_URL, READ_HEALTH_CHECK_REQUEST)
      );

      const cell = selectors.healthCheck.cell(rowIndices.MAVEN_CENTRAL);

      const analyzeBtn = selectors.healthCheck.analyzeBtn(rowIndices.MAVEN_CENTRAL);
      userEvent.click(analyzeBtn);

      userEvent.click(selectors.healthCheck.modalCancelBtn());

      expect(selectors.healthCheck.modalCancelBtn()).not.toBeInTheDocument();

      await waitFor(() => expect(cell).toHaveTextContent(ANALYZE_BUTTON));
    });

    it('displays an error message on API call error', async () => {
      when(axios.post)
        .calledWith(EXT_URL, READ_HEALTH_CHECK_REQUEST)
        .mockResolvedValueOnce('error');

      const {loadingMask} = render();

      await waitForElementToBeRemoved(loadingMask);

      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(EXT_URL, READ_HEALTH_CHECK_REQUEST)
      );

      const cell = selectors.healthCheck.cell(rowIndices.MAVEN_CENTRAL);

      await waitFor(() => expect(cell).toHaveTextContent(LOADING_ERROR));
    });
  });
});
