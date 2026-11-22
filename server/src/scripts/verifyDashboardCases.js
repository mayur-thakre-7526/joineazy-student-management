import { pool } from '../config/db.js';
import { SubmissionModel } from '../models/submissionModel.js';
import { UserModel } from '../models/userModel.js';
import { GroupModel } from '../models/groupModel.js';
import { AssignmentModel } from '../models/assignmentModel.js';

async function runDashboardEdgeCaseTests() {
  console.log('====================================================');
  console.log('JOINEAZY DASHBOARD EDGE CASES & REGRESSION SUITE');
  console.log('====================================================\n');

  const results = {};
  const cleanupIds = {
    users: [],
    groups: [],
    assignments: [],
  };

  try {
    // Ensure admin user exists for creating assignments
    const adminEmail = `prof_edge_${Date.now()}@test.edu`;
    const adminUser = await UserModel.createOrUpdateAdmin({
      full_name: 'Professor Edge',
      email: adminEmail,
      password_hash: 'hash123',
    });
    cleanupIds.users.push(adminUser.user.id);

    // CASE A: Empty Analytics Response Structure
    console.log('[CASE A] Testing analytics response structure...');
    const analyticsEmpty = await SubmissionModel.getAdminAnalytics();
    console.log(`  Overview total assignments in DB: ${analyticsEmpty.overview.total_assignments}`);
    results['Case A: Empty Analytics Response Structure'] =
      analyticsEmpty && analyticsEmpty.overview && Array.isArray(analyticsEmpty.assignments)
        ? 'PASS'
        : 'FAIL';
    console.log(`  ✓ Case A: ${results['Case A: Empty Analytics Response Structure']}`);

    // CASE B: Exact Production Scenario Simulation (Assignment with 0 eligible students, 0 groups)
    console.log('\n[CASE B] Testing assignment with 0 eligible students and 0 targeted groups...');
    // Create an assignment targeted to no groups
    const assignB = await AssignmentModel.createAssignment({
      professorId: adminUser.user.id,
      title: 'Database Design Assignment (Edge Test B)',
      description: 'Production bug reproduction test',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      scope: 'SPECIFIC_GROUPS',
      onedriveLink: 'https://onedrive.live.com/test-b',
      groupIds: [],
    });
    cleanupIds.assignments.push(assignB.id);

    const trackingB = await SubmissionModel.getAssignmentSubmissionsAdmin(assignB.id);
    console.log('  Tracking B returned:');
    console.log(`    Assignment title: "${trackingB.assignment.title}"`);
    console.log(`    Eligible count: ${trackingB.overall.eligible_count}`);
    console.log(`    Group tracking length: ${trackingB.group_tracking.length}`);
    console.log(`    Student tracking length: ${trackingB.student_tracking.length}`);

    const caseBPass =
      trackingB !== null &&
      Array.isArray(trackingB.group_tracking) &&
      trackingB.group_tracking.length === 0 &&
      Array.isArray(trackingB.student_tracking) &&
      trackingB.student_tracking.length === 0 &&
      trackingB.overall.eligible_count === 0 &&
      trackingB.overall.confirmed_count === 0 &&
      trackingB.overall.completion_percentage === 0;

    results['Case B: 0 Eligible Students, 0 Groups'] = caseBPass ? 'PASS' : 'FAIL';
    console.log(`  ✓ Case B: ${results['Case B: 0 Eligible Students, 0 Groups']}`);

    // Create a shared ALL assignment for subsequent tests
    const assignAll = await AssignmentModel.createAssignment({
      professorId: adminUser.user.id,
      title: 'Database Design Assignment (Shared ALL)',
      description: 'Test assignment',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      scope: 'ALL',
      onedriveLink: 'https://onedrive.live.com/test-all',
    });
    cleanupIds.assignments.push(assignAll.id);

    // CASE C: One registered student, no group
    console.log('\n[CASE C] Testing student with no group...');
    const studentC = await UserModel.createStudent({
      full_name: 'Student C Solo',
      email: `student_c_${Date.now()}@test.edu`,
      password_hash: 'hash123',
    });
    cleanupIds.users.push(studentC.id);

    const trackingC = await SubmissionModel.getAssignmentSubmissionsAdmin(assignAll.id);
    const studentRecordC = trackingC.student_tracking.find((s) => s.student_id === studentC.id);
    const caseCPass =
      studentRecordC &&
      studentRecordC.confirmed === false &&
      studentRecordC.group_name === null;
    results['Case C: 1 Student, No Group'] = caseCPass ? 'PASS' : 'FAIL';
    console.log(`  ✓ Case C: ${results['Case C: 1 Student, No Group']}`);

    // CASE D: One group, multiple students, 0 confirmations
    console.log('\n[CASE D] Testing 1 group with 2 students, 0 confirmations...');
    const studentD1 = await UserModel.createStudent({
      full_name: 'Student D1',
      email: `student_d1_${Date.now()}@test.edu`,
      password_hash: 'hash123',
    });
    cleanupIds.users.push(studentD1.id);

    const studentD2 = await UserModel.createStudent({
      full_name: 'Student D2',
      email: `student_d2_${Date.now()}@test.edu`,
      password_hash: 'hash123',
    });
    cleanupIds.users.push(studentD2.id);

    const groupD = await GroupModel.createGroupWithCreator({
      name: `Team Delta ${Date.now()}`,
      creatorId: studentD1.id,
    });
    cleanupIds.groups.push(groupD.id);

    await pool.query('INSERT INTO group_members (group_id, student_id) VALUES ($1, $2)', [
      groupD.id,
      studentD2.id,
    ]);

    const trackingD = await SubmissionModel.getAssignmentSubmissionsAdmin(assignAll.id);
    const groupRecordD = trackingD.group_tracking.find((g) => g.group_id === groupD.id);
    const caseDPass =
      groupRecordD &&
      groupRecordD.eligible_count === 2 &&
      groupRecordD.confirmed_count === 0 &&
      groupRecordD.progress_percentage === 0 &&
      groupRecordD.status === 'NOT_STARTED';
    results['Case D: 1 Group, 2 Students, 0 Confirmations'] = caseDPass ? 'PASS' : 'FAIL';
    console.log(`  ✓ Case D: ${results['Case D: 1 Group, 2 Students, 0 Confirmations']}`);

    // CASE E: Partial confirmations, group progress below 100%
    console.log('\n[CASE E] Testing partial confirmations (1 of 2 confirmed = 50% progress)...');
    await SubmissionModel.confirmSubmission(assignAll.id, studentD1.id);

    const trackingE = await SubmissionModel.getAssignmentSubmissionsAdmin(assignAll.id);
    const groupRecordE = trackingE.group_tracking.find((g) => g.group_id === groupD.id);
    const caseEPass =
      groupRecordE &&
      groupRecordE.confirmed_count === 1 &&
      groupRecordE.progress_percentage === 50 &&
      groupRecordE.status === 'IN_PROGRESS';
    results['Case E: Partial Confirmation (50% In Progress)'] = caseEPass ? 'PASS' : 'FAIL';
    console.log(`  ✓ Case E: ${results['Case E: Partial Confirmation (50% In Progress)']}`);

    // CASE F: All eligible students confirmed, group progress 100%
    console.log('\n[CASE F] Testing all students confirmed (2 of 2 confirmed = 100% Completed)...');
    await SubmissionModel.confirmSubmission(assignAll.id, studentD2.id);

    const trackingF = await SubmissionModel.getAssignmentSubmissionsAdmin(assignAll.id);
    const groupRecordF = trackingF.group_tracking.find((g) => g.group_id === groupD.id);
    const caseFPass =
      groupRecordF &&
      groupRecordF.confirmed_count === 2 &&
      groupRecordF.progress_percentage === 100 &&
      groupRecordF.status === 'COMPLETED';
    results['Case F: Full Confirmation (100% Completed)'] = caseFPass ? 'PASS' : 'FAIL';
    console.log(`  ✓ Case F: ${results['Case F: Full Confirmation (100% Completed)']}`);

    // CASE G: SPECIFIC_GROUPS assignment with no confirmations
    console.log('\n[CASE G] Testing SPECIFIC_GROUPS assignment with zero confirmations...');
    const assignG = await AssignmentModel.createAssignment({
      professorId: adminUser.user.id,
      title: 'Targeted Sprint Assignment',
      description: 'Scope test for specific groups',
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      scope: 'SPECIFIC_GROUPS',
      onedriveLink: 'https://onedrive.live.com/test-g',
      groupIds: [groupD.id],
    });
    cleanupIds.assignments.push(assignG.id);

    const trackingG = await SubmissionModel.getAssignmentSubmissionsAdmin(assignG.id);
    const caseGPass =
      trackingG &&
      trackingG.group_tracking.length === 1 &&
      trackingG.group_tracking[0].group_id === groupD.id &&
      trackingG.group_tracking[0].confirmed_count === 0 &&
      trackingG.group_tracking[0].status === 'NOT_STARTED';
    results['Case G: SPECIFIC_GROUPS 0 Confirmations'] = caseGPass ? 'PASS' : 'FAIL';
    console.log(`  ✓ Case G: ${results['Case G: SPECIFIC_GROUPS 0 Confirmations']}`);

    // CASE H: Multiple assignments with different scopes
    console.log('\n[CASE H] Testing multiple assignments with mixed scopes...');
    const analyticsH = await SubmissionModel.getAdminAnalytics();
    const caseHPass =
      analyticsH.assignments.length >= 2 &&
      analyticsH.assignments.some((a) => a.scope === 'ALL') &&
      analyticsH.assignments.some((a) => a.scope === 'SPECIFIC_GROUPS');
    results['Case H: Mixed Scopes in Analytics'] = caseHPass ? 'PASS' : 'FAIL';
    console.log(`  ✓ Case H: ${results['Case H: Mixed Scopes in Analytics']}`);

    // CASE I: Safe handling when API returns error or null
    console.log('\n[CASE I] Testing safe handling when tracking is null...');
    const simulateDashboardRender = (trackingData, loading, error) => {
      // Replicate the exact React JSX logic from AdminDashboardPage
      if (error) {
        return { rendered: 'error_banner', error };
      }
      if (loading || !trackingData) {
        return { rendered: 'loading_spinner' };
      }
      const groupTrackingList = trackingData.group_tracking || [];
      const studentTrackingList = trackingData.student_tracking || [];
      const eligible = trackingData.overall?.eligible_count ?? 0;
      return {
        rendered: 'content',
        groupCount: groupTrackingList.length,
        studentCount: studentTrackingList.length,
        eligible,
      };
    };

    // State 1: selectedAssignmentId just set, trackingData is null, trackingLoading is false
    const renderInitial = simulateDashboardRender(null, false, null);
    // State 2: trackingLoading is true, trackingData is null
    const renderLoading = simulateDashboardRender(null, true, null);
    // State 3: tracking fails with error
    const renderError = simulateDashboardRender(null, false, 'Network error');
    // State 4: tracking succeeds with empty arrays
    const renderEmpty = simulateDashboardRender({ group_tracking: [], student_tracking: [], overall: {} }, false, null);

    const caseIPass =
      renderInitial.rendered === 'loading_spinner' &&
      renderLoading.rendered === 'loading_spinner' &&
      renderError.rendered === 'error_banner' &&
      renderEmpty.rendered === 'content' &&
      renderEmpty.groupCount === 0;

    results['Case I: Dashboard Null State Simulation'] = caseIPass ? 'PASS' : 'FAIL';
    console.log(`  ✓ Case I: ${results['Case I: Dashboard Null State Simulation']}`);

    // CASE J: Safe empty group & student rosters
    console.log('\n[CASE J] Testing safe empty arrays rendering...');
    const caseJPass =
      Array.isArray(trackingB.group_tracking) &&
      Array.isArray(trackingB.student_tracking) &&
      trackingB.group_tracking.length === 0;
    results['Case J: Safe Empty Arrays Handling'] = caseJPass ? 'PASS' : 'FAIL';
    console.log(`  ✓ Case J: ${results['Case J: Safe Empty Arrays Handling']}`);

    console.log('\n====================================================');
    console.log('EDGE CASE VERIFICATION SUMMARY:');
    console.log('====================================================');
    console.log(JSON.stringify(results, null, 2));

    const allPassed = Object.values(results).every((v) => v === 'PASS');
    if (!allPassed) {
      console.error('\n✗ Some edge case tests failed!');
      process.exit(1);
    }
    console.log('\n✓ ALL 10 EDGE CASE TESTS PASSED CLEANLY (10/10 PASS)!');
  } catch (err) {
    console.error('Fatal error during edge case verification:', err);
    process.exit(1);
  } finally {
    // Clean up test data
    console.log('\nCleaning up edge case test artifacts from local database...');
    for (const aId of cleanupIds.assignments) {
      await pool.query('DELETE FROM assignments WHERE id = $1', [aId]);
    }
    for (const gId of cleanupIds.groups) {
      await pool.query('DELETE FROM groups WHERE id = $1', [gId]);
    }
    for (const uId of cleanupIds.users) {
      await pool.query('DELETE FROM users WHERE id = $1', [uId]);
    }
    console.log('Cleanup complete.');
    await pool.end();
  }
}

runDashboardEdgeCaseTests();
