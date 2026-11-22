import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminAssignmentsPage from './AdminAssignmentsPage';
import StudentAssignmentsPage from './StudentAssignmentsPage';

export default function AssignmentsIndexPage() {
  const { isAdmin } = useAuth();

  if (isAdmin) {
    return <AdminAssignmentsPage />;
  }

  return <StudentAssignmentsPage />;
}
