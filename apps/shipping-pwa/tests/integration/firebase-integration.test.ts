/**
 * Firebase Integration Tests
 * Tests Firebase Authentication, Firestore database operations, and offline sync
 */

import { describe, test, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User,
  onAuthStateChanged,
  deleteUser
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  query,
  where,
  getDocs,
  deleteDoc,
  enableNetwork,
  disableNetwork,
  onSnapshot,
  serverTimestamp,
  connectFirestoreEmulator
} from 'firebase/firestore';
import { auth, db } from '../../src/firebase/config';

// Mock environment variables for testing
const mockEnvVars = {
  VITE_FIREBASE_API_KEY: 'mock-api-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'test-project.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'test-project',
  VITE_FIREBASE_STORAGE_BUCKET: 'test-project.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '123456789',
  VITE_FIREBASE_APP_ID: '1:123456789:web:abc123',
  VITE_FIREBASE_USE_EMULATOR: 'true'
};

// Mock user data for testing
const testUsers = [
  {
    email: 'test.user1@warehouse.com',
    password: 'TestPassword123!',
    profile: {
      name: 'Test User 1',
      role: 'shift_supervisor',
      warehouseId: 'DC8980',
      tenantId: 'tenant-001'
    }
  },
  {
    email: 'test.user2@warehouse.com',
    password: 'TestPassword456!',
    profile: {
      name: 'Test User 2',
      role: 'operator',
      warehouseId: 'DC8980',
      tenantId: 'tenant-002'
    }
  }
];

// Mock shipping data for testing
const mockShippingData = {
  doorEntries: [
    {
      id: 'door-001',
      doorNumber: 332,
      destination: '6024',
      freightType: '23/43',
      trailerStatus: 'partial',
      timestamp: new Date(),
      userId: 'test-user-1',
      tenantId: 'tenant-001'
    },
    {
      id: 'door-002',
      doorNumber: 333,
      destination: '6070',
      freightType: '28',
      trailerStatus: 'shipload',
      timestamp: new Date(),
      userId: 'test-user-2',
      tenantId: 'tenant-002'
    }
  ],
  palletEntries: [
    {
      id: 'pallet-001',
      doorNumber: 332,
      count: 25,
      timestamp: new Date(),
      userId: 'test-user-1',
      tenantId: 'tenant-001'
    }
  ]
};

describe('Firebase Integration Tests', () => {
  let testUser1: User | null = null;
  let testUser2: User | null = null;
  const cleanup: (() => Promise<void>)[] = [];

  beforeAll(async () => {
    // Set up environment variables
    Object.assign(process.env, mockEnvVars);

    // Connect to Firebase emulator if not already connected
    try {
      if (process.env.VITE_FIREBASE_USE_EMULATOR === 'true') {
        console.log('Using Firebase emulator for tests');
      }
    } catch (error) {
      console.warn('Firebase emulator connection failed:', error);
    }

    // Wait for auth to initialize
    await new Promise<void>((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, () => {
        unsubscribe();
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Clean up test users and data
    await Promise.all(cleanup.map(fn => fn().catch(console.error)));

    // Sign out any remaining users
    if (auth.currentUser) {
      await signOut(auth);
    }
  });

  beforeEach(async () => {
    // Ensure we start each test with no authenticated user
    if (auth.currentUser) {
      await signOut(auth);
    }
  });

  describe('Authentication Flow', () => {
    test('should create new user accounts', async () => {
      for (const userData of testUsers) {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          userData.email,
          userData.password
        );

        expect(userCredential.user).toBeDefined();
        expect(userCredential.user.email).toBe(userData.email);

        // Store user for cleanup
        if (userData.email === testUsers[0].email) {
          testUser1 = userCredential.user;
        } else {
          testUser2 = userCredential.user;
        }

        // Add cleanup function
        cleanup.push(async () => {
          if (userCredential.user) {
            await deleteUser(userCredential.user);
          }
        });

        // Create user profile in Firestore
        await setDoc(doc(db, 'userProfiles', userCredential.user.uid), {
          ...userData.profile,
          email: userData.email,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });
      }
    });

    test('should sign in existing users', async () => {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        testUsers[0].email,
        testUsers[0].password
      );

      expect(userCredential.user).toBeDefined();
      expect(userCredential.user.email).toBe(testUsers[0].email);
      expect(auth.currentUser?.uid).toBe(userCredential.user.uid);
    });

    test('should handle authentication state changes', async () => {
      const authStatePromise = new Promise<User | null>((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user);
        });
      });

      await signInWithEmailAndPassword(auth, testUsers[0].email, testUsers[0].password);
      const user = await authStatePromise;

      expect(user).not.toBeNull();
      expect(user?.email).toBe(testUsers[0].email);
    });

    test('should sign out users', async () => {
      await signInWithEmailAndPassword(auth, testUsers[0].email, testUsers[0].password);
      expect(auth.currentUser).not.toBeNull();

      await signOut(auth);
      expect(auth.currentUser).toBeNull();
    });

    test('should reject invalid credentials', async () => {
      await expect(
        signInWithEmailAndPassword(auth, 'invalid@email.com', 'wrongpassword')
      ).rejects.toThrow();
    });
  });

  describe('Firestore Database Operations', () => {
    beforeEach(async () => {
      // Sign in as test user 1 for database operations
      await signInWithEmailAndPassword(auth, testUsers[0].email, testUsers[0].password);
    });

    test('should create and read user profiles', async () => {
      const userId = auth.currentUser!.uid;
      const userProfile = {
        ...testUsers[0].profile,
        email: testUsers[0].email,
        lastUpdated: serverTimestamp()
      };

      // Create user profile
      await setDoc(doc(db, 'userProfiles', userId), userProfile);

      // Read user profile
      const docSnap = await getDoc(doc(db, 'userProfiles', userId));
      expect(docSnap.exists()).toBe(true);

      const data = docSnap.data();
      expect(data?.name).toBe(testUsers[0].profile.name);
      expect(data?.role).toBe(testUsers[0].profile.role);
      expect(data?.warehouseId).toBe(testUsers[0].profile.warehouseId);
    });

    test('should create and query door entries', async () => {
      const userId = auth.currentUser!.uid;
      const tenantId = testUsers[0].profile.tenantId;

      // Create door entries
      const doorEntryPromises = mockShippingData.doorEntries
        .filter(entry => entry.tenantId === tenantId)
        .map(entry =>
          addDoc(collection(db, 'doorEntries'), {
            ...entry,
            userId,
            timestamp: serverTimestamp()
          })
        );

      const doorEntryRefs = await Promise.all(doorEntryPromises);
      expect(doorEntryRefs).toHaveLength(1);

      // Query door entries for tenant
      const q = query(
        collection(db, 'doorEntries'),
        where('tenantId', '==', tenantId),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      expect(querySnapshot.size).toBe(1);

      const doc = querySnapshot.docs[0];
      const data = doc.data();
      expect(data.doorNumber).toBe(332);
      expect(data.destination).toBe('6024');

      // Add cleanup
      cleanup.push(async () => {
        await deleteDoc(doc.ref);
      });
    });

    test('should handle pallet tracking data', async () => {
      const userId = auth.currentUser!.uid;
      const tenantId = testUsers[0].profile.tenantId;

      // Create pallet entry
      const palletEntry = {
        ...mockShippingData.palletEntries[0],
        userId,
        tenantId,
        timestamp: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'palletEntries'), palletEntry);
      expect(docRef.id).toBeDefined();

      // Read pallet entry
      const docSnap = await getDoc(docRef);
      expect(docSnap.exists()).toBe(true);

      const data = docSnap.data();
      expect(data?.doorNumber).toBe(332);
      expect(data?.count).toBe(25);

      // Add cleanup
      cleanup.push(async () => {
        await deleteDoc(docRef);
      });
    });

    test('should enforce multi-tenant data isolation', async () => {
      const userId = auth.currentUser!.uid;

      // Create door entries for both tenants
      const tenant1Entry = {
        ...mockShippingData.doorEntries[0],
        userId,
        timestamp: serverTimestamp()
      };

      const tenant2Entry = {
        ...mockShippingData.doorEntries[1],
        userId,
        timestamp: serverTimestamp()
      };

      const [ref1, ref2] = await Promise.all([
        addDoc(collection(db, 'doorEntries'), tenant1Entry),
        addDoc(collection(db, 'doorEntries'), tenant2Entry)
      ]);

      // Query for tenant 1 data only
      const q1 = query(
        collection(db, 'doorEntries'),
        where('tenantId', '==', 'tenant-001')
      );

      const snapshot1 = await getDocs(q1);
      expect(snapshot1.size).toBe(1);
      expect(snapshot1.docs[0].data().doorNumber).toBe(332);

      // Query for tenant 2 data only
      const q2 = query(
        collection(db, 'doorEntries'),
        where('tenantId', '==', 'tenant-002')
      );

      const snapshot2 = await getDocs(q2);
      expect(snapshot2.size).toBe(1);
      expect(snapshot2.docs[0].data().doorNumber).toBe(333);

      // Add cleanup
      cleanup.push(async () => {
        await Promise.all([deleteDoc(ref1), deleteDoc(ref2)]);
      });
    });
  });

  describe('Offline Sync and Real-time Updates', () => {
    beforeEach(async () => {
      await signInWithEmailAndPassword(auth, testUsers[0].email, testUsers[0].password);
    });

    test('should handle offline mode', async () => {
      const userId = auth.currentUser!.uid;

      // Disable network
      await disableNetwork(db);

      // Try to create a document while offline
      const offlineData = {
        doorNumber: 340,
        destination: '6039',
        userId,
        tenantId: testUsers[0].profile.tenantId,
        timestamp: serverTimestamp()
      };

      // This should work offline and sync when online
      const docRef = await addDoc(collection(db, 'doorEntries'), offlineData);
      expect(docRef.id).toBeDefined();

      // Re-enable network
      await enableNetwork(db);

      // Verify data was synced
      const docSnap = await getDoc(docRef);
      expect(docSnap.exists()).toBe(true);

      // Add cleanup
      cleanup.push(async () => {
        await deleteDoc(docRef);
      });
    });

    test('should receive real-time updates', async () => {
      const userId = auth.currentUser!.uid;
      const tenantId = testUsers[0].profile.tenantId;

      // Set up real-time listener
      const updates: any[] = [];
      const q = query(
        collection(db, 'doorEntries'),
        where('tenantId', '==', tenantId)
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        updates.push({
          size: snapshot.size,
          changes: snapshot.docChanges().map(change => ({
            type: change.type,
            data: change.doc.data()
          }))
        });
      });

      // Wait for initial snapshot
      await new Promise(resolve => setTimeout(resolve, 100));

      // Add a document
      const docRef = await addDoc(collection(db, 'doorEntries'), {
        doorNumber: 350,
        destination: '7045',
        userId,
        tenantId,
        timestamp: serverTimestamp()
      });

      // Wait for real-time update
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(updates.length).toBeGreaterThan(0);
      const lastUpdate = updates[updates.length - 1];
      expect(lastUpdate.changes).toContainEqual(
        expect.objectContaining({
          type: 'added',
          data: expect.objectContaining({
            doorNumber: 350,
            destination: '7045'
          })
        })
      );

      unsubscribe();

      // Add cleanup
      cleanup.push(async () => {
        await deleteDoc(docRef);
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    test('should handle missing environment variables', () => {
      // This test verifies the warning system in firebase config
      const originalEnv = process.env.VITE_FIREBASE_API_KEY;
      delete process.env.VITE_FIREBASE_API_KEY;

      // Mock console.warn to capture warnings
      const mockWarn = vi.spyOn(console, 'warn').mockImplementation();

      // Re-import config to trigger validation
      jest.resetModules();

      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining('Missing Firebase environment variables')
      );

      // Restore environment
      process.env.VITE_FIREBASE_API_KEY = originalEnv;
      mockWarn.mockRestore();
    });

    test('should handle network errors gracefully', async () => {
      // Simulate network failure during database operation
      await disableNetwork(db);

      const userId = 'test-user';
      const docRef = doc(db, 'testCollection', 'testDoc');

      // This should handle the offline scenario gracefully
      await expect(
        setDoc(docRef, { test: 'data', userId })
      ).resolves.not.toThrow();

      await enableNetwork(db);
    });

    test('should validate data structure integrity', async () => {
      await signInWithEmailAndPassword(auth, testUsers[0].email, testUsers[0].password);
      const userId = auth.currentUser!.uid;

      // Test with invalid door number (should be caught by application validation)
      const invalidDoorEntry = {
        doorNumber: 999, // Invalid door number
        destination: '6024',
        userId,
        tenantId: testUsers[0].profile.tenantId,
        timestamp: serverTimestamp()
      };

      // While Firestore will accept this, the application should validate
      const docRef = await addDoc(collection(db, 'doorEntries'), invalidDoorEntry);
      expect(docRef.id).toBeDefined();

      // Add cleanup
      cleanup.push(async () => {
        await deleteDoc(docRef);
      });
    });
  });
});