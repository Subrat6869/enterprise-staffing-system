// ============================================
// SEED DATA SCRIPT FOR DEMO USERS
// ============================================

import { auth, db } from '@/firebase/config';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import { demoUsers, demoDepartments, demoProjects, demoTasks, demoNotices } from './demoUsers';
import { toast } from 'sonner';

/**
 * Seeds demo users into Firebase Auth and Firestore
 * Call this function during app initialization or setup
 */
export const seedDemoUsers = async (): Promise<void> => {
  console.log('Starting to seed demo data...');
  
  for (const demoUser of demoUsers) {
    try {
      // Check if user already exists
      try {
        const signInResult = await signInWithEmailAndPassword(
          auth, 
          demoUser.email, 
          demoUser.password
        );
        
        // User exists, check if data exists in Firestore
        const userDoc = await getDoc(doc(db, 'users', signInResult.user.uid));
        
        if (userDoc.exists()) {
          console.log(`User ${demoUser.email} already exists with data`);
          continue;
        }
        
        // User exists in Auth but not in Firestore, create Firestore doc
        await setDoc(doc(db, 'users', signInResult.user.uid), {
          ...demoUser.userData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        console.log(`Created Firestore data for ${demoUser.email}`);
        
      } catch (signInError: any) {
        // User doesn't exist, create new user
        if (signInError.code === 'auth/invalid-credential' || 
            signInError.code === 'auth/user-not-found') {
          
          const userCredential = await createUserWithEmailAndPassword(
            auth,
            demoUser.email,
            demoUser.password
          );
          
          await setDoc(doc(db, 'users', userCredential.user.uid), {
            ...demoUser.userData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          console.log(`Created new user: ${demoUser.email}`);
        } else {
          throw signInError;
        }
      }
    } catch (error) {
      console.error(`Error seeding user ${demoUser.email}:`, error);
    }
  }
  
  console.log('Demo users seeding completed');
};

/**
 * Seeds demo departments into Firestore
 */
export const seedDemoDepartments = async (): Promise<void> => {
  console.log('Seeding demo departments...');
  
  for (const dept of demoDepartments) {
    try {
      const deptRef = doc(db, 'departments', dept.id);
      const deptDoc = await getDoc(deptRef);
      
      if (!deptDoc.exists()) {
        await setDoc(deptRef, {
          ...dept,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log(`Created department: ${dept.name}`);
      }
    } catch (error) {
      console.error(`Error seeding department ${dept.name}:`, error);
    }
  }
  
  console.log('Demo departments seeding completed');
};

/**
 * Seeds demo projects into Firestore
 */
export const seedDemoProjects = async (): Promise<void> => {
  console.log('Seeding demo projects...');
  
  for (const project of demoProjects) {
    try {
      const projectRef = doc(db, 'projects', project.id);
      const projectDoc = await getDoc(projectRef);
      
      if (!projectDoc.exists()) {
        await setDoc(projectRef, {
          ...project,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log(`Created project: ${project.name}`);
      }
    } catch (error) {
      console.error(`Error seeding project ${project.name}:`, error);
    }
  }
  
  console.log('Demo projects seeding completed');
};

/**
 * Seeds demo tasks into Firestore
 */
export const seedDemoTasks = async (): Promise<void> => {
  console.log('Seeding demo tasks...');
  
  for (const task of demoTasks) {
    try {
      const taskRef = doc(db, 'tasks', task.id);
      const taskDoc = await getDoc(taskRef);
      
      if (!taskDoc.exists()) {
        await setDoc(taskRef, {
          ...task,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log(`Created task: ${task.title}`);
      }
    } catch (error) {
      console.error(`Error seeding task ${task.title}:`, error);
    }
  }
  
  console.log('Demo tasks seeding completed');
};

/**
 * Seeds demo notices into Firestore
 */
export const seedDemoNotices = async (): Promise<void> => {
  console.log('Seeding demo notices...');
  
  for (const notice of demoNotices) {
    try {
      const noticeRef = doc(db, 'notices', notice.id);
      const noticeDoc = await getDoc(noticeRef);
      
      if (!noticeDoc.exists()) {
        await setDoc(noticeRef, {
          ...notice,
          createdAt: serverTimestamp()
        });
        console.log(`Created notice: ${notice.title}`);
      }
    } catch (error) {
      console.error(`Error seeding notice ${notice.title}:`, error);
    }
  }
  
  console.log('Demo notices seeding completed');
};

/**
 * Seeds all demo data
 */
export const seedAllDemoData = async (): Promise<void> => {
  try {
    console.log('Starting to seed all demo data...');
    
    await seedDemoDepartments();
    await seedDemoUsers();
    await seedDemoProjects();
    await seedDemoTasks();
    await seedDemoNotices();
    
    console.log('All demo data seeded successfully!');
    toast.success('Demo data initialized successfully');
  } catch (error) {
    console.error('Error seeding demo data:', error);
    toast.error('Failed to initialize demo data');
  }
};

/**
 * Check if demo data needs to be seeded
 */
export const checkAndSeedDemoData = async (): Promise<void> => {
  try {
    // Check if any users exist
    const usersSnapshot = await getDoc(doc(db, 'users', 'admin-check'));
    
    // If no users exist, seed demo data
    if (!usersSnapshot.exists()) {
      console.log('No existing data found. Seeding demo data...');
      await seedAllDemoData();
    } else {
      console.log('Data already exists. Skipping seeding.');
    }
  } catch (error) {
    console.log('Checking for existing data...');
    // Try to seed anyway
    await seedAllDemoData();
  }
};

export default {
  seedDemoUsers,
  seedDemoDepartments,
  seedDemoProjects,
  seedDemoTasks,
  seedDemoNotices,
  seedAllDemoData,
  checkAndSeedDemoData
};
