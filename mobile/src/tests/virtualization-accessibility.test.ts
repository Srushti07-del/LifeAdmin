/**
 * LifeAdmin Mobile — Milestone 5.2 Unit Tests
 * List Virtualization & Rendering Performance + Accessibility Font Scaling.
 *
 * Verifies:
 * 1. All 5 target screens utilize React Native virtualized lists (FlatList / SectionList)
 *    with appropriate lazy rendering properties, key extractors, and content padding.
 * 2. Unvirtualized main collection `.map(` calls have been eliminated from the scroll path.
 * 3. Dynamic accessibility font scaling metrics in inputLayout.ts, Button.tsx, and SegmentedControl.tsx
 *    relax fixed heights and scale minimum heights & paddings gracefully for 1.3x, 1.5x, and 2.0x scales.
 * 4. Sectioned timeline data construction and grouping integrity in Reminders and Tasks.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getInputLayoutMetrics } from '../components/ui/inputLayout';
import { groupRemindersBySection } from '../features/reminders/services/reminderCalculations';
import { Reminder } from '../features/reminders/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const MOBILE_ROOT = path.resolve(__dirname, '../..');

function readMobileFile(relativePath: string): string {
  const filePath = path.join(MOBILE_ROOT, relativePath);
  assert.ok(fs.existsSync(filePath), `File must exist: ${relativePath}`);
  return fs.readFileSync(filePath, 'utf8');
}

describe('Milestone 5.2: Screen List Virtualization', () => {
  it('virtualizes tasks list in tasks.tsx with FlatList and lazy windowing', () => {
    const tasksScreen = readMobileFile('src/app/(tabs)/tasks.tsx');

    assert.ok(tasksScreen.includes('<FlatList'), 'tasks.tsx must render a <FlatList');
    assert.ok(tasksScreen.includes('data={listData}'), 'tasks.tsx must bind FlatList to listData');
    assert.ok(tasksScreen.includes('renderItem={renderTaskItem}'), 'tasks.tsx must use renderTaskItem callback');
    assert.ok(tasksScreen.includes('keyExtractor={taskKeyExtractor}'), 'tasks.tsx must use taskKeyExtractor');
    assert.ok(tasksScreen.includes('ListHeaderComponent={renderHeader}'), 'tasks.tsx must hoist controls into ListHeaderComponent');
    assert.ok(tasksScreen.includes('initialNumToRender={10}'), 'tasks.tsx must specify initialNumToRender');
    assert.ok(tasksScreen.includes('maxToRenderPerBatch={10}'), 'tasks.tsx must specify maxToRenderPerBatch');
    assert.ok(tasksScreen.includes('windowSize={5}'), 'tasks.tsx must configure windowSize');
    assert.ok(tasksScreen.includes('removeClippedSubviews='), 'tasks.tsx must optimize clipped subviews on Android');

    // Verify main list .map loop is gone from the list view mode
    assert.ok(!tasksScreen.includes('filteredTasks.map('), 'tasks.tsx must not unroll filteredTasks with .map in list view');
  });

  it('virtualizes bills in bills.tsx with responsive grid/list FlatList', () => {
    const billsScreen = readMobileFile('src/app/(tabs)/bills.tsx');

    assert.ok(billsScreen.includes('<FlatList'), 'bills.tsx must render a <FlatList');
    assert.ok(billsScreen.includes('renderItem={renderBillItem}'), 'bills.tsx must use renderBillItem callback');
    assert.ok(billsScreen.includes('keyExtractor={billKeyExtractor}'), 'bills.tsx must use billKeyExtractor');
    assert.ok(billsScreen.includes('numColumns={numColumns}'), 'bills.tsx must support responsive columns');
    assert.ok(billsScreen.includes('ListHeaderComponent={renderHeader}'), 'bills.tsx must hoist controls into ListHeaderComponent');
    assert.ok(billsScreen.includes('initialNumToRender={8}'), 'bills.tsx must specify initialNumToRender');
    assert.ok(billsScreen.includes('maxToRenderPerBatch={8}'), 'bills.tsx must specify maxToRenderPerBatch');
    assert.ok(billsScreen.includes('windowSize={5}'), 'bills.tsx must configure windowSize');

    // Verify main list .map loop is gone
    assert.ok(!billsScreen.includes('filteredBills.map('), 'bills.tsx must not unroll filteredBills with .map');
  });

  it('virtualizes documents vault in documents.tsx with FlatList', () => {
    const docsScreen = readMobileFile('src/app/documents.tsx');

    assert.ok(docsScreen.includes('<FlatList'), 'documents.tsx must render a <FlatList');
    assert.ok(docsScreen.includes('renderItem={renderDocItem}'), 'documents.tsx must use renderDocItem callback');
    assert.ok(docsScreen.includes('keyExtractor={docKeyExtractor}'), 'documents.tsx must use docKeyExtractor');
    assert.ok(docsScreen.includes('ListHeaderComponent={renderHeader}'), 'documents.tsx must hoist controls into ListHeaderComponent');
    assert.ok(docsScreen.includes('initialNumToRender={8}'), 'documents.tsx must specify initialNumToRender');
    assert.ok(docsScreen.includes('maxToRenderPerBatch={8}'), 'documents.tsx must specify maxToRenderPerBatch');
    assert.ok(docsScreen.includes('windowSize={5}'), 'documents.tsx must configure windowSize');

    // Verify main list .map loop is gone
    assert.ok(!docsScreen.includes('filteredDocuments.map('), 'documents.tsx must not unroll filteredDocuments with .map');
  });

  it('virtualizes appointments in appointments.tsx with FlatList', () => {
    const apptsScreen = readMobileFile('src/app/appointments.tsx');

    assert.ok(apptsScreen.includes('<FlatList'), 'appointments.tsx must render a <FlatList');
    assert.ok(apptsScreen.includes('renderItem={renderAppointmentItem}'), 'appointments.tsx must use renderAppointmentItem callback');
    assert.ok(apptsScreen.includes('keyExtractor={appointmentKeyExtractor}'), 'appointments.tsx must use appointmentKeyExtractor');
    assert.ok(apptsScreen.includes('ListHeaderComponent={renderHeader}'), 'appointments.tsx must hoist controls into ListHeaderComponent');
    assert.ok(apptsScreen.includes('initialNumToRender={8}'), 'appointments.tsx must specify initialNumToRender');
    assert.ok(apptsScreen.includes('maxToRenderPerBatch={8}'), 'appointments.tsx must specify maxToRenderPerBatch');
    assert.ok(apptsScreen.includes('windowSize={5}'), 'appointments.tsx must configure windowSize');

    // Verify main list .map loop is gone
    assert.ok(!apptsScreen.includes('filteredAppointments.map('), 'appointments.tsx must not unroll filteredAppointments with .map');
  });

  it('virtualizes reminder timeline in reminders.tsx with SectionList', () => {
    const remindersScreen = readMobileFile('src/app/reminders.tsx');

    assert.ok(remindersScreen.includes('<SectionList'), 'reminders.tsx must render a <SectionList');
    assert.ok(remindersScreen.includes('sections={sections}'), 'reminders.tsx must bind SectionList to sections');
    assert.ok(remindersScreen.includes('renderItem={renderReminderItem}'), 'reminders.tsx must use renderReminderItem callback');
    assert.ok(remindersScreen.includes('renderSectionHeader={renderSectionHeader}'), 'reminders.tsx must use renderSectionHeader');
    assert.ok(remindersScreen.includes('keyExtractor={reminderKeyExtractor}'), 'reminders.tsx must use reminderKeyExtractor');
    assert.ok(remindersScreen.includes('stickySectionHeadersEnabled={false}'), 'reminders.tsx must disable sticky headers for natural scrolling');
    assert.ok(remindersScreen.includes('ListHeaderComponent={renderHeader}'), 'reminders.tsx must hoist controls into ListHeaderComponent');
    assert.ok(remindersScreen.includes('initialNumToRender={10}'), 'reminders.tsx must specify initialNumToRender');
    assert.ok(remindersScreen.includes('maxToRenderPerBatch={10}'), 'reminders.tsx must specify maxToRenderPerBatch');
    assert.ok(remindersScreen.includes('windowSize={5}'), 'reminders.tsx must configure windowSize');

    // Verify main list .map loop is gone
    assert.ok(!remindersScreen.includes('grouped.overdue.map('), 'reminders.tsx must not unroll grouped overdue with .map');
    assert.ok(!remindersScreen.includes('grouped.today.map('), 'reminders.tsx must not unroll grouped today with .map');
    assert.ok(!remindersScreen.includes('grouped.upcoming.map('), 'reminders.tsx must not unroll grouped upcoming with .map');
    assert.ok(!remindersScreen.includes('grouped.completed.map('), 'reminders.tsx must not unroll grouped completed with .map');
  });
});

describe('Milestone 5.2: Accessibility Font Scaling Metrics', () => {
  it('getInputLayoutMetrics returns standard 44px container at 1.0 fontScale', () => {
    const metrics = getInputLayoutMetrics({ fontScale: 1.0 });

    assert.equal(metrics.isScaled, false, 'Standard fontScale must not be flagged as scaled');
    assert.equal(metrics.containerHeight, 44, 'Standard single-line container must be exactly 44px');
    assert.equal(metrics.containerMinHeight, 44, 'Standard single-line minHeight must be 44px');
    assert.equal(metrics.textAlignVertical, 'center');
  });

  it('getInputLayoutMetrics relaxes fixed containerHeight and scales minHeight for 1.3x and 1.5x font scales', () => {
    const scale13 = getInputLayoutMetrics({ fontScale: 1.3 });
    assert.equal(scale13.isScaled, true, '1.3x fontScale must be flagged as scaled');
    assert.equal(scale13.containerHeight, undefined, 'Fixed containerHeight must be undefined to allow natural expansion');
    assert.ok(scale13.containerMinHeight >= 48, `1.3x minHeight (${scale13.containerMinHeight}) must be >= 48`);
    assert.ok(scale13.paddingTop > 0, 'Vertical padding must scale to prevent text clipping');

    const scale15 = getInputLayoutMetrics({ fontScale: 1.5 });
    assert.equal(scale15.isScaled, true, '1.5x fontScale must be flagged as scaled');
    assert.equal(scale15.containerHeight, undefined, 'Fixed containerHeight must be undefined');
    assert.ok(scale15.containerMinHeight >= 52, `1.5x minHeight (${scale15.containerMinHeight}) must be >= 52`);
  });

  it('getInputLayoutMetrics clamps extreme 2.0x font scale gracefully', () => {
    const scale20 = getInputLayoutMetrics({ fontScale: 2.0 });
    assert.equal(scale20.isScaled, true);
    assert.equal(scale20.containerHeight, undefined);
    assert.ok(Number.isFinite(scale20.containerMinHeight));
    assert.ok(scale20.containerMinHeight >= 56 && scale20.containerMinHeight <= 80, 'Must safely clamp extreme scale');
  });

  it('Button sizeStyles declare flexible minHeight and paddingVertical instead of rigid height', () => {
    const buttonSrc = readMobileFile('src/components/ui/Button.tsx');

    assert.ok(buttonSrc.includes('minHeight: 32'), 'Button size="sm" must use minHeight: 32');
    assert.ok(buttonSrc.includes('minHeight: 40'), 'Button size="md" must use minHeight: 40');
    assert.ok(buttonSrc.includes('minHeight: 48'), 'Button size="lg" must use minHeight: 48');

    // Confirm rigid height is absent from sizeStyles
    assert.ok(!buttonSrc.includes('height: 32,'), 'Button sizeStyles must not use fixed height: 32');
    assert.ok(!buttonSrc.includes('height: 40,'), 'Button sizeStyles must not use fixed height: 40');
    assert.ok(!buttonSrc.includes('height: 48,'), 'Button sizeStyles must not use fixed height: 48');
  });

  it('SegmentedControl declares flexible minHeight for both container and tabs', () => {
    const segSrc = readMobileFile('src/components/ui/SegmentedControl.tsx');

    assert.ok(segSrc.includes('minHeight: 44'), 'SegmentedControl container must declare minHeight: 44');
    assert.ok(segSrc.includes('minHeight: 38'), 'SegmentedControl tab must declare minHeight: 38');
  });
});

describe('Milestone 5.2: Reminder Section & Task Grouping Integrity', () => {
  it('correctly categorizes overdue, today, upcoming, and completed reminders into sections', () => {
    const referenceDate = new Date('2026-11-13T10:00:00.000');
    const yesterday = new Date('2026-11-12T10:00:00.000').toISOString();
    const today = new Date('2026-11-13T14:00:00.000').toISOString();
    const future = new Date('2026-11-18T10:00:00.000').toISOString();

    const sampleReminders: Reminder[] = [
      {
        _id: 'rem-1',
        userId: 'u1',
        title: 'Overdue water bill',
        dueDate: yesterday,
        dueTime: '09:00',
        priority: 'high',
        category: 'Finance',
        status: 'pending',
        notificationScheduled: false,
        createdAt: yesterday,
        updatedAt: yesterday,
      },
      {
        _id: 'rem-2',
        userId: 'u1',
        title: 'Dentist appointment today',
        dueDate: today,
        dueTime: '14:00',
        priority: 'urgent',
        category: 'Health',
        status: 'pending',
        notificationScheduled: false,
        createdAt: today,
        updatedAt: today,
      },
      {
        _id: 'rem-3',
        userId: 'u1',
        title: 'Project deadline next week',
        dueDate: future,
        dueTime: '10:00',
        priority: 'medium',
        category: 'Work',
        status: 'pending',
        notificationScheduled: false,
        createdAt: today,
        updatedAt: today,
      },
      {
        _id: 'rem-4',
        userId: 'u1',
        title: 'Old completed reminder',
        dueDate: yesterday,
        priority: 'low',
        category: 'General',
        status: 'completed',
        completedAt: yesterday,
        notificationScheduled: false,
        createdAt: yesterday,
        updatedAt: yesterday,
      },
    ];

    const grouped = groupRemindersBySection(sampleReminders, referenceDate);

    assert.equal(grouped.overdue.length, 1);
    assert.equal(grouped.overdue[0]._id, 'rem-1');

    assert.equal(grouped.today.length, 1);
    assert.equal(grouped.today[0]._id, 'rem-2');

    assert.equal(grouped.upcoming.length, 1);
    assert.equal(grouped.upcoming[0]._id, 'rem-3');

    assert.equal(grouped.completed.length, 1);
    assert.equal(grouped.completed[0]._id, 'rem-4');
  });
});
