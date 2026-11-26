import React from 'react';
import { useAuth } from '../../context/AuthContext';
import StudentCoursesPage from './StudentCoursesPage';
import ProfessorCoursesPage from './ProfessorCoursesPage';

export default function CoursesIndexPage() {
  const { isAdmin } = useAuth();

  if (isAdmin) {
    return <ProfessorCoursesPage />;
  }

  return <StudentCoursesPage />;
}
