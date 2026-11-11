/**
 * Unit tests for Tasks calculations, urgency tiers, summary counters, and filtering/sorting.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateTaskSummary,
  extractTaskCategories,
  filterAndSortTasks,
  getDefaultBoardStage,
  getTaskUrgencyMeta,
  getToggledCompletionStatus,
  isTaskOverdue,
} from '../features/tasks/services/taskCalculations.ts';
import { getHorizontalOverflowState } from '../components/ui/scrollOverflow.ts';
import { Task } from '../types/entities.ts';

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    _id: 'task-1',
    userId: 'user-1',
    title: 'Sample Task',
    status: 'todo',
    priority: 'medium',
    category: 'Personal',
    createdAt: '2026-11-10T09:00:00.000Z',
    updatedAt: '2026-11-10T09:00:00.000Z',
    ...overrides,
  };
}

const REF_DATE = new Date(2026, 10, 11, 10, 0, 0); // Nov 11, 2026

describe('Task Urgency & Overdue Detection', () => {
  it('marks incomplete past-due tasks as overdue and critical', () => {
    const overdue = makeTask({ dueDate: '2026-11-09', status: 'todo' });
    assert.strictEqual(isTaskOverdue(overdue, REF_DATE), true);
    const meta = getTaskUrgencyMeta(overdue, REF_DATE);
    assert.strictEqual(meta.tier, 'critical');
    assert.strictEqual(meta.label, 'Overdue 2d');
  });

  it('never marks completed tasks as overdue', () => {
    const done = makeTask({ dueDate: '2026-11-01', status: 'completed' });
    assert.strictEqual(isTaskOverdue(done, REF_DATE), false);
    assert.strictEqual(getTaskUrgencyMeta(done, REF_DATE).tier, 'completed');
  });

  it('classifies due today, tomorrow, due soon, and undated tasks accurately', () => {
    assert.strictEqual(getTaskUrgencyMeta(makeTask({ dueDate: '2026-11-11' }), REF_DATE).tier, 'urgent');
    assert.strictEqual(getTaskUrgencyMeta(makeTask({ dueDate: '2026-11-12' }), REF_DATE).tier, 'dueSoon');
    assert.strictEqual(getTaskUrgencyMeta(makeTask({ dueDate: '2026-11-28' }), REF_DATE).tier, 'upcoming');
    assert.strictEqual(getTaskUrgencyMeta(makeTask({ dueDate: undefined }), REF_DATE).tier, 'none');
  });
});

describe('Task Summary, Filtering, and Sorting', () => {
  const sample: Task[] = [
    makeTask({ _id: '1', title: 'Pay rent', status: 'todo', priority: 'urgent', dueDate: '2026-11-09', category: 'Finance' }),
    makeTask({ _id: '2', title: 'Draft budget', status: 'in_progress', priority: 'high', dueDate: '2026-11-11', category: 'Finance' }),
    makeTask({ _id: '3', title: 'Walk dog', status: 'completed', priority: 'low', dueDate: '2026-11-10', category: 'Personal' }),
    makeTask({ _id: '4', title: 'Dentist form', status: 'todo', priority: 'medium', dueDate: '2026-11-14', category: 'Health' }),
  ];

  it('computes accurate summary counts and completion rate', () => {
    const summary = calculateTaskSummary(sample, REF_DATE);
    assert.strictEqual(summary.total, 4);
    assert.strictEqual(summary.active, 3);
    assert.strictEqual(summary.todo, 2);
    assert.strictEqual(summary.inProgress, 1);
    assert.strictEqual(summary.completed, 1);
    assert.strictEqual(summary.overdue, 1);
    assert.strictEqual(summary.dueSoon, 2);
    assert.strictEqual(summary.completionRate, 0.25);
  });

  it('extracts sorted unique categories', () => {
    assert.deepStrictEqual(extractTaskCategories(sample), ['Finance', 'Health', 'Personal']);
  });

  it('filters by status, overdue, category, and search query cleanly', () => {
    assert.deepStrictEqual(
      filterAndSortTasks(sample, { statusFilter: 'overdue', referenceDate: REF_DATE }).map((t) => t._id),
      ['1']
    );
    assert.deepStrictEqual(
      filterAndSortTasks(sample, { categoryFilter: 'Finance', searchQuery: 'budget', referenceDate: REF_DATE }).map((t) => t._id),
      ['2']
    );
    assert.deepStrictEqual(
      filterAndSortTasks(sample, { statusFilter: 'completed', referenceDate: REF_DATE }).map((t) => t._id),
      ['3']
    );
  });

  it('places active tasks before completed when viewing all and supports priority sorting', () => {
    const ordered = filterAndSortTasks(sample, { sortBy: 'priority', referenceDate: REF_DATE });
    assert.deepStrictEqual(
      ordered.map((t) => t._id),
      ['1', '2', '4', '3']
    );
  });

  it('toggles completion status cleanly', () => {
    assert.strictEqual(getToggledCompletionStatus('todo'), 'completed');
    assert.strictEqual(getToggledCompletionStatus('in_progress'), 'completed');
    assert.strictEqual(getToggledCompletionStatus('completed'), 'todo');
  });

  it('selects the first populated board stage and falls back to todo when empty', () => {
    assert.strictEqual(
      getDefaultBoardStage([
        makeTask({ _id: 'p1', status: 'in_progress' }),
        makeTask({ _id: 'p2', status: 'completed' }),
      ]),
      'in_progress'
    );

    assert.strictEqual(
      getDefaultBoardStage([makeTask({ _id: 'c1', status: 'completed' })]),
      'completed'
    );

    assert.strictEqual(
      getDefaultBoardStage([
        makeTask({ _id: 't1', status: 'todo' }),
        makeTask({ _id: 'p1', status: 'in_progress' }),
      ]),
      'todo'
    );

    assert.strictEqual(getDefaultBoardStage([]), 'todo');
  });

  it('tracks horizontal filter overflow and end-of-scroll reachability accurately', () => {
    // At 360px viewport (~328px inner width), 440px filter strip overflows right
    assert.deepStrictEqual(
      getHorizontalOverflowState({ containerWidth: 328, contentWidth: 440, scrollX: 0 }),
      { hasOverflow: true, canScrollLeft: false, canScrollRight: true }
    );

    // Mid-scroll shows both edges scrollable
    assert.deepStrictEqual(
      getHorizontalOverflowState({ containerWidth: 328, contentWidth: 440, scrollX: 50 }),
      { hasOverflow: true, canScrollLeft: true, canScrollRight: true }
    );

    // Scrolled all the way to the right clears right overflow cue
    assert.deepStrictEqual(
      getHorizontalOverflowState({ containerWidth: 328, contentWidth: 440, scrollX: 112 }),
      { hasOverflow: true, canScrollLeft: true, canScrollRight: false }
    );

    // Fits cleanly with no overflow cue needed
    assert.deepStrictEqual(
      getHorizontalOverflowState({ containerWidth: 328, contentWidth: 280, scrollX: 0 }),
      { hasOverflow: false, canScrollLeft: false, canScrollRight: false }
    );
  });
});

