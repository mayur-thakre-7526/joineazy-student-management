import { pool, checkDatabaseConnection } from '../config/db.js';
import { createApp } from '../app.js';
import { signToken } from '../utils/token.js';
import { UserModel } from '../models/userModel.js';
import bcrypt from 'bcryptjs';

async function runE2EWorkflow() {
  console.log('====================================================');
  console.log('JOINEAZY FULL USER WORKFLOW VERIFICATION (STUDENT & PROFESSOR)');
  console.log('====================================================\n');

  const conn = await checkDatabaseConnection();
  if (!conn.connected) {
    console.error('Database connection unavailable:', conn.message);
    process.exit(1);
  }

  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const results = {};

  try {
    // ----------------------------------------------------
    // STUDENT FLOW
    // ----------------------------------------------------
    console.log('--- EXECUTING STUDENT FLOW ---');
    const timestamp = Date.now();
    const student1Email = `flow_s1_${timestamp}@univ.edu`;
    const student2Email = `flow_s2_${timestamp}@univ.edu`;
    const password = 'StrongPassword123!';

    // 1. Register student 1
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Flow Student One',
        email: student1Email,
        password,
      }),
    });
    const regData = await regRes.json();
    results['Student 1 Register'] = regRes.status === 201 && regData.user ? 'PASS' : 'FAIL';
    console.log(`1. Register Student 1: ${results['Student 1 Register']}`);

    // 2. Login student 1
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: student1Email, password }),
    });
    const loginData = await loginRes.json();
    const s1Token = loginData.token;
    results['Student 1 Login'] = loginRes.status === 200 && s1Token ? 'PASS' : 'FAIL';
    console.log(`2. Login Student 1: ${results['Student 1 Login']}`);

    // 3. Open dashboard (progress)
    const dashRes = await fetch(`${baseUrl}/student/progress`, {
      headers: { Authorization: `Bearer ${s1Token}` },
    });
    results['Student 1 Open Dashboard'] = dashRes.status === 200 ? 'PASS' : 'FAIL';
    console.log(`3. Student 1 Dashboard: ${results['Student 1 Open Dashboard']}`);

    // 4. Create group
    const groupRes = await fetch(`${baseUrl}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${s1Token}`,
      },
      body: JSON.stringify({ name: `Flow Team ${timestamp}` }),
    });
    const groupData = await groupRes.json();
    const groupId = groupData.group?.id;
    results['Create Group'] = groupRes.status === 201 && groupId ? 'PASS' : 'FAIL';
    console.log(`4. Create Group: ${results['Create Group']}`);

    // 5. Register Student 2 & Invite Student 2
    await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Flow Student Two',
        email: student2Email,
        password,
      }),
    });
    const inviteRes = await fetch(`${baseUrl}/groups/${groupId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${s1Token}`,
      },
      body: JSON.stringify({ email: student2Email }),
    });
    const inviteData = await inviteRes.json();
    const inviteId = inviteData.invitation?.id;
    results['Invite Student 2'] = inviteRes.status === 201 && inviteId ? 'PASS' : 'FAIL';
    console.log(`5. Invite Student 2: ${results['Invite Student 2']}`);

    // 6. Login as Student 2
    const s2LoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: student2Email, password }),
    });
    const s2LoginData = await s2LoginRes.json();
    const s2Token = s2LoginData.token;
    results['Student 2 Login'] = s2LoginRes.status === 200 && s2Token ? 'PASS' : 'FAIL';
    console.log(`6. Student 2 Login: ${results['Student 2 Login']}`);

    // 7. Accept invitation
    const acceptRes = await fetch(`${baseUrl}/invitations/${inviteId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${s2Token}`,
      },
      body: JSON.stringify({ action: 'ACCEPT' }),
    });
    results['Accept Invitation'] = acceptRes.status === 200 ? 'PASS' : 'FAIL';
    console.log(`7. Accept Invitation: ${results['Accept Invitation']}`);

    // 8. Confirm group roster updates
    const rosterRes = await fetch(`${baseUrl}/groups/${groupId}`, {
      headers: { Authorization: `Bearer ${s1Token}` },
    });
    const rosterData = await rosterRes.json();
    results['Group Roster Updates'] =
      rosterRes.status === 200 && rosterData.group?.members?.length === 2 ? 'PASS' : 'FAIL';
    console.log(`8. Group Roster (2 members): ${results['Group Roster Updates']}`);

    // ----------------------------------------------------
    // PROFESSOR FLOW
    // ----------------------------------------------------
    console.log('\n--- EXECUTING PROFESSOR FLOW ---');
    const adminEmail = `prof_flow_${timestamp}@univ.edu`;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('AdminSecret123!', salt);
    const { user: adminUser } = await UserModel.createOrUpdateAdmin({
      full_name: 'Professor Flow',
      email: adminEmail,
      password_hash: hash,
    });
    const adminToken = signToken(adminUser);

    // 1 & 2. Login as Admin & Open Dashboard
    const adminDashRes = await fetch(`${baseUrl}/admin/analytics`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    results['Admin Analytics Dashboard'] = adminDashRes.status === 200 ? 'PASS' : 'FAIL';
    console.log(`1-2. Admin Dashboard: ${results['Admin Analytics Dashboard']}`);

    // 3. Create ALL assignment
    const allAssignRes = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'E2E Coursewide Term Project',
        description: 'Open to all registered learners',
        due_date: new Date(Date.now() + 86400000).toISOString(),
        onedrive_link: 'https://1drv.ms/u/s!coursewideTermProject',
        scope: 'ALL',
      }),
    });
    const allAssignData = await allAssignRes.json();
    const allAssignId = allAssignData.assignment?.id;
    results['Create ALL Assignment'] = allAssignRes.status === 201 && allAssignId ? 'PASS' : 'FAIL';
    console.log(`3. Create ALL Assignment: ${results['Create ALL Assignment']}`);

    // 4 & 5. Create SPECIFIC_GROUPS assignment targeting Flow Team
    const targetAssignRes = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'E2E Targeted Sprint',
        description: 'Exclusively for Flow Team',
        due_date: new Date(Date.now() + 86400000).toISOString(),
        onedrive_link: 'https://1drv.ms/u/s!targetedSprint',
        scope: 'SPECIFIC_GROUPS',
        group_ids: [groupId],
      }),
    });
    const targetAssignData = await targetAssignRes.json();
    const targetAssignId = targetAssignData.assignment?.id;
    results['Create SPECIFIC_GROUPS Assignment'] = targetAssignRes.status === 201 && targetAssignId ? 'PASS' : 'FAIL';
    console.log(`4-5. Create SPECIFIC_GROUPS Assignment: ${results['Create SPECIFIC_GROUPS Assignment']}`);

    // 6. Student 1 views eligible assignments
    const s1ListRes = await fetch(`${baseUrl}/assignments`, {
      headers: { Authorization: `Bearer ${s1Token}` },
    });
    const s1ListData = await s1ListRes.json();
    const seesBoth = s1ListData.assignments?.some((a) => a.id === allAssignId) &&
                     s1ListData.assignments?.some((a) => a.id === targetAssignId);
    results['Student Sees Both Assignments'] = seesBoth ? 'PASS' : 'FAIL';
    console.log(`6. Student 1 Sees Eligible Assignments: ${results['Student Sees Both Assignments']}`);

    // 7. Student 1 opens assignment details & verifies OneDrive link
    const detailRes = await fetch(`${baseUrl}/assignments/${targetAssignId}`, {
      headers: { Authorization: `Bearer ${s1Token}` },
    });
    const detailData = await detailRes.json();
    results['Assignment Details & OneDrive Link'] =
      detailRes.status === 200 && detailData.assignment?.onedrive_link.startsWith('https://1drv.ms')
        ? 'PASS'
        : 'FAIL';
    console.log(`7. Assignment Details & OneDrive Link: ${results['Assignment Details & OneDrive Link']}`);

    // 8. Cancel step (verification that unsubmitted state remains unconfirmed)
    const preConfirmStatus = await fetch(`${baseUrl}/assignments/${targetAssignId}/submission`, {
      headers: { Authorization: `Bearer ${s1Token}` },
    });
    const preConfirmData = await preConfirmStatus.json();
    results['Pre-Confirmation Status False'] = preConfirmData.submission?.confirmed === false ? 'PASS' : 'FAIL';
    console.log(`8. Pre-Confirmation Status (Unconfirmed): ${results['Pre-Confirmation Status False']}`);

    // 9. Confirm Submission
    const confirmRes = await fetch(`${baseUrl}/assignments/${targetAssignId}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${s1Token}` },
    });
    const confirmData = await confirmRes.json();
    results['Confirm Submission (201)'] = confirmRes.status === 201 && confirmData.success ? 'PASS' : 'FAIL';
    console.log(`9. Confirm Submission (201): ${results['Confirm Submission (201)']}`);

    // 10. Refresh & verify persistence
    const recheckRes = await fetch(`${baseUrl}/assignments/${targetAssignId}/submission`, {
      headers: { Authorization: `Bearer ${s1Token}` },
    });
    const recheckData = await recheckRes.json();
    results['Confirmation Persists'] =
      recheckRes.status === 200 && recheckData.submission?.confirmed === true ? 'PASS' : 'FAIL';
    console.log(`10. Confirmation Persists: ${results['Confirmation Persists']}`);

    // 11. Student 1 checks group progress updates (1 of 2 members confirmed -> 50%)
    const s1ProgCheck = await (await fetch(`${baseUrl}/student/progress`, {
      headers: { Authorization: `Bearer ${s1Token}` },
    })).json();
    const teamAssignProg = s1ProgCheck.group?.assignments_progress.find((ga) => ga.assignment_id === targetAssignId);
    results['Group Progress 50% (IN_PROGRESS)'] =
      teamAssignProg && teamAssignProg.progress_percentage === 50 && teamAssignProg.status === 'IN_PROGRESS'
        ? 'PASS'
        : 'FAIL';
    console.log(`11. Group Progress 50%: ${results['Group Progress 50% (IN_PROGRESS)']}`);

    // 12. Professor inspects group-wise and student-wise submissions tracking
    const trackRes = await fetch(`${baseUrl}/admin/assignments/${targetAssignId}/submissions`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const trackData = await trackRes.json();
    const gRow = trackData.group_tracking.find((g) => g.group_id === groupId);
    const s1Row = trackData.student_tracking.find((s) => s.student_id === loginData.user.id);
    const s2Row = trackData.student_tracking.find((s) => s.student_id === s2LoginData.user.id);

    results['Admin Group-Wise Tracking'] = gRow && gRow.confirmed_count === 1 && gRow.pending_count === 1 ? 'PASS' : 'FAIL';
    results['Admin Student-Wise Tracking'] = s1Row?.confirmed && !s2Row?.confirmed ? 'PASS' : 'FAIL';
    console.log(`12. Admin Group Tracking: ${results['Admin Group-Wise Tracking']}`);
    console.log(`12. Admin Student Tracking: ${results['Admin Student-Wise Tracking']}`);

    // 13. Professor edits assignment (retargets to empty array or ALL)
    const editRes = await fetch(`${baseUrl}/assignments/${targetAssignId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        title: 'E2E Targeted Sprint (Expanded to All)',
        description: 'Now open to all students',
        due_date: new Date(Date.now() + 86400000).toISOString(),
        onedrive_link: 'https://1drv.ms/u/s!targetedSprint',
        scope: 'ALL',
      }),
    });
    results['Admin Edit Assignment'] = editRes.status === 200 ? 'PASS' : 'FAIL';
    console.log(`13. Admin Edit Assignment: ${results['Admin Edit Assignment']}`);
  } finally {
    server.close();
    await pool.end();
  }

  console.log('\n====================================================');
  console.log('E2E WORKFLOW TEST SUMMARY:');
  console.log('====================================================');
  console.log(JSON.stringify(results, null, 2));

  const allPassed = Object.values(results).every((r) => r === 'PASS');
  if (allPassed) {
    console.log('\nALL END-TO-END FLOW SCENARIOS PASSED WITH 100% SUCCESS!');
  } else {
    console.error('\nSome E2E flow scenarios failed.');
    process.exit(1);
  }
}

runE2EWorkflow().catch((err) => {
  console.error('Fatal error during E2E flow:', err);
  process.exit(1);
});
