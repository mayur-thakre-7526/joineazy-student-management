import { pool, checkDatabaseConnection } from '../config/db.js';
import { createApp } from '../app.js';
import { signToken } from '../utils/token.js';
import { UserModel } from '../models/userModel.js';
import { GroupModel } from '../models/groupModel.js';
import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, '../../../client');

async function runPhase4Tests() {
  console.log('====================================================');
  console.log('JOINEAZY PHASE 4 AUTOMATED INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  const results = {};

  const dbCheck = await checkDatabaseConnection();
  if (!dbCheck.connected) {
    console.error('Database connection failed. Tests blocked.');
    return { blocked: true };
  }

  // Actor factory
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

  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    // -------------------------------------------------------------------------
    // SETUP ACTORS & TEAMS
    // -------------------------------------------------------------------------
    const admin1 = await createTestAdmin('AlphaProf');
    const admin2 = await createTestAdmin('BetaProf');
    const student1 = await createTestStudent('GroupedA');
    const student2 = await createTestStudent('GroupedB');
    const student3 = await createTestStudent('Ungrouped');

    // Create Group 1 (student1 leader)
    const g1 = await GroupModel.createGroupWithCreator({
      name: `Target Group 1 ${Date.now()}`,
      creatorId: student1.user.id,
    });
    // Create Group 2 (student2 leader)
    const g2 = await GroupModel.createGroupWithCreator({
      name: `Target Group 2 ${Date.now()}`,
      creatorId: student2.user.id,
    });

    let allAssignmentId = null;
    let specificAssignmentId = null;

    // 13. Unauthenticated user cannot create assignment (401)
    console.log('[TEST 13] Unauthenticated user cannot create assignment...');
    const unauthCreate = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Unauth Task',
        description: 'Should fail',
        due_date: '2026-12-01T12:00:00Z',
        onedrive_link: 'https://1drv.ms/u/s!sample',
        scope: 'ALL',
      }),
    });
    if (unauthCreate.status === 401) {
      console.log('  ✓ PASS: Unauthenticated creation blocked with HTTP 401.');
      results['13. Unauthenticated Create Blocked'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', unauthCreate.status);
      results['13. Unauthenticated Create Blocked'] = 'FAIL';
    }

    // 12. Student cannot create assignment (403)
    console.log('\n[TEST 12] Student cannot create assignment (403)...');
    const studentCreate = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${student1.token}`,
      },
      body: JSON.stringify({
        title: 'Student Assignment',
        description: 'Should be forbidden',
        due_date: '2026-12-01T12:00:00Z',
        onedrive_link: 'https://1drv.ms/u/s!sample',
        scope: 'ALL',
      }),
    });
    if (studentCreate.status === 403) {
      console.log('  ✓ PASS: Student creation blocked with HTTP 403 Forbidden.');
      results['12. Student Cannot Create Assignment (403)'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', studentCreate.status);
      results['12. Student Cannot Create Assignment (403)'] = 'FAIL';
    }

    // 8. Missing title rejected (400)
    console.log('\n[TEST 8] Missing title rejected...');
    const missingTitle = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin1.token}`,
      },
      body: JSON.stringify({
        description: 'Description only',
        due_date: '2026-12-01T12:00:00Z',
        onedrive_link: 'https://1drv.ms/u/s!sample',
        scope: 'ALL',
      }),
    });
    results['8. Missing Title Rejected'] = missingTitle.status === 400 ? 'PASS' : 'FAIL';
    console.log(`  ✓ Status: ${results['8. Missing Title Rejected']}`);

    // 9. Missing description rejected (400)
    console.log('\n[TEST 9] Missing description rejected...');
    const missingDesc = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin1.token}`,
      },
      body: JSON.stringify({
        title: 'Title only',
        due_date: '2026-12-01T12:00:00Z',
        onedrive_link: 'https://1drv.ms/u/s!sample',
        scope: 'ALL',
      }),
    });
    results['9. Missing Description Rejected'] = missingDesc.status === 400 ? 'PASS' : 'FAIL';
    console.log(`  ✓ Status: ${results['9. Missing Description Rejected']}`);

    // 6. Invalid due date rejected (400)
    console.log('\n[TEST 6] Invalid due date rejected...');
    const invalidDate = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin1.token}`,
      },
      body: JSON.stringify({
        title: 'Bad Date',
        description: 'Testing date parsing',
        due_date: 'not-a-valid-date-string',
        onedrive_link: 'https://1drv.ms/u/s!sample',
        scope: 'ALL',
      }),
    });
    results['6. Invalid Due Date Rejected'] = invalidDate.status === 400 ? 'PASS' : 'FAIL';
    console.log(`  ✓ Status: ${results['6. Invalid Due Date Rejected']}`);

    // 7. Invalid OneDrive URL rejected (400)
    console.log('\n[TEST 7] Invalid OneDrive URL rejected...');
    const invalidUrl = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin1.token}`,
      },
      body: JSON.stringify({
        title: 'Bad Link',
        description: 'Testing url parsing',
        due_date: '2026-12-01T12:00:00Z',
        onedrive_link: 'javascript:alert(1)', // Unsafe scheme
        scope: 'ALL',
      }),
    });
    results['7. Invalid OneDrive URL Rejected'] = invalidUrl.status === 400 ? 'PASS' : 'FAIL';
    console.log(`  ✓ Status: ${results['7. Invalid OneDrive URL Rejected']}`);

    // 10. Invalid assignment scope rejected (400)
    console.log('\n[TEST 10] Invalid assignment scope rejected...');
    const invalidScope = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin1.token}`,
      },
      body: JSON.stringify({
        title: 'Bad Scope',
        description: 'Testing scope',
        due_date: '2026-12-01T12:00:00Z',
        onedrive_link: 'https://1drv.ms/u/s!sample',
        scope: 'UNKNOWN_SCOPE',
      }),
    });
    results['10. Invalid Scope Rejected'] = invalidScope.status === 400 ? 'PASS' : 'FAIL';
    console.log(`  ✓ Status: ${results['10. Invalid Scope Rejected']}`);

    // 11. SPECIFIC_GROUPS without group IDs rejected (400)
    console.log('\n[TEST 11] SPECIFIC_GROUPS without group IDs rejected...');
    const emptyGroups = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin1.token}`,
      },
      body: JSON.stringify({
        title: 'Empty Targets',
        description: 'Testing specific groups constraint',
        due_date: '2026-12-01T12:00:00Z',
        onedrive_link: 'https://1drv.ms/u/s!sample',
        scope: 'SPECIFIC_GROUPS',
        group_ids: [],
      }),
    });
    results['11. SPECIFIC_GROUPS Empty Target Rejected'] = emptyGroups.status === 400 ? 'PASS' : 'FAIL';
    console.log(`  ✓ Status: ${results['11. SPECIFIC_GROUPS Empty Target Rejected']}`);

    // 5. Nonexistent group IDs rejected (400)
    console.log('\n[TEST 5] Nonexistent group IDs rejected...');
    const nonexistentGroup = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin1.token}`,
      },
      body: JSON.stringify({
        title: 'Fake Group Target',
        description: 'Testing non-existent UUID target',
        due_date: '2026-12-01T12:00:00Z',
        onedrive_link: 'https://1drv.ms/u/s!sample',
        scope: 'SPECIFIC_GROUPS',
        group_ids: ['a0000000-0000-0000-0000-000000000000'],
      }),
    });
    results['5. Nonexistent Group ID Rejected'] = nonexistentGroup.status === 400 ? 'PASS' : 'FAIL';
    console.log(`  ✓ Status: ${results['5. Nonexistent Group ID Rejected']}`);

    // 1. Admin creates ALL assignment
    console.log('\n[TEST 1 & 3] Admin creates ALL assignment & persists in PostgreSQL...');
    const createAllRes = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin1.token}`,
      },
      body: JSON.stringify({
        title: 'Coursewide Final Project',
        description: 'Comprehensive assignment for all students.',
        due_date: '2026-12-20T23:59:59Z',
        onedrive_link: 'https://university-my.sharepoint.com/:f:/g/personal/prof_share',
        scope: 'ALL',
      }),
    });
    const createAllData = await createAllRes.json();
    if (createAllRes.status === 201 && createAllData.assignment?.id) {
      allAssignmentId = createAllData.assignment.id;
      results['1. Admin Creates ALL Assignment'] = 'PASS';
    } else {
      results['1. Admin Creates ALL Assignment'] = 'FAIL';
    }

    // 3. Assignment persists in PostgreSQL
    const dbCheckAll = await pool.query('SELECT id, scope FROM assignments WHERE id = $1', [allAssignmentId]);
    results['3. Assignment Persists in PostgreSQL'] = dbCheckAll.rows.length === 1 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 1 & 3: ${results['1. Admin Creates ALL Assignment']} | ${results['3. Assignment Persists in PostgreSQL']}`);

    // 2 & 4 & 26. Admin creates SPECIFIC_GROUPS assignment (with duplicate ID deduping)
    console.log('\n[TEST 2, 4, 26] Admin creates SPECIFIC_GROUPS assignment & persists mappings...');
    const createSpecificRes = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin1.token}`,
      },
      body: JSON.stringify({
        title: 'Group 1 Target Assignment',
        description: 'Exclusively assigned to Group 1.',
        due_date: '2026-12-15T18:00:00Z',
        onedrive_link: 'https://1drv.ms/u/s!group1dropbox',
        scope: 'SPECIFIC_GROUPS',
        group_ids: [g1.id, g1.id], // duplicate test
      }),
    });
    const createSpecificData = await createSpecificRes.json();
    if (createSpecificRes.status === 201 && createSpecificData.assignment?.id) {
      specificAssignmentId = createSpecificData.assignment.id;
      results['2. Admin Creates SPECIFIC_GROUPS Assignment'] = 'PASS';
    } else {
      results['2. Admin Creates SPECIFIC_GROUPS Assignment'] = 'FAIL';
    }

    // 4 & 26. Check mappings in assignment_groups
    const mappingCheck = await pool.query(
      'SELECT group_id FROM assignment_groups WHERE assignment_id = $1;',
      [specificAssignmentId]
    );
    const mappingSuccess = mappingCheck.rows.length === 1 && mappingCheck.rows[0].group_id === g1.id;
    results['4. Group Mappings Persist'] = mappingSuccess ? 'PASS' : 'FAIL';
    results['26. Deduplicate Group Targets'] = mappingCheck.rows.length === 1 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 2, 4, 26: ${results['2. Admin Creates SPECIFIC_GROUPS Assignment']} | ${results['4. Group Mappings Persist']}`);

    // 14. ALL assignment visible to grouped student
    console.log('\n[TEST 14 & 15] ALL assignment visibility for grouped and ungrouped students...');
    const groupedList = await fetch(`${baseUrl}/assignments`, {
      headers: { Authorization: `Bearer ${student1.token}` },
    });
    const groupedData = await groupedList.json();
    const student1SeesAll = groupedData.assignments?.some((a) => a.id === allAssignmentId);
    results['14. ALL Assignment Visible to Grouped Student'] = student1SeesAll ? 'PASS' : 'FAIL';

    // 15. ALL assignment visible to ungrouped student
    const ungroupedList = await fetch(`${baseUrl}/assignments`, {
      headers: { Authorization: `Bearer ${student3.token}` },
    });
    const ungroupedData = await ungroupedList.json();
    const student3SeesAll = ungroupedData.assignments?.some((a) => a.id === allAssignmentId);
    results['15. ALL Assignment Visible to Ungrouped Student'] = student3SeesAll ? 'PASS' : 'FAIL';
    console.log(`  ✓ 14 & 15: ${results['14. ALL Assignment Visible to Grouped Student']} | ${results['15. ALL Assignment Visible to Ungrouped Student']}`);

    // 16. SPECIFIC_GROUPS assignment visible to assigned group member
    console.log('\n[TEST 16, 17, 18] Target scope assignment visibility checks...');
    const student1SeesSpecific = groupedData.assignments?.some((a) => a.id === specificAssignmentId);
    results['16. Assigned Group Member Sees Targeted Task'] = student1SeesSpecific ? 'PASS' : 'FAIL';

    // 17. SPECIFIC_GROUPS assignment hidden from unrelated group member (Student 2 is in Group 2)
    const student2List = await fetch(`${baseUrl}/assignments`, {
      headers: { Authorization: `Bearer ${student2.token}` },
    });
    const student2Data = await student2List.json();
    const student2SeesSpecific = student2Data.assignments?.some((a) => a.id === specificAssignmentId);
    results['17. Unrelated Group Member Cannot See Targeted Task'] = !student2SeesSpecific ? 'PASS' : 'FAIL';

    // 18. SPECIFIC_GROUPS assignment hidden from ungrouped student (Student 3 has no group)
    const student3SeesSpecific = ungroupedData.assignments?.some((a) => a.id === specificAssignmentId);
    results['18. Ungrouped Student Cannot See Targeted Task'] = !student3SeesSpecific ? 'PASS' : 'FAIL';
    console.log(`  ✓ 16, 17, 18: ${results['16. Assigned Group Member Sees Targeted Task']} | ${results['17. Unrelated Group Member Cannot See Targeted Task']} | ${results['18. Ungrouped Student Cannot See Targeted Task']}`);

    // 19. Unauthorized assignment detail access rejected (403)
    console.log('\n[TEST 19] Unauthorized assignment detail access rejected (403)...');
    const unauthorizedDetail = await fetch(`${baseUrl}/assignments/${specificAssignmentId}`, {
      headers: { Authorization: `Bearer ${student2.token}` }, // Student 2 is not in Group 1
    });
    results['19. Unauthorized Assignment Detail Denied (403)'] = unauthorizedDetail.status === 403 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 19: ${results['19. Unauthorized Assignment Detail Denied (403)']}`);

    // 20. Admin can list all assignments
    console.log('\n[TEST 20 & 21] Admin listing & details...');
    const adminList = await fetch(`${baseUrl}/assignments`, {
      headers: { Authorization: `Bearer ${admin1.token}` },
    });
    const adminListData = await adminList.json();
    results['20. Admin Can List All Assignments'] = adminListData.assignments?.length >= 2 ? 'PASS' : 'FAIL';

    // 21. Admin can view assignment details
    const adminDetail = await fetch(`${baseUrl}/assignments/${specificAssignmentId}`, {
      headers: { Authorization: `Bearer ${admin1.token}` },
    });
    const adminDetailData = await adminDetail.json();
    results['21. Admin Can View Assignment Details'] =
      adminDetail.status === 200 && adminDetailData.assignment?.assigned_groups?.length > 0 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 20 & 21: ${results['20. Admin Can List All Assignments']} | ${results['21. Admin Can View Assignment Details']}`);

    // 22. Assignment editing persists correctly
    console.log('\n[TEST 22] Assignment editing persists correctly...');
    const editRes = await fetch(`${baseUrl}/assignments/${specificAssignmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin1.token}`,
      },
      body: JSON.stringify({
        title: 'Group 1 Target Assignment (Updated)',
        description: 'Updated instructions for Group 1.',
        due_date: '2026-12-16T12:00:00Z',
        onedrive_link: 'https://1drv.ms/u/s!updatedLink',
        scope: 'SPECIFIC_GROUPS',
        group_ids: [g1.id],
      }),
    });
    const editData = await editRes.json();
    results['22. Assignment Editing Persists'] =
      editRes.status === 200 && editData.assignment?.title.includes('(Updated)') ? 'PASS' : 'FAIL';
    console.log(`  ✓ 22: ${results['22. Assignment Editing Persists']}`);

    // 23. Scope change from SPECIFIC_GROUPS to ALL removes old mappings
    console.log('\n[TEST 23] Scope change from SPECIFIC_GROUPS to ALL removes old mappings...');
    const changeToAll = await fetch(`${baseUrl}/assignments/${specificAssignmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin1.token}`,
      },
      body: JSON.stringify({
        title: 'Group 1 Expanded to All',
        description: 'Now open to all students.',
        due_date: '2026-12-16T12:00:00Z',
        onedrive_link: 'https://1drv.ms/u/s!updatedLink',
        scope: 'ALL',
        group_ids: [],
      }),
    });
    const checkClearedMappings = await pool.query(
      'SELECT count(*) FROM assignment_groups WHERE assignment_id = $1;',
      [specificAssignmentId]
    );
    results['23. Scope Change to ALL Clears Mappings'] =
      changeToAll.status === 200 && parseInt(checkClearedMappings.rows[0].count, 10) === 0 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 23: ${results['23. Scope Change to ALL Clears Mappings']}`);

    // 24. Scope change from ALL to SPECIFIC_GROUPS creates mappings
    console.log('\n[TEST 24] Scope change from ALL to SPECIFIC_GROUPS creates mappings...');
    const changeToGroups = await fetch(`${baseUrl}/assignments/${specificAssignmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin1.token}`,
      },
      body: JSON.stringify({
        title: 'Retargeted to Group 2',
        description: 'Assigned to Group 2.',
        due_date: '2026-12-16T12:00:00Z',
        onedrive_link: 'https://1drv.ms/u/s!updatedLink',
        scope: 'SPECIFIC_GROUPS',
        group_ids: [g2.id],
      }),
    });
    const checkNewMappings = await pool.query(
      'SELECT group_id FROM assignment_groups WHERE assignment_id = $1;',
      [specificAssignmentId]
    );
    results['24. Scope Change to SPECIFIC_GROUPS Creates Mappings'] =
      changeToGroups.status === 200 && checkNewMappings.rows[0]?.group_id === g2.id ? 'PASS' : 'FAIL';
    console.log(`  ✓ 24: ${results['24. Scope Change to SPECIFIC_GROUPS Creates Mappings']}`);

    // 25. Failed update transaction rolls back
    console.log('\n[TEST 25] Failed update transaction rolls back...');
    const failUpdate = await fetch(`${baseUrl}/assignments/${specificAssignmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${admin1.token}`,
      },
      body: JSON.stringify({
        title: 'Will Fail',
        description: 'Invalid group test',
        due_date: '2026-12-16T12:00:00Z',
        onedrive_link: 'https://1drv.ms/u/s!updatedLink',
        scope: 'SPECIFIC_GROUPS',
        group_ids: ['a0000000-0000-0000-0000-000000000000'], // Invalid group
      }),
    });
    // Check that previous g2 mapping is still intact
    const intactMapping = await pool.query(
      'SELECT group_id FROM assignment_groups WHERE assignment_id = $1;',
      [specificAssignmentId]
    );
    results['25. Failed Update Transaction Rolls Back'] =
      failUpdate.status === 400 && intactMapping.rows[0]?.group_id === g2.id ? 'PASS' : 'FAIL';
    console.log(`  ✓ 25: ${results['25. Failed Update Transaction Rolls Back']}`);

    // 27. Invalid UUID returns HTTP 400
    console.log('\n[TEST 27] Invalid UUID returns HTTP 400...');
    const invalidUuid = await fetch(`${baseUrl}/assignments/not-a-valid-uuid`, {
      headers: { Authorization: `Bearer ${admin1.token}` },
    });
    results['27. Invalid UUID Returns HTTP 400'] = invalidUuid.status === 400 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 27: ${results['27. Invalid UUID Returns HTTP 400']}`);

    // 28. Nonexistent assignment returns HTTP 404
    console.log('\n[TEST 28] Nonexistent assignment returns HTTP 404...');
    const randomNonexistentId = crypto.randomUUID();
    const notFoundRes = await fetch(`${baseUrl}/assignments/${randomNonexistentId}`, {
      headers: { Authorization: `Bearer ${admin1.token}` },
    });
    results['28. Nonexistent Assignment Returns HTTP 404'] = notFoundRes.status === 404 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 28: ${results['28. Nonexistent Assignment Returns HTTP 404']}`);

    // 29. Student cannot edit assignment (403)
    console.log('\n[TEST 29] Student cannot edit assignment (403)...');
    const studentEdit = await fetch(`${baseUrl}/assignments/${specificAssignmentId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${student1.token}`,
      },
      body: JSON.stringify({
        title: 'Tampered Title',
        description: 'Should fail',
        due_date: '2026-12-16T12:00:00Z',
        onedrive_link: 'https://1drv.ms/u/s!updatedLink',
        scope: 'ALL',
      }),
    });
    results['29. Student Cannot Edit Assignment (403)'] = studentEdit.status === 403 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 29: ${results['29. Student Cannot Edit Assignment (403)']}`);

    // 34. No password hashes, JWTs or secrets leak through assignment responses
    console.log('\n[TEST 34] No secrets or password hashes leak in responses...');
    const detailPayload = await (await fetch(`${baseUrl}/assignments/${specificAssignmentId}`, {
      headers: { Authorization: `Bearer ${admin1.token}` },
    })).text();
    const leaksSecret = detailPayload.includes('password_hash') || detailPayload.includes('$2a$');
    results['34. Zero Secret/Hash Leaks'] = !leaksSecret ? 'PASS' : 'FAIL';
    console.log(`  ✓ 34: ${results['34. Zero Secret/Hash Leaks']}`);

    // 30. Existing authentication functionality still passes
    console.log('\n[TEST 30] Authentication functionality regression check...');
    const testLogin = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: student1.user.email,
        password: 'TestPass123!',
      }),
    });
    results['30. Existing Auth Regression Check'] = testLogin.status === 200 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 30: ${results['30. Existing Auth Regression Check']}`);

    // 31. Existing group/invitation tests still pass
    console.log('\n[TEST 31] Group & Invitation regression check...');
    const myGroupCheck = await fetch(`${baseUrl}/groups/my`, {
      headers: { Authorization: `Bearer ${student1.token}` },
    });
    const myGroupData = await myGroupCheck.json();
    results['31. Group Functionality Regression Check'] =
      myGroupCheck.status === 200 && myGroupData.group?.id === g1.id ? 'PASS' : 'FAIL';
    console.log(`  ✓ 31: ${results['31. Group Functionality Regression Check']}`);

    // 33. Cookie-authenticated writes obey CSRF protections
    console.log('\n[TEST 33] Cookie-authenticated writes obey CSRF protections...');
    const csrfRes = await fetch(`${baseUrl}/auth/csrf-token`);
    const csrfData = await csrfRes.json();
    const cookieHeader = `token=${admin1.token}; XSRF-TOKEN=${csrfData.csrfToken}`;
    // POST without CSRF header should return 403
    const blockedPost = await fetch(`${baseUrl}/assignments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
      },
      body: JSON.stringify({
        title: 'CSRF Attack',
        description: 'Should fail',
        due_date: '2026-12-01T12:00:00Z',
        onedrive_link: 'https://1drv.ms/u/s!sample',
        scope: 'ALL',
      }),
    });
    results['33. Cookie-authenticated Writes Obey CSRF'] = blockedPost.status === 403 ? 'PASS' : 'FAIL';
    console.log(`  ✓ 33: ${results['33. Cookie-authenticated Writes Obey CSRF']}`);

    // 32. Frontend production build passes
    console.log('\n[TEST 32] Frontend production compilation...');
    try {
      execSync('npm run build', { cwd: clientDir, stdio: 'pipe' });
      results['32. Frontend Production Build'] = 'PASS';
      console.log('  ✓ 32: PASS');
    } catch (e) {
      console.error('Build failed:', e.message);
      results['32. Frontend Production Build'] = 'FAIL';
    }
  } finally {
    server.close();
    await pool.end();
  }

  console.log('\n====================================================');
  console.log('PHASE 4 ALL 34 SCENARIO TEST RESULTS');
  console.log('====================================================');
  console.log(JSON.stringify(results, null, 2));
}

runPhase4Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
