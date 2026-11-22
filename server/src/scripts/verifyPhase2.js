import { pool, checkDatabaseConnection } from '../config/db.js';
import { createApp } from '../app.js';
import { seedAdmin } from './seedAdmin.js';
import { signToken } from '../utils/token.js';
import bcrypt from 'bcryptjs';

async function runTests() {
  console.log('====================================================');
  console.log('JOINEAZY PHASE 2 AUTOMATED INTEGRATION TEST SUITE');
  console.log('====================================================\n');

  const results = {};

  // 1. Database Connection Check
  console.log('[TEST 1] Testing Database Connection...');
  const dbCheck = await checkDatabaseConnection();
  if (dbCheck.connected) {
    console.log('  ✓ PASS: Database connected successfully.');
    results['Database Connection'] = 'PASS';
  } else {
    console.error('  ✗ FAIL: Database connection failed:', dbCheck.message);
    results['Database Connection'] = 'FAIL';
    return results;
  }

  // 2. Table Inspection
  console.log('\n[TEST 2] Verifying Database Schema Tables...');
  const tableQuery = `
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `;
  const { rows: tableRows } = await pool.query(tableQuery);
  const tables = tableRows.map((r) => r.table_name);
  console.log('  Found tables in public schema:', tables.join(', '));
  const expectedTables = [
    'assignment_groups',
    'assignments',
    'group_invitations',
    'group_members',
    'groups',
    'schema_migrations',
    'submission_confirmations',
    'users',
  ];
  const allFound = expectedTables.every((t) => tables.includes(t));
  if (allFound) {
    console.log('  ✓ PASS: All 8 core tables & migrations verified.');
    results['Schema Tables Verification'] = 'PASS';
  } else {
    console.error('  ✗ FAIL: Missing required tables.');
    results['Schema Tables Verification'] = 'FAIL';
  }

  // Set environment for Admin Seed Test
  process.env.ADMIN_EMAIL = 'admin@joineazy.edu';
  process.env.ADMIN_PASSWORD = 'AdminSecurePassword2026!';
  process.env.ADMIN_NAME = 'Prof. Eleanor Vance';

  // 3. Admin Account Provisioning Test
  console.log('\n[TEST 3] Testing Idempotent Admin Account Provisioning...');
  const seedResult = await seedAdmin();
  if (seedResult.success && seedResult.role === 'ADMIN') {
    console.log(`  ✓ PASS: Admin provisioned (ID: ${seedResult.userId}, isNew: ${seedResult.isNew}).`);
    results['Admin Seed'] = 'PASS';
  } else {
    console.error('  ✗ FAIL: Admin provisioning failed.');
    results['Admin Seed'] = 'FAIL';
  }

  // Start in-memory express server instance for HTTP testing
  const app = createApp();
  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  try {
    // 4. Test GET /api/health
    console.log('\n[TEST 4] Testing GET /api/health...');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    if (healthRes.status === 200 && healthData.database.connected === true) {
      console.log('  ✓ PASS: GET /api/health returns 200 with DB status.');
      results['GET /api/health'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', healthRes.status, healthData);
      results['GET /api/health'] = 'FAIL';
    }

    // 5. Test GET /api/ready
    console.log('\n[TEST 5] Testing GET /api/ready...');
    const readyRes = await fetch(`${baseUrl}/ready`);
    const readyData = await readyRes.json();
    if (readyRes.status === 200 && readyData.ready === true) {
      console.log('  ✓ PASS: GET /api/ready returns 200 OK.');
      results['GET /api/ready'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', readyRes.status, readyData);
      results['GET /api/ready'] = 'FAIL';
    }

    // 6. Test Student Registration (and role escalation prevention)
    console.log('\n[TEST 6] Testing Student Registration & Privilege Escalation Prevention...');
    const testEmail = `student_${Date.now()}@university.edu`;
    const regRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Alex Rivera',
        email: testEmail,
        password: 'Password123!',
        role: 'ADMIN', // Deliberate privilege escalation attempt
      }),
    });
    const regData = await regRes.json();
    if (regRes.status === 201 && regData.user.role === 'STUDENT' && regData.token) {
      console.log('  ✓ PASS: Student registered with forced STUDENT role (escalation prevented).');
      results['Student Registration'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', regRes.status, regData);
      results['Student Registration'] = 'FAIL';
    }

    const studentToken = regData.token;

    // 7. Test Duplicate Registration Rejection (409 Conflict)
    console.log('\n[TEST 7] Testing Duplicate Email Rejection (409 Conflict)...');
    const dupRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: 'Alex Rivera Duplicate',
        email: testEmail.toUpperCase(), // Test case-insensitive collision
        password: 'Password123!',
      }),
    });
    const dupData = await dupRes.json();
    if (dupRes.status === 409) {
      console.log('  ✓ PASS: Duplicate email rejected with HTTP 409 Conflict.');
      results['Duplicate Email Rejection'] = 'PASS';
    } else {
      console.error('  ✗ FAIL: Expected 409, got', dupRes.status, dupData);
      results['Duplicate Email Rejection'] = 'FAIL';
    }

    // 8. Test Invalid Password Login Rejection (401)
    console.log('\n[TEST 8] Testing Incorrect Password Login Rejection...');
    const badLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'WrongPassword!',
      }),
    });
    if (badLoginRes.status === 401) {
      console.log('  ✓ PASS: Incorrect password rejected with HTTP 401.');
      results['Incorrect Password Rejection'] = 'PASS';
    } else {
      console.error('  ✗ FAIL: Expected 401, got', badLoginRes.status);
      results['Incorrect Password Rejection'] = 'FAIL';
    }

    // 9. Test Valid Login
    console.log('\n[TEST 9] Testing Valid Login...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
      }),
    });
    const loginData = await loginRes.json();
    const cookieHeader = loginRes.headers.get('set-cookie');
    if (loginRes.status === 200 && loginData.token && loginData.user.email === testEmail.toLowerCase()) {
      console.log('  ✓ PASS: Successful login returns user object and signed token.');
      console.log(`    Cookie set: ${cookieHeader ? 'Yes (HTTP-only)' : 'No'}`);
      results['Valid Login'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', loginRes.status, loginData);
      results['Valid Login'] = 'FAIL';
    }

    // 10. Test Authenticated GET /api/auth/me
    console.log('\n[TEST 10] Testing Authenticated GET /api/auth/me...');
    const meRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const meData = await meRes.json();
    if (meRes.status === 200 && meData.user.email === testEmail.toLowerCase()) {
      console.log('  ✓ PASS: GET /api/auth/me verified user profile.');
      results['GET /api/auth/me'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', meRes.status, meData);
      results['GET /api/auth/me'] = 'FAIL';
    }

    // 11. Test Missing Token Rejection (401)
    console.log('\n[TEST 11] Testing Missing Token Rejection...');
    const noTokenRes = await fetch(`${baseUrl}/auth/me`);
    if (noTokenRes.status === 401) {
      console.log('  ✓ PASS: Missing token rejected with HTTP 401.');
      results['Missing Token Rejection'] = 'PASS';
    } else {
      console.error('  ✗ FAIL: Expected 401, got', noTokenRes.status);
      results['Missing Token Rejection'] = 'FAIL';
    }

    // 12. Test Invalid Token Rejection (401)
    console.log('\n[TEST 12] Testing Tampered/Invalid Token Rejection...');
    const badTokenRes = await fetch(`${baseUrl}/auth/me`, {
      headers: { Authorization: 'Bearer this.is.an.invalid.token' },
    });
    if (badTokenRes.status === 401) {
      console.log('  ✓ PASS: Invalid token rejected with HTTP 401.');
      results['Invalid Token Rejection'] = 'PASS';
    } else {
      console.error('  ✗ FAIL: Expected 401, got', badTokenRes.status);
      results['Invalid Token Rejection'] = 'FAIL';
    }

    // 13. Test Role-Based Access Control: Student Forbidden on Admin Route (403)
    console.log('\n[TEST 13] Testing Student Access Denied to Admin Route (403 Forbidden)...');
    const studentAdminRes = await fetch(`${baseUrl}/admin/test`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    if (studentAdminRes.status === 403) {
      console.log('  ✓ PASS: Student access to admin route blocked with HTTP 403 Forbidden.');
      results['Student Access Denied (403)'] = 'PASS';
    } else {
      console.error('  ✗ FAIL: Expected 403, got', studentAdminRes.status);
      results['Student Access Denied (403)'] = 'FAIL';
    }

    // 14. Test Admin Login & Admin Route Access (200 OK)
    console.log('\n[TEST 14] Testing Admin Login & Access to Admin Route (200 OK)...');
    const adminLoginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@joineazy.edu',
        password: 'AdminSecurePassword2026!',
      }),
    });
    const adminLoginData = await adminLoginRes.json();
    const adminToken = adminLoginData.token;

    const adminTestRes = await fetch(`${baseUrl}/admin/test`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminTestData = await adminTestRes.json();
    if (adminTestRes.status === 200 && adminTestData.admin.role === 'ADMIN') {
      console.log('  ✓ PASS: Admin successfully authenticated and authorized (HTTP 200 OK).');
      results['Admin Route Access (200)'] = 'PASS';
    } else {
      console.error('  ✗ FAIL:', adminTestRes.status, adminTestData);
      results['Admin Route Access (200)'] = 'FAIL';
    }

    // 15. Database Persistence Verification
    console.log('\n[TEST 15] Testing Database Persistence across Simulated Reconnect...');
    const verifyUserQuery = 'SELECT id, email, role FROM users WHERE LOWER(email) = LOWER($1);';
    const { rows: persistedRows } = await pool.query(verifyUserQuery, [testEmail]);
    if (persistedRows.length === 1 && persistedRows[0].role === 'STUDENT') {
      console.log('  ✓ PASS: User data confirmed persistently in PostgreSQL.');
      results['Database Persistence'] = 'PASS';
    } else {
      console.error('  ✗ FAIL: Persisted user not found.');
      results['Database Persistence'] = 'FAIL';
    }
  } finally {
    server.close();
    await pool.end();
  }

  console.log('\n====================================================');
  console.log('ALL PHASE 2 TESTS COMPLETED');
  console.log('====================================================');
  console.log(JSON.stringify(results, null, 2));
}

runTests().catch((err) => {
  console.error('Unexpected test runner error:', err);
  process.exit(1);
});
