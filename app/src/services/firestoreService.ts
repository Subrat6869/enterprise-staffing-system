// ============================================
// FIRESTORE SERVICE - CRUD OPERATIONS (WITH CACHING)
// ============================================

import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/firebase/config';
import type { 
  User, Department, Project, Task, DailyWork, 
  Report, Notice, Notification, Team,
  ActivityActionType, ActivityModule, ActivityStatus, ActivityLog,
  UserSettings
} from '@/types';

// ============================================
// IN-MEMORY CACHE (2-minute TTL)
// ============================================

const CACHE_TTL = 2 * 60 * 1000; // 2 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<any>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Invalidate cache entries that match a prefix (call after mutations)
function invalidateCache(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

// ============================================
// USERS
// ============================================

export const createUser = async (uid: string, userData: Omit<User, 'uid'>): Promise<void> => {
  await setDoc(doc(db, 'users', uid), {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  invalidateCache('users');
};

export const getAllUsers = async (): Promise<User[]> => {
  const cached = getCached<User[]>('users:all');
  if (cached) return cached;
  const querySnapshot = await getDocs(collection(db, 'users'));
  const result = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }) as User);
  setCache('users:all', result);
  return result;
};

export const getUsersByRole = async (role: string): Promise<User[]> => {
  const q = query(collection(db, 'users'), where('role', '==', role));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }) as User);
};

export const getUsersByDepartment = async (department: string): Promise<User[]> => {
  // Try by department name first
  const q1 = query(collection(db, 'users'), where('department', '==', department));
  const snap1 = await getDocs(q1);
  if (snap1.docs.length > 0) {
    return snap1.docs.map(doc => ({ uid: doc.id, ...doc.data() }) as User);
  }
  // Fallback: try by departmentId (some pages pass departmentId instead of name)
  const q2 = query(collection(db, 'users'), where('departmentId', '==', department));
  const snap2 = await getDocs(q2);
  return snap2.docs.map(doc => ({ uid: doc.id, ...doc.data() }) as User);
};

export const getUsersByArea = async (areaCode: string): Promise<User[]> => {
  const q = query(collection(db, 'users'), where('areaCode', '==', areaCode));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }) as User);
};

export const updateUser = async (uid: string, data: Partial<User>): Promise<void> => {
  await updateDoc(doc(db, 'users', uid), {
    ...data,
    updatedAt: serverTimestamp()
  });
  invalidateCache('users');
};

export const deleteUser = async (uid: string): Promise<void> => {
  await deleteDoc(doc(db, 'users', uid));
  invalidateCache('users');
};

// ============================================
// DEPARTMENTS
// ============================================

export const createDepartment = async (
  data: Omit<Department, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'departments'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  invalidateCache('departments');
  return docRef.id;
};

export const getAllDepartments = async (): Promise<Department[]> => {
  const cached = getCached<Department[]>('departments:all');
  if (cached) return cached;
  const querySnapshot = await getDocs(collection(db, 'departments'));
  const result = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Department);
  setCache('departments:all', result);
  return result;
};

export const getDepartment = async (id: string): Promise<Department | null> => {
  const docSnap = await getDoc(doc(db, 'departments', id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Department;
};

export const updateDepartment = async (
  id: string, 
  data: Partial<Department>
): Promise<void> => {
  await updateDoc(doc(db, 'departments', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
  invalidateCache('departments');
};

export const deleteDepartment = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'departments', id));
  invalidateCache('departments');
};

/** Get departments filtered by area code */
export const getDepartmentsByArea = async (areaCode: string): Promise<Department[]> => {
  const cacheKey = `departments:area:${areaCode}`;
  const cached = getCached<Department[]>(cacheKey);
  if (cached) return cached;
  const q = query(collection(db, 'departments'), where('areaCode', '==', areaCode));
  const snap = await getDocs(q);
  const result = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Department);
  setCache(cacheKey, result);
  return result;
};

/**
 * Seed all standard departments AND their fixed teams for a given area.
 * Prevents duplicate departments. Auto-creates the predefined teams for each department.
 * Returns the count of departments and teams created.
 */
export const seedDepartmentsAndTeams = async (
  areaCode: string,
  areaName: string
): Promise<{ deptsCreated: number; teamsCreated: number }> => {
  // Import here to avoid circular deps
  const { STANDARD_DEPARTMENTS } = await import('@/data/organizationData');

  // Check if departments already exist for this area
  const existing = await getDepartmentsByArea(areaCode);
  if (existing.length > 0) {
    throw new Error('Departments already exist for this area. Cannot seed again.');
  }

  let deptsCreated = 0;
  let teamsCreated = 0;

  for (const deptConfig of STANDARD_DEPARTMENTS) {
    // Create department
    const deptId = await createDepartment({
      name: deptConfig.name,
      description: deptConfig.description,
      headId: '',
      headName: '',
      employeeCount: 0,
      projectCount: 0,
      areaCode,
      areaName,
      teamLimit: deptConfig.teamLimit,
      createdAt: new Date()
    });
    deptsCreated++;

    // Auto-create fixed teams for this department
    for (const teamName of deptConfig.standardTeams) {
      await addDoc(collection(db, 'teams'), {
        name: teamName,
        departmentId: deptId,
        departmentName: deptConfig.name,
        supervisorId: '',
        memberIds: [],
        areaCode,
        areaName,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      teamsCreated++;
    }
  }

  invalidateCache('departments');
  invalidateCache('teams');
  return { deptsCreated, teamsCreated };
};

/** Get all teams across the system */
export const getAllTeams = async (): Promise<Team[]> => {
  const cached = getCached<Team[]>('teams:all');
  if (cached) return cached;
  const snap = await getDocs(collection(db, 'teams'));
  const result = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Team);
  setCache('teams:all', result);
  return result;
};

/** Get teams filtered by area code */
export const getTeamsByArea = async (areaCode: string): Promise<Team[]> => {
  const q = query(collection(db, 'teams'), where('areaCode', '==', areaCode));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }) as Team);
};

// ============================================
// PROJECTS
// ============================================

export const createProject = async (
  data: Omit<Project, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'projects'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  invalidateCache('projects');
  return docRef.id;
};

export const getAllProjects = async (): Promise<Project[]> => {
  const cached = getCached<Project[]>('projects:all');
  if (cached) return cached;
  const querySnapshot = await getDocs(collection(db, 'projects'));
  const result = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Project);
  setCache('projects:all', result);
  return result;
};

export const getProject = async (id: string): Promise<Project | null> => {
  const docSnap = await getDoc(doc(db, 'projects', id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Project;
};

export const getProjectsByDepartment = async (departmentId: string): Promise<Project[]> => {
  const q = query(collection(db, 'projects'), where('departmentId', '==', departmentId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Project);
};

export const getProjectsByManager = async (managerId: string): Promise<Project[]> => {
  const q = query(collection(db, 'projects'), where('assignedManagerId', '==', managerId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Project);
};

export const getProjectsByEmployee = async (employeeId: string): Promise<Project[]> => {
  // First get projects where they are explicitly in teamMembers
  const qProjects = query(collection(db, 'projects'), where('teamMembers', 'array-contains', employeeId));
  const projectsSnapshot = await getDocs(qProjects);
  const projects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Project);
  
  // Also get projects where they have assigned tasks (in case PM forgot to add to teamMembers)
  const qTasks = query(collection(db, 'tasks'), where('employeeId', '==', employeeId));
  const tasksSnapshot = await getDocs(qTasks);
  const tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
  
  const existingProjectIds = new Set(projects.map(p => p.id));
  const missingProjectIds = [...new Set(tasks.map(t => t.projectId))].filter(id => !existingProjectIds.has(id));
  
  // Fetch missing projects individually (usually a very small number if any)
  for (const pId of missingProjectIds) {
    const pSnap = await getDoc(doc(db, 'projects', pId));
    if (pSnap.exists()) {
      projects.push({ id: pSnap.id, ...pSnap.data() } as Project);
    }
  }
  
  return projects;
};

/** Get projects filtered by area code (through department relation) */
export const getProjectsByArea = async (areaCode: string): Promise<Project[]> => {
  const cacheKey = `projects:area:${areaCode}`;
  const cached = getCached<Project[]>(cacheKey);
  if (cached) return cached;

  // Get all department IDs in this area
  const areaDepts = await getDepartmentsByArea(areaCode);
  const deptIds = new Set(areaDepts.map(d => d.id));

  if (deptIds.size === 0) return [];

  // Get all projects and filter by area department IDs
  const allProjects = await getAllProjects();
  const result = allProjects.filter(p => deptIds.has(p.departmentId));
  setCache(cacheKey, result);
  return result;
};

export const updateProject = async (id: string, data: Partial<Project>): Promise<void> => {
  await updateDoc(doc(db, 'projects', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
  invalidateCache('projects');
};

export const deleteProject = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'projects', id));
  invalidateCache('projects');
};

// ============================================
// TASKS
// ============================================

export const createTask = async (data: Omit<Task, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'tasks'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  invalidateCache('tasks');
  return docRef.id;
};

export const getAllTasks = async (): Promise<Task[]> => {
  const cached = getCached<Task[]>('tasks:all');
  if (cached) return cached;
  const querySnapshot = await getDocs(collection(db, 'tasks'));
  const result = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
  setCache('tasks:all', result);
  return result;
};

export const getTask = async (id: string): Promise<Task | null> => {
  const docSnap = await getDoc(doc(db, 'tasks', id));
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as Task;
};

export const getTasksByProject = async (projectId: string): Promise<Task[]> => {
  const q = query(collection(db, 'tasks'), where('projectId', '==', projectId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
};

export const getTasksByEmployee = async (employeeId: string): Promise<Task[]> => {
  const q = query(collection(db, 'tasks'), where('employeeId', '==', employeeId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
};

// New Dynamic Member Task Fetch (Area -> Dept -> Team/Member logic)
// Resilient: tries departmentId first, then falls back to department (name).
export const getMyTasks = async (user: User): Promise<Task[]> => {
  let allDeptTasks: Task[] = [];
  
  // Strategy 1: Try fetching by departmentId
  if (user.departmentId) {
    const q = query(collection(db, 'tasks'), where('departmentId', '==', user.departmentId));
    const snap = await getDocs(q);
    allDeptTasks = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
  }
  
  // Strategy 2: Try by departmentName
  if (allDeptTasks.length === 0 && user.department) {
    const q2 = query(collection(db, 'tasks'), where('departmentName', '==', user.department));
    const snap2 = await getDocs(q2);
    allDeptTasks = snap2.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
  }
  
  // Strategy 3: Try departmentId matching the department string
  if (allDeptTasks.length === 0 && user.department) {
    const q3 = query(collection(db, 'tasks'), where('departmentId', '==', user.department));
    const snap3 = await getDocs(q3);
    allDeptTasks = snap3.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
  }

  // Strategy 4: Fallback to areaCode (for supervisors with no department assigned)
  if (allDeptTasks.length === 0 && user.areaCode) {
    const q4 = query(collection(db, 'tasks'), where('areaCode', '==', user.areaCode));
    const snap4 = await getDocs(q4);
    allDeptTasks = snap4.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
  }

  // For supervisors: show ALL tasks in their scope (dept + team filtering)
  // For members: filter to only their specific assignment
  const isSupervisor = user.role === 'supervisor';
  
  // Filter dynamically based on hierarchy structure
  return allDeptTasks.filter(t => {
    // Supervisors see everything in their department scope
    if (isSupervisor) {
      // If supervisor has a team, show department-wide AND their team tasks
      if (user.teamId) {
        return t.assignmentLevel === 'department' || 
               t.teamId === user.teamId || 
               !t.assignmentLevel; // legacy tasks
      }
      // If supervisor has no team, they see all department tasks
      return true;
    }
    
    // ---- Member logic below ----
    // 1. Specifically assigned to this member
    if (t.assignmentLevel === 'member' && t.employeeId === user.uid) return true;
    
    // 2. Assigned to the member's team
    if ((t.assignmentLevel === 'team' || t.assignmentLevel === 'multi_team') && t.teamId === user.teamId) return true;
    
    // 3. Assigned to the entire department
    if (t.assignmentLevel === 'department') return true;
    
    // 4. Fallback for older tasks without assignmentLevel
    if (!t.assignmentLevel) {
      if (t.employeeId === user.uid) return true;
      if (!t.employeeId && t.teamId === user.teamId) return true;
      if (!t.employeeId && !t.teamId) return true; // unscoped legacy task
    }
    
    return false;
  }).sort((a, b) => {
    // Sort by due date
    const dateA = a.dueDate ? (typeof a.dueDate === 'object' && 'toDate' in a.dueDate ? (a.dueDate as any).toDate() : new Date(a.dueDate as any)) : new Date('2099-01-01');
    const dateB = b.dueDate ? (typeof b.dueDate === 'object' && 'toDate' in b.dueDate ? (b.dueDate as any).toDate() : new Date(b.dueDate as any)) : new Date('2099-01-01');
    return dateA.getTime() - dateB.getTime();
  });
};

export const getPendingTasksByEmployee = async (employeeId: string): Promise<Task[]> => {
  const q = query(collection(db, 'tasks'), where('employeeId', '==', employeeId));
  const querySnapshot = await getDocs(q);
  const tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Task);
  return tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
};

export const updateTask = async (id: string, data: Partial<Task>): Promise<void> => {
  await updateDoc(doc(db, 'tasks', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
  invalidateCache('tasks');
};

export const deleteTask = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'tasks', id));
  invalidateCache('tasks');
};

// ============================================
// DAILY WORK
// ============================================

export const submitDailyWork = async (
  data: Omit<DailyWork, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'dailyWork'), {
    ...data,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getAllDailyWork = async (): Promise<DailyWork[]> => {
  const q = query(collection(db, 'dailyWork'), orderBy('date', 'desc'));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as DailyWork);
};

export const deleteDailyWork = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'dailyWork', id));
};

export const getDailyWorkByEmployee = async (employeeId: string): Promise<DailyWork[]> => {
  const q = query(collection(db, 'dailyWork'), where('employeeId', '==', employeeId));
  const querySnapshot = await getDocs(q);
  const works = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as DailyWork);
  return works.sort((a, b) => {
    const dateA = a.date instanceof Date ? a.date.getTime() : new Date(a.date).getTime();
    const dateB = b.date instanceof Date ? b.date.getTime() : new Date(b.date).getTime();
    return dateB - dateA;
  });
};

export const getDailyWorkByDate = async (
  employeeId: string, 
  date: Date
): Promise<DailyWork[]> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const q = query(collection(db, 'dailyWork'), where('employeeId', '==', employeeId));
  const querySnapshot = await getDocs(q);
  const works = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as DailyWork);
  
  return works.filter(w => {
    const wDate = w.date instanceof Date ? w.date.getTime() : new Date(w.date).getTime();
    return wDate >= startOfDay.getTime() && wDate <= endOfDay.getTime();
  });
};

// ============================================
// REPORTS
// ============================================

export const submitReport = async (
  data: Omit<Report, 'id'>,
  file?: File
): Promise<string> => {
  let fileURL = '';
  
  if (file) {
    const fileRef = ref(storage, `reports/${data.employeeId}/${file.name}`);
    await uploadBytes(fileRef, file);
    fileURL = await getDownloadURL(fileRef);
  }

  const docRef = await addDoc(collection(db, 'reports'), {
    ...data,
    fileURL,
    submittedAt: serverTimestamp()
  });
  return docRef.id;
};

export const getReportsByEmployee = async (employeeId: string): Promise<Report[]> => {
  const q = query(collection(db, 'reports'), where('employeeId', '==', employeeId));
  const querySnapshot = await getDocs(q);
  const reports = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Report);
  return reports.sort((a, b) => {
    const dateA = a.submittedAt instanceof Date ? a.submittedAt.getTime() : new Date(a.submittedAt).getTime();
    const dateB = b.submittedAt instanceof Date ? b.submittedAt.getTime() : new Date(b.submittedAt).getTime();
    return dateB - dateA;
  });
};

export const getReportsByType = async (type: string): Promise<Report[]> => {
  const q = query(collection(db, 'reports'), where('type', '==', type));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Report);
};

export const reviewReport = async (
  reportId: string, 
  reviewerId: string, 
  status: 'approved' | 'rejected',
  feedback?: string
): Promise<void> => {
  await updateDoc(doc(db, 'reports', reportId), {
    status,
    reviewedBy: reviewerId,
    reviewedAt: serverTimestamp(),
    feedback: feedback || ''
  });
};

// ============================================
// NOTICES
// ============================================

export const createNotice = async (
  data: Omit<Notice, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'notices'), {
    ...data,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getAllNotices = async (limit_count: number = 50): Promise<Notice[]> => {
  const q = query(
    collection(db, 'notices'), 
    orderBy('createdAt', 'desc'),
    limit(limit_count)
  );
  const querySnapshot = await getDocs(q);
  const allNotices = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Notice);
  return allNotices.filter(n => n.isActive !== false);
};

export const getNoticesByCategory = async (category: string): Promise<Notice[]> => {
  const q = query(collection(db, 'notices'), where('category', '==', category));
  const querySnapshot = await getDocs(q);
  let notices = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Notice);
  
  notices = notices.filter(n => n.isActive === true);
  return notices.sort((a, b) => {
    const dateA = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
    const dateB = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
    return dateB - dateA;
  });
};

export const updateNotice = async (id: string, data: Partial<Notice>): Promise<void> => {
  await updateDoc(doc(db, 'notices', id), data);
};

export const deleteNotice = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'notices', id));
};

// ============================================
// NOTIFICATIONS
// ============================================

export const createNotification = async (
  data: Omit<Notification, 'id'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'notifications'), {
    ...data,
    read: false,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const getUserNotifications = async (userId: string): Promise<Notification[]> => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Notification);
};

export const markNotificationRead = async (notificationId: string): Promise<void> => {
  await updateDoc(doc(db, 'notifications', notificationId), { read: true });
};

export const markAllNotificationsRead = async (userId: string): Promise<void> => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    where('read', '==', false)
  );
  const querySnapshot = await getDocs(q);
  
  const batch = querySnapshot.docs.map(doc => 
    updateDoc(doc.ref, { read: true })
  );
  await Promise.all(batch);
};

// ============================================
// TEAMS
// ============================================

export const createTeam = async (data: Omit<Team, 'id'>): Promise<string> => {
  const docRef = await addDoc(collection(db, 'teams'), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  invalidateCache('teams');
  return docRef.id;
};

export const getTeamsByDepartment = async (departmentId: string): Promise<Team[]> => {
  const q = query(collection(db, 'teams'), where('departmentId', '==', departmentId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Team);
};

export const getTeamsBySupervisor = async (supervisorId: string): Promise<Team[]> => {
  const q = query(collection(db, 'teams'), where('supervisorId', '==', supervisorId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Team);
};

export const updateTeam = async (id: string, data: Partial<Team>): Promise<void> => {
  await updateDoc(doc(db, 'teams', id), {
    ...data,
    updatedAt: serverTimestamp()
  });
};

export const deleteTeam = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'teams', id));
  invalidateCache('teams');
};

// ============================================
// LOOKUP HELPERS (for bulk upload / validation)
// ============================================

/** Look up a department by its name within a specific area */
export const getDepartmentByNameAndArea = async (
  name: string,
  areaCode: string
): Promise<Department | null> => {
  const q = query(
    collection(db, 'departments'),
    where('areaCode', '==', areaCode),
    where('name', '==', name)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Department;
};

/** Look up a team by its name within a specific department */
export const getTeamByNameAndDepartment = async (
  name: string,
  departmentId: string
): Promise<Team | null> => {
  const q = query(
    collection(db, 'teams'),
    where('departmentId', '==', departmentId),
    where('name', '==', name)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Team;
};

// ============================================
// ANALYTICS
// ============================================

export const getDashboardAnalytics = async () => {
  const cached = getCached<any>('analytics:dashboard');
  if (cached) return cached;

  const [users, departments, projects, tasks, teams] = await Promise.all([
    getAllUsers(),
    getAllDepartments(),
    getAllProjects(),
    getAllTasks(),
    getAllTeams()
  ]);

  const totalEmployees = users.filter(u => 
    ['employee', 'intern', 'apprentice'].includes(u.role)
  ).length;

  const activeProjects = projects.filter(p => p.status === 'active').length;
  const completedProjects = projects.filter(p => p.status === 'completed').length;
  
  const pendingTasks = tasks.filter(t => 
    ['pending', 'in_progress'].includes(t.status)
  ).length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  // Users grouped by area code
  const usersPerArea: Record<string, number> = {};
  users.forEach(u => {
    const ac = u.areaCode || 'unassigned';
    usersPerArea[ac] = (usersPerArea[ac] || 0) + 1;
  });

  // Teams grouped by department name
  const teamsPerDepartment: Record<string, number> = {};
  teams.forEach(t => {
    const dn = t.departmentName || 'Unknown';
    teamsPerDepartment[dn] = (teamsPerDepartment[dn] || 0) + 1;
  });

  // Total teams and areas with users
  const totalTeams = teams.length;
  const totalAreas = new Set(users.map(u => u.areaCode).filter(Boolean)).size;

  const result = {
    totalEmployees,
    totalDepartments: departments.length,
    totalProjects: projects.length,
    activeProjects,
    completedProjects,
    pendingTasks,
    completedTasks,
    usersPerArea,
    teamsPerDepartment,
    totalTeams,
    totalAreas
  };

  setCache('analytics:dashboard', result);
  return result;
};

// ============================================
// CHAT HISTORY (Per-user chatbot persistence)
// ============================================

export const saveChatMessage = async (
  userId: string,
  userRole: string,
  message: { role: 'user' | 'assistant'; content: string }
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'chats'), {
    userId,
    userRole,
    role: message.role,
    content: message.content,
    timestamp: serverTimestamp()
  });
  return docRef.id;
};

export const getChatHistory = async (userId: string): Promise<Array<{
  id: string; userId: string; userRole?: string;
  role: 'user' | 'assistant'; content: string; timestamp: any;
}>> => {
  const q = query(
    collection(db, 'chats'),
    where('userId', '==', userId),
    orderBy('timestamp', 'asc'),
    limit(100)
  );
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
};

export const deleteChatMessage = async (messageId: string): Promise<void> => {
  await deleteDoc(doc(db, 'chats', messageId));
};

export const clearChatHistory = async (userId: string): Promise<void> => {
  const q = query(collection(db, 'chats'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  const deletions = querySnapshot.docs.map(d => deleteDoc(d.ref));
  await Promise.all(deletions);
};

// ============================================
// NOTICES (Smart Delivery Queries)
// ============================================

export const getNoticesForUser = async (
  userId: string,
  _role: string,
  teamIds: string[] = []
): Promise<Notice[]> => {
  // Get all active notices
  const allNotices = await getAllNotices(100);

  return allNotices.filter(notice => {
    const type = (notice as any).noticeType || 'global';

    // Global notices are for everyone
    if (type === 'global') return true;

    // Individual notices targeted at this user
    if (type === 'individual' && (notice as any).targetId === userId) return true;

    // Team/dept notices for user's teams
    if (type === 'team' && teamIds.includes((notice as any).targetId || '')) return true;

    // Fallback: legacy notices without noticeType are treated as global
    if (!notice.noticeType) return true;

    return false;
  });
};

// ============================================
// ACTIVITY LOGS
// ============================================

/**
 * Log a system activity. Fire-and-forget — never throws.
 * Safe to call from any context without awaiting.
 */
export const logActivity = async (
  userId: string,
  userName: string,
  userRole: string,
  actionType: ActivityActionType,
  description: string,
  module: ActivityModule,
  status: ActivityStatus = 'success'
): Promise<void> => {
  try {
    await addDoc(collection(db, 'activity_logs'), {
      userId,
      userName,
      userRole,
      actionType,
      description,
      module,
      status,
      timestamp: serverTimestamp()
    });
  } catch (err) {
    // Never throw — logging should not break user flows
    console.error('Activity log failed:', err);
  }
};

/** Get the most recent activity logs (for Admin Dashboard) */
export const getRecentActivities = async (count: number = 20): Promise<ActivityLog[]> => {
  const cached = getCached<ActivityLog[]>(`activities:recent:${count}`);
  if (cached) return cached;

  const q = query(
    collection(db, 'activity_logs'),
    orderBy('timestamp', 'desc'),
    limit(count)
  );
  const snap = await getDocs(q);
  const result = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as ActivityLog);
  setCache(`activities:recent:${count}`, result);
  return result;
};

// ============================================
// USER SETTINGS (Notification Preferences)
// ============================================

const DEFAULT_SETTINGS: UserSettings = {
  emailNotifications: true,
  systemNotifications: true
};

/** Get user settings, creating defaults if not found */
export const getUserSettings = async (userId: string): Promise<UserSettings> => {
  const cached = getCached<UserSettings>(`settings:${userId}`);
  if (cached) return cached;

  const docRef = doc(db, 'user_settings', userId);
  const snap = await getDoc(docRef);
  
  if (!snap.exists()) {
    // Create default settings
    await setDoc(docRef, { ...DEFAULT_SETTINGS, updatedAt: serverTimestamp() });
    setCache(`settings:${userId}`, DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  
  const settings = snap.data() as UserSettings;
  setCache(`settings:${userId}`, settings);
  return settings;
};

/** Update user notification settings */
export const updateUserSettings = async (
  userId: string,
  settings: Partial<UserSettings>
): Promise<void> => {
  const docRef = doc(db, 'user_settings', userId);
  await setDoc(docRef, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
  invalidateCache(`settings:${userId}`);
};

// ============================================
// TEAM MEMBER MANAGEMENT
// ============================================

/** Add a user to a team (updates both team.memberIds and user.teamId/teamName) */
export const addTeamMember = async (teamId: string, userId: string): Promise<void> => {
  const teamRef = doc(db, 'teams', teamId);
  const teamSnap = await getDoc(teamRef);
  if (!teamSnap.exists()) throw new Error('Team not found');
  const teamData = teamSnap.data();

  // Add to team memberIds
  await updateDoc(teamRef, { memberIds: arrayUnion(userId), updatedAt: serverTimestamp() });

  // Update user's teamId and teamName
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    teamId,
    teamName: teamData.name || '',
    departmentId: teamData.departmentId || '',
    department: teamData.departmentName || '',
    updatedAt: serverTimestamp()
  });

  invalidateCache('teams');
  invalidateCache('users');
};

/** Remove a user from a team */
export const removeTeamMember = async (teamId: string, userId: string): Promise<void> => {
  const teamRef = doc(db, 'teams', teamId);
  await updateDoc(teamRef, { memberIds: arrayRemove(userId), updatedAt: serverTimestamp() });

  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    teamId: '',
    teamName: '',
    updatedAt: serverTimestamp()
  });

  invalidateCache('teams');
  invalidateCache('users');
};

/** Transfer a member from one team to another */
export const transferTeamMember = async (
  fromTeamId: string,
  toTeamId: string,
  userId: string
): Promise<void> => {
  // Remove from old team
  const fromRef = doc(db, 'teams', fromTeamId);
  await updateDoc(fromRef, { memberIds: arrayRemove(userId), updatedAt: serverTimestamp() });

  // Add to new team
  const toRef = doc(db, 'teams', toTeamId);
  const toSnap = await getDoc(toRef);
  if (!toSnap.exists()) throw new Error('Target team not found');
  const toData = toSnap.data();
  await updateDoc(toRef, { memberIds: arrayUnion(userId), updatedAt: serverTimestamp() });

  // Update user
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    teamId: toTeamId,
    teamName: toData.name || '',
    departmentId: toData.departmentId || '',
    department: toData.departmentName || '',
    updatedAt: serverTimestamp()
  });

  invalidateCache('teams');
  invalidateCache('users');
};

/** Get full User objects for all members of a team */
export const getTeamMembers = async (teamId: string): Promise<User[]> => {
  const teamRef = doc(db, 'teams', teamId);
  const teamSnap = await getDoc(teamRef);
  if (!teamSnap.exists()) return [];
  const memberIds: string[] = teamSnap.data().memberIds || [];
  if (memberIds.length === 0) return [];

  const users: User[] = [];
  for (const uid of memberIds) {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) {
      users.push({ uid: userSnap.id, ...userSnap.data() } as User);
    }
  }
  return users;
};

/** Get users in an area eligible for team assignment.
 *  If targetTeamId is provided, excludes users already in that team.
 *  Otherwise returns all team-eligible users in the area.
 */
export const getUsersAvailableForTeam = async (areaCode: string, targetTeamId?: string): Promise<User[]> => {
  const teamRoles = ['employee', 'intern', 'apprentice'];
  const q = query(collection(db, 'users'), where('areaCode', '==', areaCode));
  const snap = await getDocs(q);

  let existingMemberIds: string[] = [];
  if (targetTeamId) {
    const teamSnap = await getDoc(doc(db, 'teams', targetTeamId));
    if (teamSnap.exists()) {
      existingMemberIds = teamSnap.data().memberIds || [];
    }
  }

  return snap.docs
    .map(d => ({ uid: d.id, ...d.data() } as User))
    .filter(u => teamRoles.includes(u.role) && !existingMemberIds.includes(u.uid));
};

/** Get tasks scoped to a department */
export const getTasksByDepartment = async (departmentId: string): Promise<Task[]> => {
  const q = query(collection(db, 'tasks'), where('departmentId', '==', departmentId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
};

/** Get tasks scoped to a team */
export const getTasksByTeam = async (teamId: string): Promise<Task[]> => {
  const q = query(collection(db, 'tasks'), where('teamId', '==', teamId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
};

/** Get tasks scoped to an area */
export const getTasksByArea = async (areaCode: string): Promise<Task[]> => {
  const q = query(collection(db, 'tasks'), where('areaCode', '==', areaCode));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
};
