import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import { createApp } from '../app.js';
import { pool, checkDatabaseConnection } from '../config/db.js';
import { UserModel } from '../models/userModel.js';
import { CourseModel } from '../models/courseModel.js';
import { AssignmentModel } from '../models/assignmentModel.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchWithCookies(url, options = {}, cookieJar = {}) {
  const headers = { ...(options.headers || {}) };
  if (cookieJar.cookie) {
    headers['Cookie'] = cookieJar.cookie;
  }
  const match = cookieJar.cookie ? cookieJar.cookie.match(/XSRF-TOKEN=([^;]+)/) : null;
  const jarCsrf = match ? decodeURIComponent(match[1]) : null;
  if (jarCsrf && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase())) {
    if (!headers['x-csrf-token']) {
      headers['x-csrf-token'] = jarCsrf;
    }
  }

  const res = await fetch(url, { ...options, headers });
  const setCookies = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
  if (setCookies.length > 0) {
    const existing = cookieJar.cookie ? cookieJar.cookie.split('; ').filter(Boolean) : [];
    for (const sc of setCookies) {
      const part = sc.split(';')[0];
      if (part) {
        const key = part.split('=')[0];
        const idx = existing.findIndex(e => e.startsWith(key + '='));
        if (idx >= 0) existing[idx] = part;
        else existing.push(part);
      }
    }
    cookieJar.cookie = existing.join('; ');
  }
  return res;
}

export async function runCrudDeleteTests() {
  console.log('====================================================');
  console.log('JOINEAZY ROUND 2 - ASSIGNMENT CRUD DELETE AUDIT');
  console.log('====================================================\n');

  const dbCheck = await checkDatabaseConnection();
  if (!dbCheck.connected) {
    console.error('FATAL: Database connection failed:', dbCheck.message);
    throw new Error(dbCheck.message);
  }

  const app = createApp();
  const PORT = 5057;
  const server = http.createServer(app);
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${PORT}`;

  const runId = Date.now();
  const results = {};

  try {
    // 1. Create Users
    const prof1 = await UserModel.create({
      full_name: 'Professor Alpha',
      email: `prof_alpha_${runId}@univ.edu`,
      password: 'SecurePassword123!',
      role: 'ADMIN',
    });

    const prof2 = await UserModel.create({
      full_name: 'Professor Beta',
      email: `prof_beta_${runId}@univ.edu`,
      password: 'SecurePassword123!',
      role: 'ADMIN',
    });

    const student = await UserModel.create({
      full_name: 'Student Charlie',
      email: `student_charlie_${runId}@univ.edu`,
      password: 'SecurePassword123!',
      role: 'STUDENT',
    });

    // 2. Real Login to get session cookies + CSRF tokens
    const prof1Jar = {};
    const prof2Jar = {};
    const studentJar = {};

    await fetchWithCookies(`${baseUrl}/api/auth/csrf-token`, { method: 'GET' }, prof1Jar);
    await fetchWithCookies(`${baseUrl}/api/auth/csrf-token`, { method: 'GET' }, prof2Jar);
    await fetchWithCookies(`${baseUrl}/api/auth/csrf-token`, { method: 'GET' }, studentJar);

    await fetchWithCookies(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: prof1.email, password: 'SecurePassword123!' }),
    }, prof1Jar);

    await fetchWithCookies(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: prof2.email, password: 'SecurePassword123!' }),
    }, prof2Jar);

    await fetchWithCookies(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: student.email, password: 'SecurePassword123!' }),
    }, studentJar);

    // Prof 1 creates a course & assignment
    const course = await CourseModel.create({
      title: 'Operating Systems Kernel Design',
      courseCode: `OS${runId.toString().slice(-4)}`,
      description: 'Low-level kernel modules and page tables.',
      professorId: prof1.id,
    });

    const assign = await AssignmentModel.createAssignment({
      professorId: prof1.id,
      title: 'Virtual Memory Pager Implementation',
      description: 'Implement two-level page tables in C.',
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      onedriveLink: 'https://onedrive.live.com/test-vm-pager',
      scope: 'ALL',
      courseId: course.id,
      submissionType: 'INDIVIDUAL',
    });

    console.log(`Created Assignment: "${assign.title}" (ID: ${assign.id})`);

    // 1. Unauthenticated DELETE -> 401 Unauthorized
    const unauthRes = await fetchWithCookies(`${baseUrl}/api/assignments/${assign.id}`, {
      method: 'DELETE',
    });
    results['1. Unauthenticated DELETE rejected (401)'] = unauthRes.status === 401 ? 'PASS' : `FAIL (${unauthRes.status})`;

    // 2. Student DELETE -> 403 Forbidden
    const studentRes = await fetchWithCookies(`${baseUrl}/api/assignments/${assign.id}`, {
      method: 'DELETE',
    }, studentJar);
    results['2. Student DELETE rejected (403)'] = studentRes.status === 403 ? 'PASS' : `FAIL (${studentRes.status})`;

    // 3. Different Professor DELETE -> 403 Forbidden
    const prof2Res = await fetchWithCookies(`${baseUrl}/api/assignments/${assign.id}`, {
      method: 'DELETE',
    }, prof2Jar);
    results['3. Different Professor DELETE rejected (403)'] = prof2Res.status === 403 ? 'PASS' : `FAIL (${prof2Res.status})`;

    // 4. Invalid UUID format -> 400 Bad Request
    const badIdRes = await fetchWithCookies(`${baseUrl}/api/assignments/not-a-uuid`, {
      method: 'DELETE',
    }, prof1Jar);
    results['4. Invalid UUID format rejected (400)'] = badIdRes.status === 400 ? 'PASS' : `FAIL (${badIdRes.status})`;

    // 5. Non-existent UUID -> 404 Not Found
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const notFoundRes = await fetchWithCookies(`${baseUrl}/api/assignments/${fakeUuid}`, {
      method: 'DELETE',
    }, prof1Jar);
    results['5. Non-existent assignment DELETE returns 404'] = notFoundRes.status === 404 ? 'PASS' : `FAIL (${notFoundRes.status})`;

    // 6. Authoring Professor DELETE -> 200 OK
    const deleteRes = await fetchWithCookies(`${baseUrl}/api/assignments/${assign.id}`, {
      method: 'DELETE',
    }, prof1Jar);
    const deleteJson = await deleteRes.json();
    results['6. Authoring Professor DELETE succeeds (200)'] = (deleteRes.status === 200 && deleteJson.success === true) ? 'PASS' : `FAIL (${deleteRes.status})`;

    // 7. Verify Assignment is deleted from DB
    const checkDb = await pool.query('SELECT id FROM assignments WHERE id = $1', [assign.id]);
    results['7. Assignment removed from PostgreSQL table'] = checkDb.rows.length === 0 ? 'PASS' : 'FAIL';

    // 8. Subsequent GET returns 404
    const getDeletedRes = await fetchWithCookies(`${baseUrl}/api/assignments/${assign.id}`, {
      method: 'GET',
    }, prof1Jar);
    results['8. Subsequent GET /api/assignments/:id returns 404'] = getDeletedRes.status === 404 ? 'PASS' : `FAIL (${getDeletedRes.status})`;

    console.log('\nTEST RESULTS:');
    console.log(JSON.stringify(results, null, 2));

    const allPass = Object.values(results).every(v => v === 'PASS');
    console.log(`\nCRUD DELETE STATUS: ${allPass ? 'ALL 8 TESTS PASSED (100%)' : 'SOME TESTS FAILED'}`);
    return results;

  } finally {
    server.close();
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith('verifyCrudDelete.js')) {
  runCrudDeleteTests()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Test error:', err);
      process.exit(1);
    });
}
