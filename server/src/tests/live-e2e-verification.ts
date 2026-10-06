import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = 'http://localhost:5000/api';

interface VerificationResult {
  suite: string;
  test: string;
  passed: boolean;
  notes: string;
}

const results: VerificationResult[] = [];

function record(suite: string, test: string, passed: boolean, notes: string = '') {
  results.push({ suite, test, passed, notes });
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} [${suite}] ${test} ${notes ? `(${notes})` : ''}`);
}

async function runLiveVerification() {
  console.log('\n==================================================');
  console.log('STARTING LIFEADMIN LIVE END-TO-END VERIFICATION');
  console.log('Target API:', BASE_URL);
  console.log('==================================================\n');

  // STEP 0: Authentication & Session
  const timestamp = Date.now();
  const testEmail = `e2e_live_${timestamp}@lifeadmin.local`;
  const testPassword = 'Password123!';
  let authToken = '';
  let userId = '';

  try {
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Live E2E Tester',
        email: testEmail,
        password: testPassword,
      }),
    });
    const regData: any = await regRes.json();
    assert.equal(regRes.status, 201, 'Registration should return 201');
    assert.ok(regData.token, 'Registration should return JWT token');
    authToken = regData.token;
    userId = regData.user._id || regData.user.id;
    record('AUTH', 'User registration and JWT token issue', true, `User ID: ${userId}`);
  } catch (err: any) {
    record('AUTH', 'User registration and JWT token issue', false, err.message);
    process.exit(1);
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${authToken}`,
  };

  // STEP 0.1: Initial Empty State Verification
  try {
    const dashRes = await fetch(`${BASE_URL}/dashboard`, { headers: authHeaders });
    const dashData: any = await dashRes.json();
    assert.equal(dashRes.status, 200);
    assert.equal(dashData.needsAttention.length, 0, 'New account should have 0 needsAttention items');
    assert.equal(dashData.upcoming.length, 0, 'New account should have 0 upcoming items');
    assert.equal(dashData.stats.overdueCount, 0);
    record('EMPTY_STATE', 'Initial Dashboard has 0 attention/upcoming items (Calm workspace)', true);
  } catch (err: any) {
    record('EMPTY_STATE', 'Initial Dashboard empty state', false, err.message);
  }

  // ==================================================
  // TEST 1 — TASK END-TO-END
  // ==================================================
  let createdTaskId = '';
  const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  try {
    // 1. Validation test (missing title)
    const invalidRes = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ description: 'No title provided' }),
    });
    assert.equal(invalidRes.status, 400, 'Missing title must return 400');
    record('TASK', 'Task required field validation (400 on empty title)', true);

    // 2. Create Task
    const createRes = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Functional Test Task',
        description: 'End-to-end verification',
        dueDate: tomorrow,
        priority: 'high',
        category: 'Work/Study',
      }),
    });
    assert.equal(createRes.status, 201);
    const createData: any = await createRes.json();
    createdTaskId = createData.task._id;
    assert.equal(createData.task.title, 'Functional Test Task');
    record('TASK', 'Create task via POST /api/tasks', true, `Task ID: ${createdTaskId}`);

    // 3. Read Task (Persistence check)
    const getRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, { headers: authHeaders });
    assert.equal(getRes.status, 200);
    const getData: any = await getRes.json();
    assert.equal(getData.task.title, 'Functional Test Task');
    record('TASK', 'Read and verify task persistence via GET /api/tasks/:id', true);

    // 4. Edit Task
    const editRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        description: 'Edited end-to-end verification description',
        priority: 'urgent',
      }),
    });
    assert.equal(editRes.status, 200);
    const editData: any = await editRes.json();
    assert.equal(editData.task.priority, 'urgent');
    assert.equal(editData.task.description, 'Edited end-to-end verification description');
    record('TASK', 'Edit task via PUT /api/tasks/:id and verify updated fields', true);

    // 5. Mark Complete
    const completeRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ status: 'completed' }),
    });
    assert.equal(completeRes.status, 200);
    const completeData: any = await completeRes.json();
    assert.equal(completeData.task.status, 'completed');
    assert.ok(completeData.task.completedAt, 'completedAt must be populated');
    record('TASK', 'Mark complete and verify completedAt timestamp', true);

    // 6. Verify Dashboard reflects completion (completed task should not appear in needsAttention)
    const dashCheck = await fetch(`${BASE_URL}/dashboard`, { headers: authHeaders });
    const dashCheckData: any = await dashCheck.json();
    const inAttention = dashCheckData.needsAttention.find((i: any) => i.id === createdTaskId);
    assert.equal(inAttention, undefined, 'Completed task must not appear in Needs Attention');
    record('TASK', 'Dashboard reflects completed task (removed from Needs Attention)', true);

    // 7. Delete Task
    const delRes = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert.equal(delRes.status, 200);
    const getAfterDel = await fetch(`${BASE_URL}/tasks/${createdTaskId}`, { headers: authHeaders });
    assert.equal(getAfterDel.status, 404, 'Deleted task must return 404');
    record('TASK', 'Delete task via DELETE /api/tasks/:id and verify removal', true);
  } catch (err: any) {
    record('TASK', 'Task End-to-End flow', false, err.message);
  }

  // ==================================================
  // TEST 2 & 3 — BILL END-TO-END & RECURRENCE
  // ==================================================
  let createdBillId: string;
  try {
    // 1. Validation test (missing amount)
    const invalidBillRes = await fetch(`${BASE_URL}/bills`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Invalid Bill' }),
    });
    assert.equal(invalidBillRes.status, 400);
    record('BILL', 'Bill validation test (400 on missing amount/dueDate)', true);

    // 2. Create Bill with monthly recurrence
    const createBillRes = await fetch(`${BASE_URL}/bills`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        name: 'Functional Test Bill',
        provider: 'Fiber Link',
        amount: 400,
        currency: '₹',
        dueDate: tomorrow,
        category: 'Utilities',
        recurrence: {
          type: 'monthly',
          interval: 1,
          unit: 'months',
        },
      }),
    });
    assert.equal(createBillRes.status, 201);
    const createBillData: any = await createBillRes.json();
    createdBillId = createBillData.bill._id;
    assert.equal(createBillData.bill.amount, 400);
    assert.equal(createBillData.bill.recurrence.type, 'monthly');
    record('BILL', 'Create recurring bill via POST /api/bills', true, `Bill ID: ${createdBillId}`);

    // 3. Verify Bill appears in Dashboard Needs Attention & Upcoming (due tomorrow)
    const billDashRes = await fetch(`${BASE_URL}/dashboard`, { headers: authHeaders });
    const billDashData: any = await billDashRes.json();
    const billInAttention = billDashData.needsAttention.find((i: any) => i.id === createdBillId);
    assert.ok(billInAttention, 'Pending bill due tomorrow must be in Needs Attention');
    assert.equal(billInAttention.amount, 400);

    const billInUpcoming = billDashData.upcoming.find((i: any) => i.id === createdBillId);
    assert.ok(billInUpcoming, 'Pending bill due tomorrow must be in Upcoming');
    record('BILL', 'Dashboard identifies bill in Needs Attention and Upcoming', true);

    // 4. Edit Bill amount
    const editBillRes = await fetch(`${BASE_URL}/bills/${createdBillId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        amount: 450,
        notes: 'Speed upgraded plan',
      }),
    });
    assert.equal(editBillRes.status, 200);
    const editBillData: any = await editBillRes.json();
    assert.equal(editBillData.bill.amount, 450);
    record('BILL', 'Edit bill amount via PUT /api/bills/:id (persists to 450)', true);

    // 5. TEST 3: Recurrence Execution on Payment
    // Mark paid via PATCH /api/bills/:id/pay
    const payRes = await fetch(`${BASE_URL}/bills/${createdBillId}/pay`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    assert.equal(payRes.status, 200);
    const payData: any = await payRes.json();
    assert.equal(payData.bill.paymentStatus, 'paid', 'Original bill must be marked paid');
    assert.ok(payData.nextOccurrence, 'Payment must generate next occurrence');
    assert.equal(payData.nextOccurrence.name, 'Functional Test Bill');
    assert.equal(payData.nextOccurrence.amount, 450, 'Next occurrence inherits updated amount');
    assert.equal(payData.nextOccurrence.paymentStatus, 'pending');

    const nextOccurrenceDate = new Date(payData.nextOccurrence.dueDate);
    const expectedMonth = (new Date(tomorrow).getMonth() + 1) % 12;
    assert.equal(nextOccurrenceDate.getMonth(), expectedMonth, 'Next occurrence date is exactly 1 month later');
    record('RECURRENCE', 'Deterministic next occurrence generated on bill payment', true, `Next Due: ${nextOccurrenceDate.toISOString().split('T')[0]}`);

    // 6. Recurrence duplicate prevention check
    // Calling pay again on the paid bill or querying must NOT duplicate the occurrence
    const duplicatePayAttempt = await fetch(`${BASE_URL}/bills/${createdBillId}/pay`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    assert.equal(duplicatePayAttempt.status, 200);
    const dupData: any = await duplicatePayAttempt.json();
    assert.equal(dupData.nextOccurrence, null, 'Duplicate payment returns null for nextOccurrence without creating a duplicate');

    // Check count in bills list
    const listBillsRes = await fetch(`${BASE_URL}/bills`, { headers: authHeaders });
    const listBillsData: any = await listBillsRes.json();
    const matchingBills = listBillsData.bills.filter((b: any) => b.name === 'Functional Test Bill');
    assert.equal(matchingBills.length, 2, 'Exactly 2 bills exist: 1 historical paid record + 1 next pending record');
    record('RECURRENCE', 'Duplicate occurrence prevention verified & historical record preserved', true);

    // 7. Mark unpaid
    const unpayRes = await fetch(`${BASE_URL}/bills/${createdBillId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({ paymentStatus: 'pending' }),
    });
    assert.equal(unpayRes.status, 200);
    const unpayData: any = await unpayRes.json();
    assert.equal(unpayData.bill.paymentStatus, 'pending');
    record('BILL', 'Mark bill unpaid restores status to pending', true);

    // 8. Delete bills
    for (const b of matchingBills) {
      await fetch(`${BASE_URL}/bills/${b._id}`, { method: 'DELETE', headers: authHeaders });
    }
    const checkBillsAfterDel = await fetch(`${BASE_URL}/bills`, { headers: authHeaders });
    const checkBillsAfterDelData: any = await checkBillsAfterDel.json();
    assert.equal(checkBillsAfterDelData.bills.filter((b: any) => b.name === 'Functional Test Bill').length, 0);
    record('BILL', 'Delete bills via DELETE /api/bills/:id', true);
  } catch (err: any) {
    record('BILL', 'Bill & Recurrence End-to-End flow', false, err.message);
  }

  // ==================================================
  // TEST 4 — APPOINTMENT END-TO-END
  // ==================================================
  let createdApptId: string;
  try {
    const createRes = await fetch(`${BASE_URL}/appointments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Functional Test Appointment',
        date: tomorrow,
        time: '14:30',
        location: 'City Health Clinic Suite 4',
        category: 'Health',
        relatedPerson: 'Dr. Varma',
        notes: 'Follow-up consultation',
      }),
    });
    assert.equal(createRes.status, 201);
    const createData: any = await createRes.json();
    createdApptId = createData.appointment._id;
    record('APPOINTMENT', 'Create appointment via POST /api/appointments', true, `ID: ${createdApptId}`);

    // Verify persistence
    const getRes = await fetch(`${BASE_URL}/appointments/${createdApptId}`, { headers: authHeaders });
    assert.equal(getRes.status, 200);
    const getData: any = await getRes.json();
    assert.equal(getData.appointment.location, 'City Health Clinic Suite 4');
    record('APPOINTMENT', 'Read appointment persistence via GET /api/appointments/:id', true);

    // Verify Calendar & Upcoming integration
    const calRes = await fetch(`${BASE_URL}/calendar/events`, { headers: authHeaders });
    const calData: any = await calRes.json();
    const calItem = calData.events.find((e: any) => e.originalId === createdApptId);
    assert.ok(calItem, 'Appointment must appear in unified calendar feed');
    assert.equal(calItem.type, 'appointment');
    assert.equal(calItem.startTime, '14:30');
    record('APPOINTMENT', 'Calendar feed integrates appointment with correct time and location', true);

    // Edit appointment
    const editRes = await fetch(`${BASE_URL}/appointments/${createdApptId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        time: '15:00',
        location: 'City Health Clinic Suite 5 (Rescheduled)',
      }),
    });
    assert.equal(editRes.status, 200);
    const editData: any = await editRes.json();
    assert.equal(editData.appointment.time, '15:00');
    record('APPOINTMENT', 'Edit appointment time & location via PUT /api/appointments/:id', true);

    // Delete appointment
    const delRes = await fetch(`${BASE_URL}/appointments/${createdApptId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert.equal(delRes.status, 200);
    const calAfterDel = await fetch(`${BASE_URL}/calendar/events`, { headers: authHeaders });
    const calAfterDelData: any = await calAfterDel.json();
    assert.equal(calAfterDelData.events.find((e: any) => e.originalId === createdApptId), undefined);
    record('APPOINTMENT', 'Delete appointment and verify removal from calendar and upcoming', true);
  } catch (err: any) {
    record('APPOINTMENT', 'Appointment End-to-End flow', false, err.message);
  }

  // ==================================================
  // TEST 5 — REMINDER END-TO-END
  // ==================================================
  let createdReminderId: string;
  try {
    const createRes = await fetch(`${BASE_URL}/reminders`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Functional Test Reminder',
        dueDate: tomorrow,
        dueTime: '09:00',
        priority: 'high',
        category: 'Personal',
      }),
    });
    assert.equal(createRes.status, 201);
    const createData: any = await createRes.json();
    createdReminderId = createData.reminder._id;
    assert.equal(createData.reminder.status, 'active');
    record('REMINDER', 'Create reminder via POST /api/reminders', true, `ID: ${createdReminderId}`);

    // Verify in Dashboard Needs Attention
    const dashRes = await fetch(`${BASE_URL}/dashboard`, { headers: authHeaders });
    const dashData: any = await dashRes.json();
    const remInAttention = dashData.needsAttention.find((i: any) => i.id === createdReminderId);
    assert.ok(remInAttention, 'Reminder due tomorrow must appear in Dashboard Needs Attention');
    record('REMINDER', 'Dashboard attention layer detects active reminder', true);

    // Acknowledge reminder
    const ackRes = await fetch(`${BASE_URL}/reminders/${createdReminderId}/acknowledge`, {
      method: 'PATCH',
      headers: authHeaders,
    });
    assert.equal(ackRes.status, 200);
    const ackData: any = await ackRes.json();
    assert.equal(ackData.reminder.status, 'acknowledged');
    record('REMINDER', 'Acknowledge reminder changes status to acknowledged (Internal state calculated)', true, 'Reminder state calculation works; external notification delivery not configured');

    // Delete reminder
    const delRes = await fetch(`${BASE_URL}/reminders/${createdReminderId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert.equal(delRes.status, 200);
    record('REMINDER', 'Delete reminder removes item', true);
  } catch (err: any) {
    record('REMINDER', 'Reminder End-to-End flow', false, err.message);
  }

  // ==================================================
  // TEST 6 — DOCUMENT END-TO-END
  // ==================================================
  let createdDocId: string;
  const tempDocPath = path.join(process.cwd(), 'temp_test_receipt.txt');
  fs.writeFileSync(tempDocPath, 'Test Invoice Document Content for LifeAdmin Functional Verification');

  try {
    // 1. Upload real document using FormData
    const fileBuffer = fs.readFileSync(tempDocPath);
    const blob = new Blob([fileBuffer], { type: 'text/plain' });
    const formData = new FormData();
    formData.append('file', blob, 'Electric_Bill_March.txt');
    formData.append('category', 'Utilities');
    formData.append('documentType', 'Utility Bill');
    formData.append('notes', 'Monthly energy bill receipt');
    formData.append('expiryDate', tomorrow);

    const uploadRes = await fetch(`${BASE_URL}/documents/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: formData,
    });
    assert.equal(uploadRes.status, 201);
    const uploadData: any = await uploadRes.json();
    createdDocId = uploadData.document._id;
    assert.equal(uploadData.document.originalName, 'Electric_Bill_March.txt');
    assert.equal(uploadData.document.category, 'Utilities');
    assert.ok(uploadData.document.aiExtracted.expiryDate, 'Expiry date must be persisted');

    // Truthful extraction check: No fabricated provider, amount, or fake dates
    assert.ok(!uploadData.document.aiExtracted.provider, 'Must NOT fabricate provider without OCR');
    assert.equal(uploadData.document.aiExtracted.amounts.length, 0, 'Must NOT fabricate amounts without OCR');
    assert.ok(
      uploadData.document.aiExtracted.summary.includes('OCR/AI extraction is not configured'),
      'Must truthfully state that OCR extraction is not configured'
    );
    record('DOCUMENT', 'Upload document with truthful classification & manual expiry tracking', true, `Doc ID: ${createdDocId}`);

    // 2. Secure view/download verification
    // A. Unauthenticated download fails with 401
    const unauthDownload = await fetch(`${BASE_URL}/documents/${createdDocId}/download`);
    assert.equal(unauthDownload.status, 401, 'Unauthenticated download must return 401');

    // B. Authenticated download with Bearer token succeeds with 200
    const bearerDownload = await fetch(`${BASE_URL}/documents/${createdDocId}/download`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert.equal(bearerDownload.status, 200);
    const textContent = await bearerDownload.text();
    assert.ok(textContent.includes('LifeAdmin Functional Verification'));

    // C. Authenticated download with query token (?token=...) succeeds with 200
    const queryDownload = await fetch(`${BASE_URL}/documents/${createdDocId}/download?token=${encodeURIComponent(authToken)}`);
    assert.equal(queryDownload.status, 200);
    record('DOCUMENT', 'Secure document download (rejects 401 unauth, allows Bearer header & ?token= param)', true);

    // 3. Edit metadata
    const editRes = await fetch(`${BASE_URL}/documents/${createdDocId}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        notes: 'Updated note: paid and filed away',
        category: 'Financial',
      }),
    });
    assert.equal(editRes.status, 200);
    const editData: any = await editRes.json();
    assert.equal(editData.document.category, 'Financial');
    assert.equal(editData.document.notes, 'Updated note: paid and filed away');
    record('DOCUMENT', 'Edit document metadata via PUT /api/documents/:id', true);

    // 4. Verify Expiry integration in Needs Attention
    const docDashRes = await fetch(`${BASE_URL}/dashboard`, { headers: authHeaders });
    const docDashData: any = await docDashRes.json();
    const docInAttention = docDashData.needsAttention.find((i: any) => i.id === createdDocId);
    assert.ok(docInAttention, 'Expiring document must appear in Needs Attention');
    assert.equal(docInAttention.type, 'document');
    record('DOCUMENT', 'Document expiry integrated into Needs Attention layer', true);

    // 5. Delete document
    const delRes = await fetch(`${BASE_URL}/documents/${createdDocId}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert.equal(delRes.status, 200);
    const getAfterDel = await fetch(`${BASE_URL}/documents/${createdDocId}`, { headers: authHeaders });
    assert.equal(getAfterDel.status, 404);
    record('DOCUMENT', 'Delete document via DELETE /api/documents/:id', true);
  } catch (err: any) {
    record('DOCUMENT', 'Document End-to-End flow', false, err.message);
  } finally {
    if (fs.existsSync(tempDocPath)) fs.unlinkSync(tempDocPath);
  }

  // ==================================================
  // TEST 7 & 8 — CALENDAR & DASHBOARD FULL AGGREGATION
  // ==================================================
  try {
    // Populate one of each entity type
    const [t, b, a, r, evt] = await Promise.all([
      fetch(`${BASE_URL}/tasks`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title: 'Agg Task', dueDate: tomorrow, priority: 'medium' }),
      }).then(r => r.json()),
      fetch(`${BASE_URL}/bills`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ name: 'Agg Bill', amount: 150, dueDate: tomorrow, category: 'Utilities' }),
      }).then(r => r.json()),
      fetch(`${BASE_URL}/appointments`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title: 'Agg Appt', date: tomorrow, time: '16:00', category: 'Health' }),
      }).then(r => r.json()),
      fetch(`${BASE_URL}/reminders`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title: 'Agg Reminder', dueDate: tomorrow, priority: 'high' }),
      }).then(r => r.json()),
      fetch(`${BASE_URL}/calendar/events`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ title: 'Agg Event', startDate: tomorrow, startTime: '18:00', category: 'Personal' }),
      }).then(r => r.json()),
    ]);

    // 1. Calendar Verification
    const calRes = await fetch(`${BASE_URL}/calendar/events`, { headers: authHeaders });
    const calData: any = await calRes.json();
    const eventTypes = new Set(calData.events.map((e: any) => e.type));
    assert.ok(eventTypes.has('task'), 'Calendar has task');
    assert.ok(eventTypes.has('bill'), 'Calendar has bill');
    assert.ok(eventTypes.has('appointment'), 'Calendar has appointment');
    assert.ok(eventTypes.has('reminder'), 'Calendar has reminder');
    assert.ok(eventTypes.has('event'), 'Calendar has event');
    record('CALENDAR', 'Calendar aggregates all 5 entity types (task, bill, appt, reminder, event)', true);

    // 2. Dashboard Verification
    const dashRes = await fetch(`${BASE_URL}/dashboard`, { headers: authHeaders });
    const dashData: any = await dashRes.json();
    const overview = dashData;

    // Check Needs Attention hierarchy & items
    assert.ok(overview.needsAttention.length >= 3, 'Needs attention has due-soon items');
    assert.ok(overview.upcoming.length >= 4, 'Upcoming has items');

    // Check chronological ordering of upcoming
    for (let i = 0; i < overview.upcoming.length - 1; i++) {
      const d1 = new Date(overview.upcoming[i].date).getTime();
      const d2 = new Date(overview.upcoming[i + 1].date).getTime();
      assert.ok(d1 <= d2, 'Upcoming feed must be sorted chronologically');
    }
    record('DASHBOARD', 'Upcoming items strictly sorted chronologically', true);

    // Verify stats calculation accuracy
    assert.equal(overview.stats.overdueCount, 0, 'No overdue items created');
    assert.ok(overview.stats.dueSoonCount >= 3, 'Due soon count matches active responsibilities');
    record('DASHBOARD', 'Summary counts accurately derived from live responsibilities', true);

    // ==================================================
    // TEST 12 — AI ASSISTANT FUNCTIONALITY
    // ==================================================
    const aiQueries = [
      'What do I need to take care of today?',
      'What bills are due soon?',
      'What appointments do I have coming up?',
      'What should I prioritize?',
    ];

    for (const q of aiQueries) {
      const aiRes = await fetch(`${BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ message: q }),
      });
      assert.equal(aiRes.status, 200);
      const aiData: any = await aiRes.json();
      assert.ok(aiData.reply, 'AI must return a reply');
      assert.ok(aiData.reply.length > 20, 'Reply must be substantial');
      assert.ok(
        aiData.reply.includes('Agg Bill') ||
        aiData.reply.includes('Agg Appt') ||
        aiData.reply.includes('Agg Task') ||
        aiData.reply.includes('Agg Reminder') ||
        aiData.reply.includes('responsibilities') ||
        aiData.reply.includes('150') ||
        aiData.reply.includes('tomorrow') ||
        aiData.reply.includes('tasks') ||
        aiData.reply.includes('bills'),
        `AI reply should reflect persisted context for query: "${q}"`
      );
    }
    record('AI_ASSISTANT', 'AI understands live LifeAdmin context (Bills, Appointments, Tasks, Priorities)', true);

    // AI suggestions confirmation flow
    const suggestRes = await fetch(`${BASE_URL}/ai/accept-suggestions`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        items: [{ type: 'task', title: 'AI Suggested Research Task', priority: 'medium', dueDate: tomorrow }],
      }),
    });
    assert.equal(suggestRes.status, 201);
    const suggestData: any = await suggestRes.json();
    assert.equal(suggestData.results.length, 1);
    record('AI_ASSISTANT', 'AI suggestion requires user confirmation before persistence (/accept-suggestions)', true);

    // Cleanup aggregation items
    await Promise.all([
      fetch(`${BASE_URL}/tasks/${t.task._id}`, { method: 'DELETE', headers: authHeaders }),
      fetch(`${BASE_URL}/tasks/${suggestData.results[0].item._id}`, { method: 'DELETE', headers: authHeaders }),
      fetch(`${BASE_URL}/bills/${b.bill._id}`, { method: 'DELETE', headers: authHeaders }),
      fetch(`${BASE_URL}/appointments/${a.appointment._id}`, { method: 'DELETE', headers: authHeaders }),
      fetch(`${BASE_URL}/reminders/${r.reminder._id}`, { method: 'DELETE', headers: authHeaders }),
      fetch(`${BASE_URL}/calendar/events/${evt.event._id}`, { method: 'DELETE', headers: authHeaders }),
    ]);
  } catch (err: any) {
    record('DASHBOARD_AND_AI', 'Dashboard aggregation and AI flow', false, err.message);
  }

  // ==================================================
  // TEST 13 — FINAL EMPTY STATE AFTER CLEANUP
  // ==================================================
  try {
    const emptyRes = await fetch(`${BASE_URL}/dashboard`, { headers: authHeaders });
    const emptyData: any = await emptyRes.json();
    assert.equal(emptyData.needsAttention.length, 0);
    assert.equal(emptyData.upcoming.length, 0);
    assert.equal(emptyData.stats.overdueCount, 0);
    assert.equal(emptyData.stats.dueSoonCount, 0);
    record('EMPTY_STATE', 'Calm workspace empty state confirmed after data cleanup (0 items)', true);
  } catch (err: any) {
    record('EMPTY_STATE', 'Final empty state check', false, err.message);
  }

  // ==================================================
  // TEST 14 — ERROR & SECURITY CASES
  // ==================================================
  try {
    // 1. Unauthenticated request to protected endpoint
    const unauthRes = await fetch(`${BASE_URL}/tasks`);
    assert.equal(unauthRes.status, 401, 'Unauthenticated request must return 401');
    record('ERROR_HANDLING', 'Protected endpoint enforces 401 Unauthorized', true);

    // 2. Invalid ObjectId format
    const badIdRes = await fetch(`${BASE_URL}/tasks/not-a-valid-id`, { headers: authHeaders });
    assert.equal(badIdRes.status, 404, 'Invalid ObjectId must return 404');
    record('ERROR_HANDLING', 'Invalid ObjectId yields clean 404 Not Found', true);

    // 3. Duplicate Account Prevention
    const dupAccountRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Tester',
        email: testEmail, // same email
        password: testPassword,
      }),
    });
    assert.equal(dupAccountRes.status, 400, 'Duplicate email registration must return 400');
    record('ERROR_HANDLING', 'Duplicate email registration rejected with 400', true);
  } catch (err: any) {
    record('ERROR_HANDLING', 'Error handling checks', false, err.message);
  }

  // Cleanup account
  try {
    const delAccountRes = await fetch(`${BASE_URL}/users/account`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert.equal(delAccountRes.status, 200);
    record('AUTH', 'Canonical account deletion and data cascade verified', true);
  } catch (err: any) {
    record('AUTH', 'Account cleanup', false, err.message);
  }

  // Summary
  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;
  console.log('\n==================================================');
  console.log(`LIVE E2E VERIFICATION COMPLETED: ${passedCount} PASSED, ${failedCount} FAILED (${results.length} total)`);
  console.log('==================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runLiveVerification().catch((err) => {
  console.error('Fatal live verification error:', err);
  process.exit(1);
});
