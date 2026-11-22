import { pool, checkDatabaseConnection } from '../config/db.js';
import { createApp } from '../app.js';
import { signToken } from '../utils/token.js';
import { UserModel } from '../models/userModel.js';
import { GroupModel } from '../models/groupModel.js';
import { AssignmentModel } from '../models/assignmentModel.js';
import { SubmissionModel } from '../models/submissionModel.js';
import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, '../../../client');
const serverDir = path.resolve(__dirname, '../../');

async function runPhase5Tests() {
  console.log('====================================================');
  console.log('JOINEAZY PHASE 5 AUTOMATED INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  const results = {};

  const dbCheck = await checkDatabaseConnection();
  if (!dbCheck.connected) {
    console.error('Database connection failed. Tests blocked.');
    return { blocked: true };
  }

  // Factory helpers
  async function createTestStudent(prefix) {
    const email = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}@test.edu`;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('TestPass123!', salt);
    const user = await UserModel.createStudent({
      full_name: `Student ${prefix}`,
      email,
      password_hash: hash,
    });
    const token = signToken(user);
    return { user, token };
  }

  async function createTestAdmin(prefix = 'prof') {
    const email = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}@test.edu`;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('AdminPass123!', salt);
    const { user } = await UserModel.createOrUpdateAdmin({
      full_name: `Prof. ${prefix}`,
      email,
      password_hash: hash,
    });
    const token = signToken(user);
    return { user, token };
  }

  // Start ephemeral server
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    // Setup initial fixtures
    const admin = await createTestAdmin('p5admin');
    const s1 = await createTestStudent('s1');
    const s2 = await createTestStudent('s2');
    const s3 = await createTestStudent('s3');
    const s4 = await createTestStudent('s4');
    const ungrouped = await createTestStudent('ungrouped');
    const outsider = await createTestStudent('outsider');

    // Create 4-member Group A: s1 (creator), s2, s3, s4
    const gA = await GroupModel.createGroupWithCreator({ name: 'Group Alpha P5', creatorId: s1.user.id });
    // Add s2, s3, s4 as members
    await pool.query(
      'INSERT INTO group_members (group_id, student_id) VALUES ($1, $2), ($1, $3), ($1, $4);',
      [gA.id, s2.user.id, s3.user.id, s4.user.id]
    );

    // Create Group B for outsider
    const gB = await GroupModel.createGroupWithCreator({ name: 'Group Beta P5', creatorId: outsider.user.id });

    // Assignment 1: Targeted to Group A (due in future)
    const assignTargeted = await AssignmentModel.createAssignment({
      professorId: admin.user.id,
      title: 'Phase 5 Group A Assignment',
      description: 'Only Group A members can confirm',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      onedriveLink: 'https://1drv.ms/u/s!groupATarget',
      scope: 'SPECIFIC_GROUPS',
      groupIds: [gA.id],
    });

    // Assignment 2: Open to ALL (due in future)
    const assignAll = await AssignmentModel.createAssignment({
      professorId: admin.user.id,
      title: 'Phase 5 Coursewide Assignment',
      description: 'All students can confirm',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      onedriveLink: 'https://1drv.ms/u/s!coursewide',
      scope: 'ALL',
    });

    // Assignment 3: Past Due (due 2 days ago) to test Late confirmations
    const assignLate = await AssignmentModel.createAssignment({
      professorId: admin.user.id,
      title: 'Phase 5 Past Deadline Assignment',
      description: 'Confirmations here will be marked late',
      dueDate: new Date(Date.now() - 172800000).toISOString(),
      onedriveLink: 'https://1drv.ms/u/s!pastDue',
      scope: 'ALL',
    });

    // 01. Unauthenticated confirmation rejected (401)
    console.log('[TEST 01] Unauthenticated confirmation rejected...');
    const unauthConf = await fetch(`${baseUrl}/assignments/${assignTargeted.id}/confirm`, {
      method: 'POST',
    });
    results['01. Unauthenticated Confirmation Rejected'] = unauthConf.status === 401 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 01: ${results['01. Unauthenticated Confirmation Rejected']}`);

    // 02. Admin cannot perform student confirmation (403)
    console.log('\n[TEST 02] Admin cannot perform student confirmation...');
    const adminConf = await fetch(`${baseUrl}/assignments/${assignTargeted.id}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    results['02. Admin Confirmation Rejected (403)'] = adminConf.status === 403 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 02: ${results['02. Admin Confirmation Rejected (403)']}`);

    // 03. Invalid assignment ID rejected (400)
    console.log('\n[TEST 03] Invalid assignment ID rejected...');
    const invalidId = await fetch(`${baseUrl}/assignments/not-a-uuid/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${s1.token}` },
    });
    results['03. Invalid Assignment ID Rejected'] = invalidId.status === 400 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 03: ${results['03. Invalid Assignment ID Rejected']}`);

    // 04. Nonexistent assignment rejected (404)
    console.log('\n[TEST 04] Nonexistent assignment rejected...');
    const nonExistent = await fetch(`${baseUrl}/assignments/${crypto.randomUUID()}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${s1.token}` },
    });
    results['04. Nonexistent Assignment Rejected'] = nonExistent.status === 404 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 04: ${results['04. Nonexistent Assignment Rejected']}`);

    // 05. Ineligible student confirmation rejected (403)
    console.log('\n[TEST 05] Ineligible student confirmation rejected...');
    const ineligibleConf = await fetch(`${baseUrl}/assignments/${assignTargeted.id}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${outsider.token}` },
    });
    results['05. Ineligible Student Confirmation Rejected'] = ineligibleConf.status === 403 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 05: ${results['05. Ineligible Student Confirmation Rejected']}`);

    // 06. Eligible student can confirm (201)
    console.log('\n[TEST 06] Eligible student can confirm (201)...');
    const s1Conf = await fetch(`${baseUrl}/assignments/${assignTargeted.id}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${s1.token}` },
    });
    const s1ConfData = await s1Conf.json();
    results['06. Eligible Student Can Confirm (201)'] =
      s1Conf.status === 201 && s1ConfData.success && s1ConfData.confirmation ? 'PASS' : 'FAIL';
    console.log(`  ✓ 06: ${results['06. Eligible Student Can Confirm (201)']}`);

    // 07. Confirmation persists in PostgreSQL
    console.log('\n[TEST 07] Confirmation persists in PostgreSQL...');
    const pgCheck = await pool.query(
      'SELECT id, student_id, assignment_id, confirmed_at FROM submission_confirmations WHERE assignment_id = $1 AND student_id = $2;',
      [assignTargeted.id, s1.user.id]
    );
    results['07. Confirmation Persists in PostgreSQL'] =
      pgCheck.rows.length === 1 && pgCheck.rows[0].student_id === s1.user.id ? 'PASS' : 'FAIL';
    console.log(`  ✓ 07: ${results['07. Confirmation Persists in PostgreSQL']}`);

    // 08. Student ID comes from JWT, not request body
    console.log('\n[TEST 08] Student ID comes from JWT, ignoring tampered body...');
    // Attempt to spoof confirmation for s2 using s1's token
    const spoofConf = await fetch(`${baseUrl}/assignments/${assignAll.id}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${s1.token}`,
      },
      body: JSON.stringify({ student_id: s2.user.id }),
    });
    const spoofData = await spoofConf.json();
    results['08. Student ID Enforced from JWT'] =
      spoofConf.status === 201 && spoofData.confirmation?.student_id === s1.user.id ? 'PASS' : 'FAIL';
    console.log(`  ✓ 08: ${results['08. Student ID Enforced from JWT']}`);

    // 09. Confirmation timestamp generated by server
    console.log('\n[TEST 09] Confirmation timestamp generated by server...');
    const serverTimestamp = new Date(s1ConfData.confirmation.confirmed_at).getTime();
    const now = Date.now();
    const timestampAccurate = Math.abs(now - serverTimestamp) < 10000;
    results['09. Server-Generated Timestamp'] = timestampAccurate ? 'PASS' : 'FAIL';
    console.log(`  ✓ 09: ${results['09. Server-Generated Timestamp']}`);

    // 10. Duplicate confirmation prevented (409 Conflict)
    console.log('\n[TEST 10] Duplicate confirmation prevented (409 Conflict)...');
    const dupConf = await fetch(`${baseUrl}/assignments/${assignTargeted.id}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${s1.token}` },
    });
    results['10. Duplicate Confirmation Prevented'] = dupConf.status === 409 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 10: ${results['10. Duplicate Confirmation Prevented']}`);

    // 11. Concurrent duplicate confirmations prevented
    console.log('\n[TEST 11] Concurrent duplicate confirmations prevented...');
    const [c1, c2] = await Promise.all([
      fetch(`${baseUrl}/assignments/${assignTargeted.id}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${s2.token}` },
      }),
      fetch(`${baseUrl}/assignments/${assignTargeted.id}/confirm`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${s2.token}` },
      }),
    ]);
    const statuses = [c1.status, c2.status].sort();
    // One must succeed (201) and one must be rejected (409)
    results['11. Concurrent Duplicate Prevention'] =
      statuses[0] === 201 && statuses[1] === 409 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 11: ${results['11. Concurrent Duplicate Prevention']}`);

    // 12. Student retrieves own submission status
    console.log('\n[TEST 12] Student retrieves own submission status...');
    const statusRes = await fetch(`${baseUrl}/assignments/${assignTargeted.id}/submission`, {
      headers: { Authorization: `Bearer ${s1.token}` },
    });
    const statusData = await statusRes.json();
    results['12. Student Retrieves Submission Status'] =
      statusRes.status === 200 && statusData.submission?.confirmed === true ? 'PASS' : 'FAIL';
    console.log(`  ✓ 12: ${results['12. Student Retrieves Submission Status']}`);

    // 13. Student cannot retrieve unrelated submission data (403 for ineligible assignment)
    console.log('\n[TEST 13] Ineligible student cannot retrieve submission status (403)...');
    const unauthStatus = await fetch(`${baseUrl}/assignments/${assignTargeted.id}/submission`, {
      headers: { Authorization: `Bearer ${outsider.token}` },
    });
    results['13. Ineligible Student Status Blocked (403)'] = unauthStatus.status === 403 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 13: ${results['13. Ineligible Student Status Blocked (403)']}`);

    // 14. Pending status returned before confirmation
    console.log('\n[TEST 14] Pending status returned before confirmation...');
    const pendingStatusRes = await fetch(`${baseUrl}/assignments/${assignTargeted.id}/submission`, {
      headers: { Authorization: `Bearer ${s3.token}` },
    });
    const pendingData = await pendingStatusRes.json();
    results['14. Pending Status Before Confirmation'] =
      pendingStatusRes.status === 200 && pendingData.submission?.confirmed === false && pendingData.submission?.confirmed_at === null
        ? 'PASS'
        : 'FAIL';
    console.log(`  ✓ 14: ${results['14. Pending Status Before Confirmation']}`);

    // 15. Confirmed status returned after confirmation
    console.log('\n[TEST 15] Confirmed status returned after confirmation...');
    await fetch(`${baseUrl}/assignments/${assignTargeted.id}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${s3.token}` },
    });
    const confirmedCheck = await (await fetch(`${baseUrl}/assignments/${assignTargeted.id}/submission`, {
      headers: { Authorization: `Bearer ${s3.token}` },
    })).json();
    results['15. Confirmed Status After Confirmation'] =
      confirmedCheck.submission?.confirmed === true && confirmedCheck.submission?.confirmed_at !== null ? 'PASS' : 'FAIL';
    console.log(`  ✓ 15: ${results['15. Confirmed Status After Confirmation']}`);

    // 16. Confirmation survives simulated server/database query
    console.log('\n[TEST 16] Confirmation persistence survives re-query...');
    const recheckStatus = await SubmissionModel.getSubmissionStatus(assignTargeted.id, s1.user.id);
    results['16. Persistence Across Reconnect'] =
      recheckStatus.confirmed === true && recheckStatus.assignment_id === assignTargeted.id ? 'PASS' : 'FAIL';
    console.log(`  ✓ 16: ${results['16. Persistence Across Reconnect']}`);

    // 17 & 18. Student progress count & completion percentage
    console.log('\n[TEST 17 & 18] Student progress count & percentage...');
    // s1 has confirmed assignTargeted & assignAll (2 assignments)
    const s1Progress = await (await fetch(`${baseUrl}/student/progress`, {
      headers: { Authorization: `Bearer ${s1.token}` },
    })).json();
    results['17. Student Progress Count Accurate'] =
      s1Progress.summary.confirmed_assignments === 2 &&
      s1Progress.summary.total_assignments >= 3 &&
      s1Progress.summary.pending_assignments === s1Progress.summary.total_assignments - 2
        ? 'PASS'
        : 'FAIL';
    results['18. Student Completion Percentage Accurate'] =
      s1Progress.summary.completion_percentage ===
      Math.round((2 / s1Progress.summary.total_assignments) * 100)
        ? 'PASS'
        : 'FAIL';
    console.log(`  ✓ 17: ${results['17. Student Progress Count Accurate']}`);
    console.log(`  ✓ 18: ${results['18. Student Completion Percentage Accurate']}`);

    // 19, 20, 21: Group Progress 0%, 75%, 100%
    console.log('\n[TEST 19, 20, 21] Group progress calculations...');
    // Create new Assignment for Group A only
    const assignProgressTest = await AssignmentModel.createAssignment({
      professorId: admin.user.id,
      title: 'Progress Calibration Assignment',
      description: 'Testing 0%, 75%, 100%',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      onedriveLink: 'https://1drv.ms/u/s!progressTest',
      scope: 'SPECIFIC_GROUPS',
      groupIds: [gA.id],
    });

    // Case 19: 0 confirmed of 4 members -> 0% (NOT_STARTED)
    const tracking0 = await SubmissionModel.getAssignmentSubmissionsAdmin(assignProgressTest.id);
    const gA_0 = tracking0.group_tracking.find((g) => g.group_id === gA.id);
    results['19. Group Progress at 0% Accurate'] =
      gA_0 && gA_0.progress_percentage === 0 && gA_0.status === 'NOT_STARTED' ? 'PASS' : 'FAIL';
    console.log(`  ✓ 19: ${results['19. Group Progress at 0% Accurate']}`);

    // Confirm s1, s2, s3 (3 out of 4 members -> 75% IN_PROGRESS)
    await SubmissionModel.confirmSubmission(assignProgressTest.id, s1.user.id);
    await SubmissionModel.confirmSubmission(assignProgressTest.id, s2.user.id);
    await SubmissionModel.confirmSubmission(assignProgressTest.id, s3.user.id);
    const tracking75 = await SubmissionModel.getAssignmentSubmissionsAdmin(assignProgressTest.id);
    const gA_75 = tracking75.group_tracking.find((g) => g.group_id === gA.id);
    results['20. Group Progress at 75% Accurate'] =
      gA_75 && gA_75.progress_percentage === 75 && gA_75.status === 'IN_PROGRESS' ? 'PASS' : 'FAIL';
    console.log(`  ✓ 20: ${results['20. Group Progress at 75% Accurate']}`);

    // Confirm s4 (4 out of 4 members -> 100% COMPLETED)
    await SubmissionModel.confirmSubmission(assignProgressTest.id, s4.user.id);
    const tracking100 = await SubmissionModel.getAssignmentSubmissionsAdmin(assignProgressTest.id);
    const gA_100 = tracking100.group_tracking.find((g) => g.group_id === gA.id);
    results['21. Group Progress at 100% Accurate'] =
      gA_100 && gA_100.progress_percentage === 100 && gA_100.status === 'COMPLETED' ? 'PASS' : 'FAIL';
    console.log(`  ✓ 21: ${results['21. Group Progress at 100% Accurate']}`);

    // 22. ALL assignment includes ungrouped students in analytics
    console.log('\n[TEST 22] ALL assignment includes ungrouped students...');
    const allTracking = await SubmissionModel.getAssignmentSubmissionsAdmin(assignAll.id);
    const foundUngrouped = allTracking.student_tracking.some((s) => s.student_id === ungrouped.user.id);
    results['22. ALL Assignment Includes Ungrouped'] = foundUngrouped ? 'PASS' : 'FAIL';
    console.log(`  ✓ 22: ${results['22. ALL Assignment Includes Ungrouped']}`);

    // 23. SPECIFIC_GROUPS excludes unrelated students from analytics
    console.log('\n[TEST 23] SPECIFIC_GROUPS excludes unrelated students...');
    const targetedTracking = await SubmissionModel.getAssignmentSubmissionsAdmin(assignTargeted.id);
    const foundOutsider = targetedTracking.student_tracking.some((s) => s.student_id === outsider.user.id);
    const foundUngroupedTarget = targetedTracking.student_tracking.some((s) => s.student_id === ungrouped.user.id);
    results['23. SPECIFIC_GROUPS Excludes Unrelated'] = !foundOutsider && !foundUngroupedTarget ? 'PASS' : 'FAIL';
    console.log(`  ✓ 23: ${results['23. SPECIFIC_GROUPS Excludes Unrelated']}`);

    // 24. Admin analytics totals are accurate
    console.log('\n[TEST 24] Admin analytics totals accurate...');
    const adminAnalyticsRes = await fetch(`${baseUrl}/admin/analytics`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const adminAnalytics = await adminAnalyticsRes.json();
    results['24. Admin Analytics Totals Accurate'] =
      adminAnalyticsRes.status === 200 &&
      adminAnalytics.overview.total_assignments >= 4 &&
      adminAnalytics.overview.total_students >= 6 &&
      adminAnalytics.overview.total_confirmed_pairs > 0
        ? 'PASS'
        : 'FAIL';
    console.log(`  ✓ 24: ${results['24. Admin Analytics Totals Accurate']}`);

    // 25. Admin assignment-wise analytics are accurate
    console.log('\n[TEST 25] Admin assignment-wise analytics accurate...');
    const assignWise = adminAnalytics.assignments.find((a) => a.id === assignProgressTest.id);
    results['25. Assignment-Wise Analytics Accurate'] =
      assignWise && assignWise.eligible_students === 4 && assignWise.confirmed_count === 4 && assignWise.completion_percentage === 100
        ? 'PASS'
        : 'FAIL';
    console.log(`  ✓ 25: ${results['25. Assignment-Wise Analytics Accurate']}`);

    // 26 & 27. Admin group-wise & student-wise tracking API
    console.log('\n[TEST 26 & 27] Admin assignment submissions tracking API...');
    const trackingApiRes = await fetch(`${baseUrl}/admin/assignments/${assignProgressTest.id}/submissions`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    });
    const trackingApiData = await trackingApiRes.json();
    results['26. Admin Group-Wise Tracking Accurate'] =
      trackingApiRes.status === 200 && trackingApiData.group_tracking.length === 1 && trackingApiData.group_tracking[0].progress_percentage === 100
        ? 'PASS'
        : 'FAIL';
    results['27. Admin Student-Wise Tracking Accurate'] =
      trackingApiData.student_tracking.length === 4 && trackingApiData.student_tracking.every((s) => s.confirmed)
        ? 'PASS'
        : 'FAIL';
    console.log(`  ✓ 26: ${results['26. Admin Group-Wise Tracking Accurate']}`);
    console.log(`  ✓ 27: ${results['27. Admin Student-Wise Tracking Accurate']}`);

    // 28. Missing confirmations count as pending
    console.log('\n[TEST 28] Missing confirmations count as pending...');
    const targetedSub = await (await fetch(`${baseUrl}/admin/assignments/${assignTargeted.id}/submissions`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    })).json();
    // In assignTargeted, s1, s2, s3 confirmed; s4 did not confirm -> 1 pending
    results['28. Missing Confirmations Count As Pending'] =
      targetedSub.overall.pending_count === 1 && targetedSub.overall.confirmed_count === 3 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 28: ${results['28. Missing Confirmations Count As Pending']}`);

    // 29. Late confirmation classification works
    console.log('\n[TEST 29] Late confirmation classification...');
    // s1 confirms assignLate (due date was 2 days ago)
    const lateConfRes = await fetch(`${baseUrl}/assignments/${assignLate.id}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${s1.token}` },
    });
    const lateConfData = await lateConfRes.json();
    results['29. Late Confirmation Classification'] =
      lateConfRes.status === 201 && lateConfData.confirmation.is_late === true ? 'PASS' : 'FAIL';
    console.log(`  ✓ 29: ${results['29. Late Confirmation Classification']}`);

    // 30. Scope changes do not corrupt analytics
    console.log('\n[TEST 30] Scope changes exclude obsolete confirmations...');
    // Create assignment targeting Group A
    const assignScopeTest = await AssignmentModel.createAssignment({
      professorId: admin.user.id,
      title: 'Scope Retargeting Test',
      description: 'Will be retargeted to Group B',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      onedriveLink: 'https://1drv.ms/u/s!scopeChange',
      scope: 'SPECIFIC_GROUPS',
      groupIds: [gA.id],
    });
    // s1 (Group A) confirms
    await SubmissionModel.confirmSubmission(assignScopeTest.id, s1.user.id);
    // Professor retargets assignment to Group B instead of Group A
    await AssignmentModel.updateAssignment({
      assignmentId: assignScopeTest.id,
      editorId: admin.user.id,
      title: 'Scope Retargeting Test (Updated)',
      description: 'Retargeted to Group B',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      onedriveLink: 'https://1drv.ms/u/s!scopeChange',
      scope: 'SPECIFIC_GROUPS',
      groupIds: [gB.id],
    });
    // Now analytics for this assignment should reflect Group B (outsider only) and NOT count s1's confirmation
    const retargetAnalytics = await SubmissionModel.getAssignmentSubmissionsAdmin(assignScopeTest.id);
    results['30. Scope Change Excludes Stale Confirmations'] =
      retargetAnalytics.overall.eligible_count === 1 &&
      retargetAnalytics.overall.confirmed_count === 0 &&
      retargetAnalytics.student_tracking[0].student_id === outsider.user.id
        ? 'PASS'
        : 'FAIL';
    console.log(`  ✓ 30: ${results['30. Scope Change Excludes Stale Confirmations']}`);

    // 31. Zero-denominator case handled safely
    console.log('\n[TEST 31] Zero-denominator case handled safely...');
    // Create empty group with 0 members
    const emptyGroupRes = await pool.query(
      'INSERT INTO groups (name, created_by) VALUES ($1, $2) RETURNING id;',
      ['Empty Group P5', admin.user.id]
    );
    const emptyGroupId = emptyGroupRes.rows[0].id;
    const assignZero = await AssignmentModel.createAssignment({
      professorId: admin.user.id,
      title: 'Zero Denominator Test',
      description: 'Targeted to empty group',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      onedriveLink: 'https://1drv.ms/u/s!zero',
      scope: 'SPECIFIC_GROUPS',
      groupIds: [emptyGroupId],
    });
    const zeroTracking = await SubmissionModel.getAssignmentSubmissionsAdmin(assignZero.id);
    results['31. Zero-Denominator Handled Safely'] =
      zeroTracking.overall.eligible_count === 0 &&
      zeroTracking.overall.completion_percentage === 0 &&
      zeroTracking.group_tracking[0].progress_percentage === 0
        ? 'PASS'
        : 'FAIL';
    console.log(`  ✓ 31: ${results['31. Zero-Denominator Handled Safely']}`);

    // 32. Student cannot access Admin analytics (403)
    console.log('\n[TEST 32] Student cannot access Admin analytics...');
    const studentBlocked = await fetch(`${baseUrl}/admin/analytics`, {
      headers: { Authorization: `Bearer ${s1.token}` },
    });
    results['32. Student Access Denied to Admin Analytics'] = studentBlocked.status === 403 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 32: ${results['32. Student Access Denied to Admin Analytics']}`);

    // 33. Confirmation write without CSRF rejected (403 when cookie authenticated)
    console.log('\n[TEST 33] Cookie-authenticated confirmation without CSRF rejected...');
    const csrfRes = await fetch(`${baseUrl}/auth/csrf-token`);
    const { csrfToken } = await csrfRes.json();
    const cookieHeader = `token=${s4.token}; XSRF-TOKEN=${csrfToken}`;
    const blockedCsrf = await fetch(`${baseUrl}/assignments/${assignAll.id}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        // Intentionally omit X-CSRF-Token header
      },
    });
    results['33. Cookie Write Without CSRF Blocked'] = blockedCsrf.status === 403 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 33: ${results['33. Cookie Write Without CSRF Blocked']}`);

    // 34. Valid cookie/CSRF confirmation succeeds
    console.log('\n[TEST 34] Valid cookie & CSRF confirmation succeeds...');
    const validCsrf = await fetch(`${baseUrl}/assignments/${assignAll.id}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        'X-CSRF-Token': csrfToken,
      },
    });
    results['34. Valid Cookie and CSRF Confirmation Succeeds'] = validCsrf.status === 201 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 34: ${results['34. Valid Cookie and CSRF Confirmation Succeeds']}`);

    // 35. No secrets or password hashes leak in analytics responses
    console.log('\n[TEST 35] No secrets or password hashes leak in analytics responses...');
    const analyticsPayload = await (await fetch(`${baseUrl}/admin/assignments/${assignProgressTest.id}/submissions`, {
      headers: { Authorization: `Bearer ${admin.token}` },
    })).text();
    const leaksSecret = analyticsPayload.includes('password_hash') || analyticsPayload.includes('$2a$');
    results['35. Zero Secret/Hash Leakage'] = !leaksSecret ? 'PASS' : 'FAIL';
    console.log(`  ✓ 35: ${results['35. Zero Secret/Hash Leakage']}`);

    // 36. Existing assignment retrieval still works
    console.log('\n[TEST 36] Existing assignment retrieval still works...');
    const assignList = await fetch(`${baseUrl}/assignments`, {
      headers: { Authorization: `Bearer ${s1.token}` },
    });
    results['36. Existing Assignment Retrieval Works'] = assignList.status === 200 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 36: ${results['36. Existing Assignment Retrieval Works']}`);

    // 37. Frontend production build succeeds
    console.log('\n[TEST 37] Frontend production compilation...');
    try {
      execSync('npm run build', { cwd: clientDir, stdio: 'pipe' });
      results['37. Frontend Production Build'] = 'PASS';
      console.log('  ✓ 37: PASS');
    } catch (e) {
      console.error('Build failed:', e.message);
      results['37. Frontend Production Build'] = 'FAIL';
    }

    // 38. Phase 2 Regression tests pass
    console.log('\n[TEST 38] Phase 2 Regression check...');
    try {
      execSync('node src/scripts/verifyPhase2.js', { cwd: serverDir, stdio: 'pipe' });
      results['38. Phase 2 Regression Tests'] = 'PASS';
      console.log('  ✓ 38: PASS');
    } catch {
      results['38. Phase 2 Regression Tests'] = 'FAIL';
    }

    // 39. Phase 3 Regression tests pass
    console.log('\n[TEST 39] Phase 3 Regression check...');
    try {
      execSync('node src/scripts/verifyPhase3.js', { cwd: serverDir, stdio: 'pipe' });
      results['39. Phase 3 Regression Tests'] = 'PASS';
      console.log('  ✓ 39: PASS');
    } catch {
      results['39. Phase 3 Regression Tests'] = 'FAIL';
    }

    // 40. Phase 4 Regression tests pass
    console.log('\n[TEST 40] Phase 4 Regression check...');
    try {
      execSync('node src/scripts/verifyPhase4.js', { cwd: serverDir, stdio: 'pipe' });
      results['40. Phase 4 Regression Tests'] = 'PASS';
      console.log('  ✓ 40: PASS');
    } catch {
      results['40. Phase 4 Regression Tests'] = 'FAIL';
    }
  } finally {
    server.close();
    await pool.end();
  }

  console.log('\n====================================================');
  console.log('PHASE 5 ALL 40 SCENARIO TEST RESULTS');
  console.log('====================================================');
  console.log(JSON.stringify(results, null, 2));

  const failedTests = Object.entries(results).filter(([, status]) => status !== 'PASS');
  if (failedTests.length > 0) {
    console.error(`\nFailed tests (${failedTests.length}):`, failedTests);
    process.exit(1);
  } else {
    console.log('\nALL 40 PHASE 5 TESTS PASSED SUCCESSFULLY!');
  }
}

runPhase5Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
