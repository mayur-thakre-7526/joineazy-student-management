import { pool, checkDatabaseConnection } from '../config/db.js';
import { createApp } from '../app.js';
import { signToken } from '../utils/token.js';
import { UserModel } from '../models/userModel.js';
import bcrypt from 'bcryptjs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, '../../../client');

async function runPhase3Tests() {
  console.log('====================================================');
  console.log('JOINEAZY PHASE 3 AUTOMATED INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  const results = {};

  // Verify DB connection
  const dbCheck = await checkDatabaseConnection();
  if (!dbCheck.connected) {
    console.error('Database is not connected. Marking tests BLOCKED.');
    return { blocked: true };
  }

  // Helper to create test student in DB
  async function createTestStudent(prefix) {
    const email = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(7)}@test.edu`;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('TestPass123!', salt);
    const user = await UserModel.createStudent({
      full_name: `Test Student ${prefix}`,
      email,
      password_hash: hash,
    });
    const token = signToken(user);
    return { user, token };
  }

  // Helper to create test admin in DB
  async function createTestAdmin() {
    const email = `admin_${Date.now()}_${Math.random().toString(36).substring(7)}@test.edu`;
    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash('AdminPass123!', salt);
    const { user } = await UserModel.createOrUpdateAdmin({
      full_name: 'Test Admin',
      email,
      password_hash: hash,
    });
    const token = signToken(user);
    return { user, token };
  }

  // Start in-memory test express server
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    // -------------------------------------------------------------
    // SETUP TEST ACTORS
    // -------------------------------------------------------------
    const studentA = await createTestStudent('studentA'); // Group Leader
    const studentB = await createTestStudent('studentB'); // Joiner
    const studentC = await createTestStudent('studentC'); // Rejecter / Multi-invitee
    const studentD = await createTestStudent('studentD'); // Non-member outsider
    const adminUser = await createTestAdmin();

    let createdGroupId = null;
    let invitationForBId = null;
    let invitationForCId = null;

    // SCENARIO 5: Unauthenticated group creation rejected (401)
    console.log('[SCENARIO 5] Testing Unauthenticated group creation...');
    const unauthRes = await fetch(`${baseUrl}/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauthorized Group' }),
    });
    if (unauthRes.status === 401) {
      console.log('  ✓ PASS: Unauthenticated group creation rejected with HTTP 401.');
      results['5. Unauthenticated Group Creation Rejected'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', unauthRes.status);
      results['5. Unauthenticated Group Creation Rejected'] = 'FAIL';
    }

    // SCENARIO 4: Admin cannot create student group (403)
    console.log('\n[SCENARIO 4] Testing Admin cannot create student group...');
    const adminGroupRes = await fetch(`${baseUrl}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminUser.token}`,
      },
      body: JSON.stringify({ name: 'Admin Forbidden Group' }),
    });
    if (adminGroupRes.status === 403) {
      console.log('  ✓ PASS: Admin access to student group creation blocked with HTTP 403.');
      results['4. Admin Group Creation Denied (403)'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', adminGroupRes.status);
      results['4. Admin Group Creation Denied (403)'] = 'FAIL';
    }

    // SCENARIO 1: Student creates group successfully (201)
    console.log('\n[SCENARIO 1 & 2] Testing Student creates group successfully & becomes member...');
    const createGroupRes = await fetch(`${baseUrl}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentA.token}`,
      },
      body: JSON.stringify({ name: 'Team Alpha Engineering' }),
    });
    const createGroupData = await createGroupRes.json();
    if (createGroupRes.status === 201 && createGroupData.group?.id) {
      createdGroupId = createGroupData.group.id;
      console.log(`  ✓ PASS: Group created with ID: ${createdGroupId}`);
      results['1. Student Creates Group'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', createGroupRes.status, createGroupData);
      results['1. Student Creates Group'] = 'FAIL';
    }

    // SCENARIO 2: Creator becomes group member automatically
    const myGroupRes = await fetch(`${baseUrl}/groups/my`, {
      headers: { Authorization: `Bearer ${studentA.token}` },
    });
    const myGroupData = await myGroupRes.json();
    const isMember = myGroupData.group?.members?.some(
      (m) => m.id === studentA.user.id && m.is_creator === true
    );
    if (isMember) {
      console.log('  ✓ PASS: Creator automatically confirmed as leader in group_members.');
      results['2. Creator Becomes Member Automatically'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', myGroupData);
      results['2. Creator Becomes Member Automatically'] = 'FAIL';
    }

    // SCENARIO 3: Student cannot create second group
    console.log('\n[SCENARIO 3] Testing Student cannot create second group...');
    const secondGroupRes = await fetch(`${baseUrl}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentA.token}`,
      },
      body: JSON.stringify({ name: 'Second Group Attempt' }),
    });
    if (secondGroupRes.status === 400) {
      console.log('  ✓ PASS: Second group creation rejected with HTTP 400.');
      results['3. Second Group Creation Blocked'] = 'PASS';
    } else {
      console.error('  ✗ FAIL: Expected 400, got', secondGroupRes.status);
      results['3. Second Group Creation Blocked'] = 'FAIL';
    }

    // SCENARIO 6: Group creator invites valid student
    console.log('\n[SCENARIO 6] Testing Group creator invites valid student...');
    const inviteBRes = await fetch(`${baseUrl}/groups/${createdGroupId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentA.token}`,
      },
      body: JSON.stringify({ email: studentB.user.email }),
    });
    const inviteBData = await inviteBRes.json();
    if (inviteBRes.status === 201 && inviteBData.invitation?.id) {
      invitationForBId = inviteBData.invitation.id;
      console.log(`  ✓ PASS: Invitation created for Student B (ID: ${invitationForBId})`);
      results['6. Creator Invites Valid Student'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', inviteBRes.status, inviteBData);
      results['6. Creator Invites Valid Student'] = 'FAIL';
    }

    // Also invite Student C (for reject test)
    const inviteCRes = await fetch(`${baseUrl}/groups/${createdGroupId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentA.token}`,
      },
      body: JSON.stringify({ student_id: studentC.user.id }),
    });
    const inviteCData = await inviteCRes.json();
    invitationForCId = inviteCData.invitation?.id;

    // SCENARIO 7: Invalid email/UUID rejected
    console.log('\n[SCENARIO 7] Testing Invalid email/UUID rejected...');
    const invalidInviteRes = await fetch(`${baseUrl}/groups/${createdGroupId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentA.token}`,
      },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    if (invalidInviteRes.status === 400) {
      console.log('  ✓ PASS: Invalid email format rejected with HTTP 400.');
      results['7. Invalid Email/UUID Rejected'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', invalidInviteRes.status);
      results['7. Invalid Email/UUID Rejected'] = 'FAIL';
    }

    // SCENARIO 8: Duplicate pending invitation rejected (409)
    console.log('\n[SCENARIO 8] Testing Duplicate pending invitation rejected...');
    const dupInviteRes = await fetch(`${baseUrl}/groups/${createdGroupId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentA.token}`,
      },
      body: JSON.stringify({ email: studentB.user.email }),
    });
    if (dupInviteRes.status === 409) {
      console.log('  ✓ PASS: Duplicate pending invitation rejected with HTTP 409 Conflict.');
      results['8. Duplicate Pending Invitation Rejected'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', dupInviteRes.status);
      results['8. Duplicate Pending Invitation Rejected'] = 'FAIL';
    }

    // SCENARIO 9: Student cannot invite themselves
    console.log('\n[SCENARIO 9] Testing Student cannot invite themselves...');
    const selfInviteRes = await fetch(`${baseUrl}/groups/${createdGroupId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentA.token}`,
      },
      body: JSON.stringify({ email: studentA.user.email }),
    });
    if (selfInviteRes.status === 400) {
      console.log('  ✓ PASS: Self-invitation rejected with HTTP 400.');
      results['9. Self-Invitation Prevented'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', selfInviteRes.status);
      results['9. Self-Invitation Prevented'] = 'FAIL';
    }

    // SCENARIO 11: Ordinary group member cannot send invitations (403)
    console.log('\n[SCENARIO 11] Testing Non-creator cannot send invitations...');
    const nonCreatorInviteRes = await fetch(`${baseUrl}/groups/${createdGroupId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentD.token}`,
      },
      body: JSON.stringify({ email: 'somebody@test.edu' }),
    });
    if (nonCreatorInviteRes.status === 403) {
      console.log('  ✓ PASS: Non-creator invitation attempt blocked with HTTP 403.');
      results['11. Non-Creator Cannot Invite'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', nonCreatorInviteRes.status);
      results['11. Non-Creator Cannot Invite'] = 'FAIL';
    }

    // SCENARIO 12: Student sees only their pending invitations
    console.log('\n[SCENARIO 12] Testing Student sees only their pending invitations...');
    const pendingBRes = await fetch(`${baseUrl}/invitations/my-pending`, {
      headers: { Authorization: `Bearer ${studentB.token}` },
    });
    const pendingBData = await pendingBRes.json();
    const seesOnlyB =
      pendingBData.invitations?.length > 0 &&
      pendingBData.invitations.every((i) => i.id === invitationForBId);
    if (seesOnlyB) {
      console.log('  ✓ PASS: Student B sees only invitations addressed to Student B.');
      results['12. Student Sees Only Own Invitations'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', pendingBData);
      results['12. Student Sees Only Own Invitations'] = 'FAIL';
    }

    // SCENARIO 19: Another student cannot respond to an invitation (403)
    console.log('\n[SCENARIO 19] Testing Another student cannot respond to invitation...');
    const unauthorizedRespondRes = await fetch(`${baseUrl}/invitations/${invitationForBId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentD.token}`, // Student D tries to accept B's invite
      },
      body: JSON.stringify({ action: 'ACCEPT' }),
    });
    if (unauthorizedRespondRes.status === 403) {
      console.log('  ✓ PASS: Unauthorized invitation response blocked with HTTP 403.');
      results['19. Intercepted Invitation Response Denied'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', unauthorizedRespondRes.status);
      results['19. Intercepted Invitation Response Denied'] = 'FAIL';
    }

    // SCENARIO 13 & 14: Student accepts invitation successfully & membership is persisted in PostgreSQL
    console.log('\n[SCENARIO 13 & 14] Testing Student accepts invitation & membership persisted...');
    const acceptRes = await fetch(`${baseUrl}/invitations/${invitationForBId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentB.token}`,
      },
      body: JSON.stringify({ action: 'ACCEPT' }),
    });
    const acceptData = await acceptRes.json();
    if (acceptRes.status === 200 && acceptData.action === 'ACCEPT') {
      console.log('  ✓ PASS: Student B accepted invitation.');
      results['13. Student Accepts Invitation'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', acceptRes.status, acceptData);
      results['13. Student Accepts Invitation'] = 'FAIL';
    }

    // Verify membership persistence in DB
    const memberCheckQuery = `
      SELECT group_id FROM group_members WHERE student_id = $1;
    `;
    const { rows: memberRows } = await pool.query(memberCheckQuery, [studentB.user.id]);
    if (memberRows.length === 1 && memberRows[0].group_id === createdGroupId) {
      console.log('  ✓ PASS: Membership confirmed persisted in PostgreSQL group_members.');
      results['14. Membership Persisted in PostgreSQL'] = 'PASS';
    } else {
      console.error('  ✗ FAIL: Membership not found in database.');
      results['14. Membership Persisted in PostgreSQL'] = 'FAIL';
    }

    // SCENARIO 10: Existing member cannot be invited again (400)
    console.log('\n[SCENARIO 10] Testing Existing member cannot be invited again...');
    const reinviteMemberRes = await fetch(`${baseUrl}/groups/${createdGroupId}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentA.token}`,
      },
      body: JSON.stringify({ email: studentB.user.email }),
    });
    if (reinviteMemberRes.status === 400) {
      console.log('  ✓ PASS: Re-inviting active group member rejected with HTTP 400.');
      results['10. Existing Member Re-Invite Blocked'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', reinviteMemberRes.status);
      results['10. Existing Member Re-Invite Blocked'] = 'FAIL';
    }

    // SCENARIO 17: Invitation cannot be accepted twice (400)
    console.log('\n[SCENARIO 17] Testing Invitation cannot be accepted twice...');
    const reAcceptRes = await fetch(`${baseUrl}/invitations/${invitationForBId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentB.token}`,
      },
      body: JSON.stringify({ action: 'ACCEPT' }),
    });
    if (reAcceptRes.status === 400) {
      console.log('  ✓ PASS: Duplicate accept rejected with HTTP 400.');
      results['17. Invitation Cannot Be Accepted Twice'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', reAcceptRes.status);
      results['17. Invitation Cannot Be Accepted Twice'] = 'FAIL';
    }

    // SCENARIO 15 & 16: Student rejects invitation successfully & does not create membership
    console.log('\n[SCENARIO 15 & 16] Testing Student rejects invitation & no membership created...');
    const rejectRes = await fetch(`${baseUrl}/invitations/${invitationForCId}/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentC.token}`,
      },
      body: JSON.stringify({ action: 'REJECT' }),
    });
    const rejectData = await rejectRes.json();
    if (rejectRes.status === 200 && rejectData.action === 'REJECT') {
      console.log('  ✓ PASS: Invitation rejected successfully.');
      results['15. Student Rejects Invitation'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', rejectRes.status, rejectData);
      results['15. Student Rejects Invitation'] = 'FAIL';
    }

    const cMemberCheck = await pool.query('SELECT id FROM group_members WHERE student_id = $1', [
      studentC.user.id,
    ]);
    if (cMemberCheck.rows.length === 0) {
      console.log('  ✓ PASS: No membership created for rejected invitation.');
      results['16. Rejected Does Not Create Membership'] = 'PASS';
    } else {
      console.error('  ✗ FAIL: Member found despite rejection.');
      results['16. Rejected Does Not Create Membership'] = 'FAIL';
    }

    // SCENARIO 18: Student cannot accept two groups concurrently
    console.log('\n[SCENARIO 18] Testing Student cannot join second group...');
    // Create another group by student D
    const group2Res = await fetch(`${baseUrl}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentD.token}`,
      },
      body: JSON.stringify({ name: 'Team Beta' }),
    });
    const group2Data = await group2Res.json();
    const group2Id = group2Data.group.id;

    // Student D invites student B (who is already in Team Alpha)
    const inviteBtoGroup2 = await fetch(`${baseUrl}/groups/${group2Id}/invitations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentD.token}`,
      },
      body: JSON.stringify({ email: studentB.user.email }),
    });
    // System should either block invite because B is already in group (HTTP 400) or on accept block (HTTP 400)
    if (inviteBtoGroup2.status === 400) {
      console.log('  ✓ PASS: System blocked inviting a student who already belongs to another group.');
      results['18. Prevent Multi-Group Membership'] = 'PASS';
    } else {
      console.log('  Note: Invitation created, testing acceptance block...');
      const invite2Data = await inviteBtoGroup2.json();
      const acceptGroup2Res = await fetch(`${baseUrl}/invitations/${invite2Data.invitation.id}/respond`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentB.token}`,
        },
        body: JSON.stringify({ action: 'ACCEPT' }),
      });
      if (acceptGroup2Res.status === 400) {
        console.log('  ✓ PASS: Student B blocked from accepting second group (HTTP 400).');
        results['18. Prevent Multi-Group Membership'] = 'PASS';
      } else {
        console.error('  ✗ FAIL: Student joined second group.');
        results['18. Prevent Multi-Group Membership'] = 'FAIL';
      }
    }

    // SCENARIO 20: Non-member cannot access private group details (403)
    console.log('\n[SCENARIO 20] Testing Non-member cannot access private group details...');
    const nonMemberRosterRes = await fetch(`${baseUrl}/groups/${createdGroupId}`, {
      headers: { Authorization: `Bearer ${studentC.token}` }, // Student C is not in Team Alpha
    });
    if (nonMemberRosterRes.status === 403) {
      console.log('  ✓ PASS: Non-member roster request blocked with HTTP 403 Forbidden.');
      results['20. Non-Member Roster Access Denied'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', nonMemberRosterRes.status);
      results['20. Non-Member Roster Access Denied'] = 'FAIL';
    }

    // SCENARIO 21: API responses contain no password hashes
    console.log('\n[SCENARIO 21] Testing API responses contain no password hashes...');
    const checkGroupRosterRes = await fetch(`${baseUrl}/groups/${createdGroupId}`, {
      headers: { Authorization: `Bearer ${studentA.token}` },
    });
    const rosterData = await checkGroupRosterRes.json();
    const hasHash = JSON.stringify(rosterData).includes('password_hash') || JSON.stringify(rosterData).includes('$2a$');
    if (!hasHash) {
      console.log('  ✓ PASS: No password hash leaked in roster or group responses.');
      results['21. No Password Hash Exposure'] = 'PASS';
    } else {
      console.error('  ✗ FAIL: Password hash found in API response!');
      results['21. No Password Hash Exposure'] = 'FAIL';
    }

    // SCENARIO 22: Existing login/register functionality still works
    console.log('\n[SCENARIO 22] Testing Existing login/register regression...');
    const regCheck = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Regression Student',
        email: `reg_${Date.now()}@test.edu`,
        password: 'Password123!',
      }),
    });
    if (regCheck.status === 201) {
      console.log('  ✓ PASS: Registration functions cleanly.');
      results['22. Auth Regression Check'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', regCheck.status);
      results['22. Auth Regression Check'] = 'FAIL';
    }

    // SCENARIO 23: Frontend production build passes
    console.log('\n[SCENARIO 23] Testing Frontend production compilation...');
    try {
      execSync('npm run build', { cwd: clientDir, stdio: 'pipe' });
      console.log('  ✓ PASS: Frontend production build succeeded without compilation errors.');
      results['23. Frontend Production Build'] = 'PASS';
    } catch (buildErr) {
      console.error('  ✗ FAIL: Frontend build failed:', buildErr.message);
      results['23. Frontend Production Build'] = 'FAIL';
    }

    // SCENARIO 24: PostgreSQL transactions roll back on failure
    console.log('\n[SCENARIO 24] Testing Database rollback on error...');
    const initialGroupCount = (await pool.query('SELECT count(*) FROM groups;')).rows[0].count;
    try {
      // Deliberately trigger failure inside transaction by violating unique constraint
      await pool.query('BEGIN');
      await pool.query('INSERT INTO groups (name, created_by) VALUES ($1, $2)', ['Rollback Test', studentA.user.id]);
      // Attempt duplicate member insert to trigger 23505
      await pool.query('INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)', [createdGroupId, studentA.user.id]);
      await pool.query('COMMIT');
    } catch {
      await pool.query('ROLLBACK');
    }
    const finalGroupCount = (await pool.query('SELECT count(*) FROM groups;')).rows[0].count;
    if (initialGroupCount === finalGroupCount) {
      console.log('  ✓ PASS: Transaction rolled back; no orphaned records created.');
      results['24. Transaction Rollback Verified'] = 'PASS';
    } else {
      console.error('  ✗ FAIL: Orphaned records found.');
      results['24. Transaction Rollback Verified'] = 'FAIL';
    }

    // SCENARIO 25: CSRF protection and cookie-authenticated writes work as documented
    console.log('\n[SCENARIO 25] Testing CSRF protection on cookie-authenticated session...');
    // 1. Fetch CSRF token
    const csrfRes = await fetch(`${baseUrl}/auth/csrf-token`);
    const csrfData = await csrfRes.json();
    const xsrfCookie = csrfRes.headers.get('set-cookie');
    console.log(`    CSRF Token retrieved: ${csrfData.csrfToken ? 'Yes' : 'No'}`);

    // 2. Perform cookie-authenticated POST without X-CSRF-Token header -> Expect 403 Forbidden
    const studentCookie = `token=${studentA.token}; XSRF-TOKEN=${csrfData.csrfToken}`;
    const blockedCsrf = await fetch(`${baseUrl}/groups`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: studentCookie,
        // No X-CSRF-Token header
      },
      body: JSON.stringify({ name: 'CSRF Attack Group' }),
    });
    if (blockedCsrf.status === 403) {
      console.log('  ✓ PASS: Cookie-authenticated write without X-CSRF-Token blocked (HTTP 403).');
      results['25. CSRF Protection Verified'] = 'PASS';
    } else {
      console.error('  ✗ FAIL: CSRF token was not enforced, status:', blockedCsrf.status);
      results['25. CSRF Protection Verified'] = 'FAIL';
    }
  } finally {
    server.close();
    await pool.end();
  }

  console.log('\n====================================================');
  console.log('ALL PHASE 3 SCENARIO TESTS COMPLETE');
  console.log('====================================================');
  console.log(JSON.stringify(results, null, 2));
}

runPhase3Tests().catch((err) => {
  console.error('Test runner fatal error:', err);
  process.exit(1);
});
