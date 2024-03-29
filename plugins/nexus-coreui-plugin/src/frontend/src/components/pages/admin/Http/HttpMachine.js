/*
 * Sonatype Nexus (TM) Open Source Version
 * Copyright (c) 2008-present Sonatype, Inc.
 * All rights reserved. Includes the third-party code listed at http://links.sonatype.com/products/nexus/oss/attributions.
 *
 * This program and the accompanying materials are made available under the terms of the Eclipse Public License Version 1.0,
 * which accompanies this distribution and is available at http://www.eclipse.org/legal/epl-v10.html.
 *
 * Sonatype Nexus (TM) Open Source Version is distributed with Sencha Ext JS pursuant to a FLOSS Exception agreed upon
 * between Sonatype, Inc. and Sencha Inc. Sencha Ext JS is licensed under GPL v3 and cannot be redistributed as part of a
 * closed source work.
 *
 * Sonatype Nexus (TM) Professional Version is available from Sonatype, Inc. "Sonatype" and "Sonatype Nexus" are trademarks
 * of Sonatype, Inc. Apache Maven is a trademark of the Apache Software Foundation. M2eclipse is a trademark of the
 * Eclipse Foundation. All other trademarks are the property of their respective owners.
 */
import {assign} from 'xstate';
import {
  FormUtils,
  ExtAPIUtils,
  APIConstants,
  ValidationUtils,
} from '@sonatype/nexus-ui-plugin';
import {omit, isNil, whereEq} from 'ramda';

const {
  EXT: {
    HTTP: {ACTION, METHODS},
  },
} = APIConstants;

const validateAuthentication = (data, prefix) => {
  let newData = {...data};
  const _ = (name) => `${prefix}${name}`;

  if (!data[_('Enabled')]) {
    newData = omit([_('Host'), _('Port')], newData);
  }

  if (!data[_('AuthEnabled')]) {
    newData = omit(
      [
        _('AuthNtlmDomain'),
        _('AuthNtlmHost'),
        _('AuthPassword'),
        _('AuthUsername'),
      ],
      newData
    );
  }

  if (
    data[_('AuthEnabled')] &&
    ValidationUtils.isBlank(newData[_('AuthPassword')])
  ) {
    newData[_('AuthPassword')] = '';
  }

  return newData;
};

const validatePristine = (data, prefix, name, value) => {
  const _ = (name) => `${prefix}${name}`;
  const omitProxy = name === _('Enabled') && value === false;
  let omitValues = [];

  if (omitProxy) {
    omitValues = [_('Host'), _('Port'), _('AuthEnabled')];
  }

  const omitAuth =
    name === _('AuthEnabled') && data[_('AuthEnabled')] === false;

  if (omitAuth || omitProxy) {
    omitValues = [
      ...omitValues,
      _('AuthNtlmDomain'),
      _('AuthNtlmHost'),
      _('AuthPassword'),
      _('AuthUsername'),
    ];
  }

  return omit(omitValues, data);
};

const validateAuthenticationFields = (data, prefix) => {
  const proxyErrors = {};
  const _ = (name) => `${prefix}${name}`;

  if (data[_('Enabled')]) {
    proxyErrors[_('Host')] = ValidationUtils.validateNotBlank(data[_('Host')]);

    proxyErrors[_('Port')] =
      ValidationUtils.validateNotBlank(data[_('Port')]) ||
      ValidationUtils.isInRange({
        value: data[_('Port')],
        min: 1,
        max: 65535,
      });

    if (data[_('AuthEnabled')]) {
      proxyErrors[_('AuthUsername')] = ValidationUtils.validateNotBlank(
        data[_('AuthUsername')]
      );
    }
  }
  return proxyErrors;
};

const removeEmptyValues = (obj) => {
  const keys = Object.keys(obj).filter((key) => isNil(obj[key]) && key);

  return omit(keys, obj);
};

const update = assign((_, event) => {
  const data = event.data?.data?.result?.data || {};
  const result = {
    ...data,
    httpEnabled: data.httpEnabled || false,
    httpsEnabled: data.httpsEnabled || false,
    httpAuthEnabled: data.httpAuthEnabled || false,
    httpsAuthEnabled: data.httpsAuthEnabled || false,
    nonProxyHosts: data.nonProxyHosts || [],
  };

  return {
    data: result,
    pristineData: result,
  };
});

export default FormUtils.buildFormMachine({
  id: 'HttpMachine',
  config: (config) => ({
    ...config,

    states: {
      ...config.states,

      loaded: {
        ...config.states.loaded,
        on: {
          ...config.states.loaded.on,

          ADD_NON_PROXY_HOST: {
            target: 'loaded',
            actions: 'addNonProxyHost',
          },

          REMOVE_NON_PROXY_HOST: {
            target: 'loaded',
            actions: 'removeNonProxyHost',
          },

          TOGGLE_AUTHENTICATION: {
            target: 'loaded',
            actions: 'toggleAuthentication',
          },

          TOGGLE_HTTP_PROXY: {
            target: 'loaded',
            actions: 'toggleHttpProxy',
          },

          TOGGLE_HTTPS_PROXY: {
            target: 'loaded',
            actions: 'toggleHttpsProxy',
          },
        },
      },
    },
  }),
}).withConfig({
  actions: {
    validate: assign({
      validationErrors: ({data}) => {
        const proxyErrors = {
          ...validateAuthenticationFields(data, 'http'),
          ...validateAuthenticationFields(data, 'https'),
        };

        return {
          timeout: ValidationUtils.isInRange({
            value: data.timeout,
            min: 1,
            max: 3600,
          }),
          retries: ValidationUtils.isInRange({
            value: data.retries,
            min: 0,
            max: 10,
          }),
          ...proxyErrors,
        };
      },
    }),
    setIsPristine: assign({
      isPristine: ({data, pristineData}, {name, value}) => {
        let currentData = validatePristine(data, 'http', name, value);
        let pristine = validatePristine(pristineData, 'http', name, value);

        currentData = validatePristine(currentData, 'https', name, value);
        pristine = validatePristine(pristine, 'https', name, value);

        return whereEq(pristine)(currentData);
      },
    }),
    removeNonProxyHost: assign({
      data: ({data}, {index}) => ({
        ...data,
        nonProxyHosts: data.nonProxyHosts.filter((_, i) => i !== index),
      }),
    }),
    addNonProxyHost: assign({
      data: ({data: {nonProxyHost, nonProxyHosts, ...rest}}) => {
        const current = nonProxyHosts || [];
        const arr = ValidationUtils.isBlank(nonProxyHost)
          ? current
          : [...current, nonProxyHost];

        return {
          ...rest,
          nonProxyHost: '',
          nonProxyHosts: arr,
        };
      },
    }),
    toggleAuthentication: assign({
      data: ({data}, {name, value}) => ({
        ...data,
        [name]: isNil(value) ? !data[name] : value,
      }),
      isTouched: ({isTouched, data}, {name}) => {
        const checkHttpAuthentication =
          name === 'httpAuthEnabled' && data[name];
        const checkHttpsAuthentication =
          name === 'httpsAuthEnabled' && data[name];

        return {
          ...isTouched,
          httpAuthUsername: checkHttpAuthentication,
          httpsAuthUsername: checkHttpsAuthentication,
        };
      },
    }),
    toggleHttpProxy: assign({
      data: ({data}) => ({
        ...data,
        httpEnabled: !data.httpEnabled,
        httpsEnabled: data.httpEnabled && !data.httpEnabled,
        httpAuthEnabled: data.httpEnabled && !data.httpEnabled,
        httpsAuthEnabled: data.httpEnabled && !data.httpEnabled,
      }),
    }),
    toggleHttpsProxy: assign({
      data: ({data}) => ({
        ...data,
        httpsEnabled: !data.httpsEnabled,
        httpsAuthEnabled: data.httpsEnabled && !data.httpsEnabled,
      }),
    }),
    setData: update,
    onSaveSuccess: update,
  },
  services: {
    fetchData: () => ExtAPIUtils.extAPIRequest(ACTION, METHODS.READ),
    saveData: ({data}) => {
      let saveData = validateAuthentication(data, 'http');

      saveData = validateAuthentication(saveData, 'https');
      saveData = removeEmptyValues(saveData);

      return ExtAPIUtils.extAPIRequest(ACTION, METHODS.UPDATE, {
        data: [saveData],
      });
    },
  },
});
