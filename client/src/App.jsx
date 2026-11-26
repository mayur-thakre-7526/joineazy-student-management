import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/common/Navbar';
import ProtectedRoute from './components/common/ProtectedRoute';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import MyGroupPage from './pages/MyGroupPage';
import CreateGroupPage from './pages/CreateGroupPage';
import MyInvitationsPage from './pages/MyInvitationsPage';
import AssignmentsIndexPage from './pages/assignments/AssignmentsIndexPage';
import CreateAssignmentPage from './pages/assignments/CreateAssignmentPage';
import EditAssignmentPage from './pages/assignments/EditAssignmentPage';
import AssignmentDetailsPage from './pages/assignments/AssignmentDetailsPage';
import DashboardIndexPage from './pages/DashboardIndexPage';
import CoursesIndexPage from './pages/courses/CoursesIndexPage';
import CreateCoursePage from './pages/courses/CreateCoursePage';
import StudentCourseDetailsPage from './pages/courses/StudentCourseDetailsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="min-h-screen bg-slate-50 flex flex-col justify-between text-slate-900 antialiased overflow-x-hidden">
          <div>
            <Navbar />
            <main>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />

                {/* Role-Aware Dashboard (Students & Admins) */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <DashboardIndexPage />
                    </ProtectedRoute>
                  }
                />

                {/* Course Routes (Students & Admins - Round 2) */}
                <Route
                  path="/courses"
                  element={
                    <ProtectedRoute>
                      <CoursesIndexPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/courses/create"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <CreateCoursePage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/courses/:id"
                  element={
                    <ProtectedRoute>
                      <StudentCourseDetailsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Group Routes (Students) */}
                <Route
                  path="/group"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT']}>
                      <MyGroupPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/groups/create"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT']}>
                      <CreateGroupPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/invitations"
                  element={
                    <ProtectedRoute allowedRoles={['STUDENT']}>
                      <MyInvitationsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Assignment Routes (Students & Admins) */}
                <Route
                  path="/assignments"
                  element={
                    <ProtectedRoute>
                      <AssignmentsIndexPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/assignments/create"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <CreateAssignmentPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/assignments/:id/edit"
                  element={
                    <ProtectedRoute allowedRoles={['ADMIN']}>
                      <EditAssignmentPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/assignments/:id"
                  element={
                    <ProtectedRoute>
                      <AssignmentDetailsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
          <footer className="bg-white border-t border-slate-200 py-8 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 mt-16 space-y-2">
            <div className="flex items-center justify-center space-x-4 text-xs font-medium text-slate-600">
              <span>Academic Integrity</span>
              <span>•</span>
              <span>Group Collaboration</span>
              <span>•</span>
              <span>Audited Declarations</span>
            </div>
            <p className="text-slate-400">Joineazy &copy; {new Date().getFullYear()} — Student, Group & Assignment Management Platform</p>
          </footer>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
