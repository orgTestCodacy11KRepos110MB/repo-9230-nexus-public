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
/*global Ext, NX*/

/**
 * Task Schedule Once field set.
 *
 * @since 3.0
 */
Ext.define('NX.coreui.view.task.TaskScheduleOnce', {
  extend: 'NX.coreui.view.task.TaskScheduleFields',
  alias: 'widget.nx-coreui-task-schedule-once',
  requires: [
    'NX.util.DateFormat',
    'NX.I18n'
  ],

  /**
   * @override
   */
  initComponent: function () {
    var me = this;

    me.items = [
      {
        xtype: 'datefield',
        name: 'startDate',
        itemId: 'startDate',
        fieldLabel: NX.I18n.get('Task_TaskScheduleDaily_StartDate_FieldLabel'),
        allowBlank: false,
        format: 'm/d/Y',
        value: new Date(),
        submitValue: false
      },
      {
        xtype: 'timefield',
        name: 'startTime',
        itemId: 'startTime',
        fieldLabel: NX.I18n.get('Task_TaskScheduleHourly_EndDate_FieldLabel'),
        helpText: 'The time this task should start running in your time zone ' + NX.util.DateFormat.getTimeZone() + '.',
        allowBlank: false,
        format: 'H:i',
        submitValue: false
      }
    ];

    me.callParent();
  }

});
