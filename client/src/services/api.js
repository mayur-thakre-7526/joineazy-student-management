const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

/**
 * Cookie parsing helper to extract XSRF-TOKEN for CSRF protection
 */
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

let cachedCsrfToken = null;

/**
 * Fetch CSRF token from server if not already in document.cookie
 */
async function ensureCsrfToken() {
  const cookieToken = getCookie('XSRF-TOKEN');
  if (cookieToken) {
    cachedCsrfToken = cookieToken;
    return cookieToken;
  }

  if (cachedCsrfToken) return cachedCsrfToken;

  try {
    const res = await fetch(`${API_BASE_URL}/auth/csrf-token`, {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      cachedCsrfToken = data.csrfToken || getCookie('XSRF-TOKEN');
      return cachedCsrfToken;
    }
  } catch (err) {
    console.warn('Unable to pre-fetch CSRF token:', err.message);
  }

  return getCookie('XSRF-TOKEN');
}

/**
 * Base fetch wrapper with credentials & CSRF token injection
 * Note: Browser automatically sends HTTP-only session cookies via credentials: 'include'.
 * LocalStorage token persistence is intentionally excluded for security.
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const method = (options.method || 'GET').toUpperCase();

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...options.headers,
  };

  // For state-changing requests, ensure CSRF token is attached
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    const csrfToken = await ensureCsrfToken();
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }
  }

  const config = {
    ...options,
    method,
    headers,
    credentials: 'include', // Primary auth mechanism: HTTP-only cookies
  };

  const response = await fetch(url, config);
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const errorMessage = data?.error?.message || data?.message || `HTTP ${response.status}: ${response.statusText}`;
    const error = new Error(errorMessage);
    error.status = response.status;
    error.details = data?.error?.details || null;
    throw error;
  }

  return data;
}

// System Health & Readiness
export async function getHealthStatus() {
  return request('/health');
}

export async function getReadinessStatus() {
  return request('/ready');
}

// Authentication API
export const authApi = {
  register: (payload) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  login: (payload) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  getMe: () => request('/auth/me', {
    method: 'GET',
  }),

  logout: () => request('/auth/logout', {
    method: 'POST',
  }),

  testAdminAccess: () => request('/admin/test', {
    method: 'GET',
  }),
};

// Group & Invitation Management API
export const groupApi = {
  createGroup: (payload) => request('/groups', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  getMyGroup: () => request('/groups/my', {
    method: 'GET',
  }),

  getGroupById: (id) => request(`/groups/${id}`, {
    method: 'GET',
  }),

  inviteMember: (groupId, payload) => request(`/groups/${groupId}/invitations`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  getGroupInvitations: (groupId) => request(`/groups/${groupId}/invitations`, {
    method: 'GET',
  }),

  getMyPendingInvitations: () => request('/invitations/my-pending', {
    method: 'GET',
  }),

  respondToInvitation: (invitationId, action) => request(`/invitations/${invitationId}/respond`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  }),
};

// Assignment Management API (Phase 4)
export const assignmentApi = {
  // List assignments (Students see eligible; Admins see all)
  getAssignments: () => request('/assignments', {
    method: 'GET',
  }),

  // Get single assignment details
  getAssignmentById: (id) => request(`/assignments/${id}`, {
    method: 'GET',
  }),

  // Create assignment (ADMIN only)
  createAssignment: (payload) => request('/assignments', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Edit assignment (ADMIN only)
  updateAssignment: (id, payload) => request(`/assignments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),

  // Get targeting groups for selector (ADMIN only)
  getAdminGroups: () => request('/admin/groups', {
    method: 'GET',
  }),
};

// Submission Confirmation & Student Progress API (Phase 5 & Round 2)
export const submissionApi = {
  // Confirm individual submission declaration (STUDENT only)
  confirm: (assignmentId) => request(`/assignments/${assignmentId}/confirm`, {
    method: 'POST',
  }),

  // Acknowledge group submission declaration (STUDENT group leader only)
  acknowledgeGroup: (assignmentId) => request(`/assignments/${assignmentId}/group-acknowledge`, {
    method: 'POST',
  }),

  // Get group submission status for an assignment (Role-aware)
  getGroupStatus: (assignmentId) => request(`/assignments/${assignmentId}/group-status`, {
    method: 'GET',
  }),

  // Get student submission status for an assignment (STUDENT only)
  getStatus: (assignmentId) => request(`/assignments/${assignmentId}/submission`, {
    method: 'GET',
  }),

  // Get student overall coursework and group progress (STUDENT only)
  getStudentProgress: () => request('/student/progress', {
    method: 'GET',
  }),
};

// Professor Analytics & Submission Tracking API (Phase 5)
export const analyticsApi = {
  // Get overarching course analytics (ADMIN only)
  getAdminAnalytics: () => request('/admin/analytics', {
    method: 'GET',
  }),

  // Get group and student submission tracking for a specific assignment (ADMIN only)
  getAssignmentSubmissions: (assignmentId) => request(`/admin/assignments/${assignmentId}/submissions`, {
    method: 'GET',
  }),
};

// Course Management & Enrollment API (Round 2)
export const courseApi = {
  // List courses (Role-aware)
  getCourses: () => request('/courses', {
    method: 'GET',
  }),

  // Get user's enrolled (student) or taught (professor) courses
  getMyCourses: () => request('/courses/my', {
    method: 'GET',
  }),

  // Get single course details
  getCourseById: (id) => request(`/courses/${id}`, {
    method: 'GET',
  }),

  // Get assignments belonging to a course
  getCourseAssignments: (courseId) => request(`/courses/${courseId}/assignments`, {
    method: 'GET',
  }),

  // Create course (ADMIN / Professor only)
  createCourse: (payload) => request('/courses', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),

  // Self-enroll by course code (STUDENT only)
  enrollByCode: (courseCode) => request('/courses/enroll', {
    method: 'POST',
    body: JSON.stringify({ course_code: courseCode }),
  }),

  // Enroll in course by ID (STUDENT only)
  enrollById: (courseId) => request(`/courses/${courseId}/enroll`, {
    method: 'POST',
  }),
};
