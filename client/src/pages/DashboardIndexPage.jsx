import React from 'react';
import { useAuth } from '../context/AuthContext';
import StudentDashboardPage from './StudentDashboardPage';
import AdminDashboardPage from './AdminDashboardPage';

export default function DashboardIndexPage() {
  const { isAdmin } = useAuth();

  if (isAdmin) {
    return <AdminDashboardPage />;
  }

  return <StudentDashboardPage />;
}
