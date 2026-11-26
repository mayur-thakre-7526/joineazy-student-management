import http from 'http';
import { fileURLToPath } from 'url';
import path from 'path';
import { createApp } from '../app.js';
import { pool, checkDatabaseConnection } from '../config/db.js';
import { UserModel } from '../models/userModel.js';
import { CourseModel } from '../models/courseModel.js';
import { AssignmentModel } from '../models/assignmentModel.js';
import { GroupModel } from '../models/groupModel.js';
import { SubmissionModel } from '../models/submissionModel.js';

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

export async function runCourseDetailsRegression() {
  console.log('====================================================');
  console.log('COURSE DETAILS & ASSIGNMENTS REGRESSION TEST SUITE');
  console.log('====================================================\n');

  const dbCheck = await checkDatabaseConnection();
  if (!dbCheck.connected) {
    console.error('FATAL: Database connection failed:', dbCheck.message);
    throw new Error(dbCheck.message);
  }

  const app = createApp();
  const PORT = 5058;
  const server = http.createServer(app);
  await new Promise(r => server.listen(PORT, '127.0.0.1', r));
  const baseUrl = `http://127.0.0.1:${PORT}`;

  const runId = Date.now();
  const results = {};

  try {
    // 1. Setup Users: Professor, Student A (Leader), Student B (Member), Student C (Unenrolled)
    const prof = await UserModel.create({
      full_name: 'Professor Alan Kay',
      email: `prof_kay_${runId}@univ.edu`,
      password: 'SecurePassword123!',
      role: 'ADMIN',
    });

    const studentA = await UserModel.create({
      full_name: 'Student Alice (Leader)',
      email: `student_alice_${runId}@univ.edu`,
      password: 'SecurePassword123!',
      role: 'STUDENT',
    });

    const studentB = await UserModel.create({
      full_name: 'Student Bob (Member)',
      email: `student_bob_${runId}@univ.edu`,
      password: 'SecurePassword123!',
      role: 'STUDENT',
    });

    const studentC = await UserModel.create({
      full_name: 'Student Charlie (Unenrolled)',
      email: `student_charlie_${runId}@univ.edu`,
      password: 'SecurePassword123!',
      role: 'STUDENT',
    });

    // Login each user
    const profJar = {};
    const studentAJar = {};
    const studentBJar = {};
    const studentCJar = {};

    await fetchWithCookies(`${baseUrl}/api/auth/csrf-token`, { method: 'GET' }, profJar);
    await fetchWithCookies(`${baseUrl}/api/auth/csrf-token`, { method: 'GET' }, studentAJar);
    await fetchWithCookies(`${baseUrl}/api/auth/csrf-token`, { method: 'GET' }, studentBJar);
    await fetchWithCookies(`${baseUrl}/api/auth/csrf-token`, { method: 'GET' }, studentCJar);

    await fetchWithCookies(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: prof.email, password: 'SecurePassword123!' }),
    }, profJar);

    await fetchWithCookies(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentA.email, password: 'SecurePassword123!' }),
    }, studentAJar);

    await fetchWithCookies(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentB.email, password: 'SecurePassword123!' }),
    }, studentBJar);

    await fetchWithCookies(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: studentC.email, password: 'SecurePassword123!' }),
    }, studentCJar);

    // 2. Professor creates Course
    const course = await CourseModel.create({
      title: 'Advanced Computer Systems',
      courseCode: `CS${runId.toString().slice(-4)}`,
      description: 'Operating systems, distributed computing and databases.',
      professorId: prof.id,
    });
    console.log(`Created Course: "${course.title}" (${course.course_code})`);

    // 3. Professor creates Individual Assignment in Course
    const indAssign = await AssignmentModel.createAssignment({
      professorId: prof.id,
      title: 'Memory Allocator Lab',
      description: 'Implement malloc and free using segregated free lists.',
      dueDate: new Date(Date.now() + 86400000 * 7).toISOString(),
      onedriveLink: 'https://onedrive.live.com/test-malloc',
      scope: 'ALL',
      courseId: course.id,
      submissionType: 'INDIVIDUAL',
    });

    // 4. Professor creates Group Assignment in Course
    const grpAssign = await AssignmentModel.createAssignment({
      professorId: prof.id,
      title: 'Raft Consensus Implementation',
      description: 'Implement distributed leader election and log replication.',
      dueDate: new Date(Date.now() + 86400000 * 14).toISOString(),
      onedriveLink: 'https://onedrive.live.com/test-raft',
      scope: 'ALL',
      courseId: course.id,
      submissionType: 'GROUP',
    });

    // 5. Professor creates Legacy Assignment (course_id IS NULL)
    const legacyAssign = await AssignmentModel.createAssignment({
      professorId: prof.id,
      title: 'General Departmental Survey',
      description: 'General orientation feedback for all engineering students.',
      dueDate: new Date(Date.now() + 86400000 * 30).toISOString(),
      onedriveLink: 'https://onedrive.live.com/test-legacy-survey',
      scope: 'ALL',
      courseId: null,
      submissionType: 'INDIVIDUAL',
    });

    // 6. Enroll Student A and Student B (Student C remains unenrolled)
    await CourseModel.enrollStudent({ courseId: course.id, studentId: studentA.id });
    await CourseModel.enrollStudent({ courseId: course.id, studentId: studentB.id });

    // 7. Test Student Course Details endpoint: GET /api/courses/:id
    console.log('\n[TEST 1] Testing Student Course Details endpoint (GET /api/courses/:id)...');
    const studentCourseRes = await fetchWithCookies(`${baseUrl}/api/courses/${course.id}`, {
      method: 'GET',
    }, studentAJar);
    const studentCourseData = await studentCourseRes.json();
    results['1. Student Course Details (GET /api/courses/:id)'] = 
      (studentCourseRes.status === 200 && studentCourseData.course?.is_enrolled === true && studentCourseData.course?.title === course.title) ? 'PASS' : `FAIL (${studentCourseRes.status})`;

    // 8. Test Unenrolled Student access to course assignments: returns 403 Forbidden
    console.log('\n[TEST 2] Testing Unenrolled Student denied course assignments (GET /api/courses/:id/assignments)...');
    const unenrolledRes = await fetchWithCookies(`${baseUrl}/api/courses/${course.id}/assignments`, {
      method: 'GET',
    }, studentCJar);
    results['2. Unenrolled Student Denied Course Assignments (403)'] =
      unenrolledRes.status === 403 ? 'PASS' : `FAIL (${unenrolledRes.status})`;

    // 9. Test Enrolled Student Course Assignments: GET /api/courses/:id/assignments (Fixed SQL query without sc.confirmed error)
    console.log('\n[TEST 3] Testing Enrolled Student Course Assignments (GET /api/courses/:id/assignments)...');
    const enrolledAssignRes = await fetchWithCookies(`${baseUrl}/api/courses/${course.id}/assignments`, {
      method: 'GET',
    }, studentAJar);
    const enrolledAssignData = await enrolledAssignRes.json();
    const hasAssignments = enrolledAssignData.assignments?.length === 2;
    const initialIndiv = enrolledAssignData.assignments?.find(a => a.id === indAssign.id);
    const initialGroup = enrolledAssignData.assignments?.find(a => a.id === grpAssign.id);

    results['3. Course Assignments List No SQL Error (200 OK)'] =
      (enrolledAssignRes.status === 200 && hasAssignments) ? 'PASS' : `FAIL (${enrolledAssignRes.status})`;

    // 10. Initial unconfirmed statuses
    results['4. Initial Individual Assignment is_confirmed === false'] =
      (initialIndiv && initialIndiv.is_confirmed === false) ? 'PASS' : 'FAIL';
    results['5. Initial Group Assignment is_confirmed === false'] =
      (initialGroup && initialGroup.is_confirmed === false) ? 'PASS' : 'FAIL';

    // 11. Student A confirms Individual Assignment
    console.log('\n[TEST 4] Student confirms Individual Assignment...');
    const confirmIndRes = await fetchWithCookies(`${baseUrl}/api/assignments/${indAssign.id}/confirm`, {
      method: 'POST',
    }, studentAJar);
    results['6. Student Confirms Individual Assignment (201)'] =
      confirmIndRes.status === 201 ? 'PASS' : `FAIL (${confirmIndRes.status})`;

    // Re-check course assignments for Student A: is_confirmed === true
    const postConfirmRes = await fetchWithCookies(`${baseUrl}/api/courses/${course.id}/assignments`, {
      method: 'GET',
    }, studentAJar);
    const postConfirmData = await postConfirmRes.json();
    const confirmedIndiv = postConfirmData.assignments?.find(a => a.id === indAssign.id);
    results['7. Individual Submission Status Reflected (is_confirmed === true)'] =
      (confirmedIndiv && confirmedIndiv.is_confirmed === true) ? 'PASS' : 'FAIL';

    // Verify Student B still sees unconfirmed for their individual assignment
    const studentBCheckRes = await fetchWithCookies(`${baseUrl}/api/courses/${course.id}/assignments`, {
      method: 'GET',
    }, studentBJar);
    const studentBCheckData = await studentBCheckRes.json();
    const studentBIndiv = studentBCheckData.assignments?.find(a => a.id === indAssign.id);
    results['8. Student B Individual Status Remains Independent (is_confirmed === false)'] =
      (studentBIndiv && studentBIndiv.is_confirmed === false) ? 'PASS' : 'FAIL';

    // 12. Student A creates a group and adds Student B
    console.log('\n[TEST 5] Group Creation and Member Join...');
    const group = await GroupModel.createGroup({ name: `Systems Team ${runId}`, creatorId: studentA.id });
    await pool.query('INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)', [group.id, studentB.id]);

    // 13. Student A (Leader) acknowledges Group Assignment
    console.log('\n[TEST 6] Leader acknowledges Group Assignment...');
    const ackRes = await fetchWithCookies(`${baseUrl}/api/assignments/${grpAssign.id}/group-acknowledge`, {
      method: 'POST',
    }, studentAJar);
    results['9. Leader Acknowledges Group Assignment (201)'] =
      ackRes.status === 201 ? 'PASS' : `FAIL (${ackRes.status})`;

    // 14. Check Course Assignments for Leader (Student A): is_confirmed === true
    const leaderCourseRes = await fetchWithCookies(`${baseUrl}/api/courses/${course.id}/assignments`, {
      method: 'GET',
    }, studentAJar);
    const leaderCourseData = await leaderCourseRes.json();
    const leaderGrp = leaderCourseData.assignments?.find(a => a.id === grpAssign.id);
    results['10. Leader Sees Group Assignment is_confirmed === true'] =
      (leaderGrp && leaderGrp.is_confirmed === true && leaderGrp.is_group_leader === true) ? 'PASS' : 'FAIL';

    // 15. Check Course Assignments for Member (Student B): reflected group status is_confirmed === true!
    console.log('\n[TEST 7] Member checks Course Assignments (reflected group status)...');
    const memberCourseRes = await fetchWithCookies(`${baseUrl}/api/courses/${course.id}/assignments`, {
      method: 'GET',
    }, studentBJar);
    const memberCourseData = await memberCourseRes.json();
    const memberGrp = memberCourseData.assignments?.find(a => a.id === grpAssign.id);
    results['11. Member Sees Reflected Group Assignment (is_confirmed === true)'] =
      (memberGrp && memberGrp.is_confirmed === true && memberGrp.is_group_leader === false) ? 'PASS' : 'FAIL';

    // 16. Professor Course Details: GET /api/courses/:id as ADMIN
    console.log('\n[TEST 8] Professor views Course Details (GET /api/courses/:id)...');
    const profCourseRes = await fetchWithCookies(`${baseUrl}/api/courses/${course.id}`, {
      method: 'GET',
    }, profJar);
    const profCourseData = await profCourseRes.json();
    results['12. Professor Course Details (GET /api/courses/:id)'] =
      (profCourseRes.status === 200 && profCourseData.course?.student_count === 2 && profCourseData.course?.assignment_count === 2) ? 'PASS' : `FAIL (${profCourseRes.status})`;

    // 17. Professor Course Assignments: GET /api/courses/:id/assignments as ADMIN
    console.log('\n[TEST 9] Professor views Course Assignments (GET /api/courses/:id/assignments)...');
    const profAssignRes = await fetchWithCookies(`${baseUrl}/api/courses/${course.id}/assignments`, {
      method: 'GET',
    }, profJar);
    const profAssignData = await profAssignRes.json();
    results['13. Professor Course Assignments (GET /api/courses/:id/assignments)'] =
      (profAssignRes.status === 200 && profAssignData.assignments?.length === 2) ? 'PASS' : `FAIL (${profAssignRes.status})`;

    // 18. Legacy Assignment accessibility: GET /api/assignments/:id
    console.log('\n[TEST 10] Legacy Assignment accessibility (course_id IS NULL)...');
    const legacyRes = await fetchWithCookies(`${baseUrl}/api/assignments/${legacyAssign.id}`, {
      method: 'GET',
    }, studentAJar);
    const legacyData = await legacyRes.json();
    results['14. Legacy Assignment Accessible (GET /api/assignments/:id)'] =
      (legacyRes.status === 200 && legacyData.assignment?.course_id === null) ? 'PASS' : `FAIL (${legacyRes.status})`;

    console.log('\n====================================================');
    console.log('COURSE DETAILS REGRESSION TEST RESULTS:');
    console.log('====================================================');
    console.log(JSON.stringify(results, null, 2));

    const allPass = Object.values(results).every(v => v === 'PASS');
    console.log(`\nREGRESSION STATUS: ${allPass ? 'ALL 14 CHECKS PASSED (100%)' : 'SOME CHECKS FAILED'}`);
    return results;

  } finally {
    server.close();
    await pool.end();
  }
}

if (process.argv[1] && process.argv[1].endsWith('verifyCourseDetails.js')) {
  runCourseDetailsRegression()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Test error:', err);
      process.exit(1);
    });
}
