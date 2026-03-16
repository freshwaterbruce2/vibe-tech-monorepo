import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth'
import {
  collection,
  deleteDoc,
  disableNetwork,
  doc,
  enableNetwork,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { auth, db } from './config'

// Types for Firestore documents
interface DoorEntry {
  id: string
  doorNumber: number
  destination: string
  freightType: string
  trailerStatus: string
  palletCount?: number
  timestamp: Timestamp
  tenantId?: string
}

interface PalletData {
  id: string
  doorNumber: number
  count: number
  timestamp: Timestamp
  tenantId?: string
}

interface UserProfile {
  id: string
  email: string
  name?: string
  tenantId?: string
  role: 'admin' | 'user'
  createdAt: Timestamp
  lastLoginAt: Timestamp
}

/**
 * Firebase Authentication Services
 */
export class FirebaseAuthService {
  /**
   * Sign in with email and password
   */
  static async signIn(email: string, password: string): Promise<User> {
    const result = await signInWithEmailAndPassword(auth, email, password)
    return result.user
  }

  /**
   * Create new user account
   */
  static async signUp(email: string, password: string): Promise<User> {
    const result = await createUserWithEmailAndPassword(auth, email, password)
    return result.user
  }

  /**
   * Sign out current user
   */
  static async signOut(): Promise<void> {
    await signOut(auth)
  }

  /**
   * Get current user
   */
  static getCurrentUser(): User | null {
    return auth.currentUser
  }

  /**
   * Listen to authentication state changes
   */
  static onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, callback)
  }
}

/**
 * Firebase Firestore Services for Door Entries
 */
export class FirebaseDoorService {
  private static COLLECTION = 'doorEntries'

  /**
   * Save door entry to Firestore
   */
  static async saveDoorEntry(
    doorEntry: Omit<DoorEntry, 'id' | 'timestamp'>
  ): Promise<string> {
    const docRef = doc(db, this.COLLECTION, crypto.randomUUID())
    const entry: Omit<DoorEntry, 'id'> = {
      ...doorEntry,
      timestamp: serverTimestamp() as Timestamp,
    }

    await setDoc(docRef, entry)
    return docRef.id
  }

  /**
   * Get door entries for a specific tenant
   */
  static async getDoorEntries(
    tenantId: string,
    limitCount = 100
  ): Promise<DoorEntry[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where('tenantId', '==', tenantId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as DoorEntry
    )
  }

  /**
   * Update existing door entry
   */
  static async updateDoorEntry(
    id: string,
    updates: Partial<DoorEntry>
  ): Promise<void> {
    const docRef = doc(db, this.COLLECTION, id)
    await updateDoc(docRef, updates)
  }

  /**
   * Delete door entry
   */
  static async deleteDoorEntry(id: string): Promise<void> {
    const docRef = doc(db, this.COLLECTION, id)
    await deleteDoc(docRef)
  }

  /**
   * Listen to real-time door entry updates for a tenant
   */
  static onDoorEntriesChange(
    tenantId: string,
    callback: (entries: DoorEntry[]) => void,
    limitCount = 100
  ): () => void {
    const q = query(
      collection(db, this.COLLECTION),
      where('tenantId', '==', tenantId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )

    return onSnapshot(q, (querySnapshot: any) => {
      const entries = querySnapshot.docs.map(
        (doc: any) =>
          ({
            id: doc.id,
            ...doc.data(),
          }) as DoorEntry
      )
      callback(entries)
    })
  }
}

/**
 * Firebase Firestore Services for Pallet Data
 */
export class FirebasePalletService {
  private static COLLECTION = 'palletData'

  /**
   * Save pallet data to Firestore
   */
  static async savePalletData(
    palletData: Omit<PalletData, 'id' | 'timestamp'>
  ): Promise<string> {
    const docRef = doc(db, this.COLLECTION, crypto.randomUUID())
    const data: Omit<PalletData, 'id'> = {
      ...palletData,
      timestamp: serverTimestamp() as Timestamp,
    }

    await setDoc(docRef, data)
    return docRef.id
  }

  /**
   * Get pallet data for a specific tenant
   */
  static async getPalletData(tenantId: string): Promise<PalletData[]> {
    const q = query(
      collection(db, this.COLLECTION),
      where('tenantId', '==', tenantId),
      orderBy('timestamp', 'desc')
    )

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map(
      doc =>
        ({
          id: doc.id,
          ...doc.data(),
        }) as PalletData
    )
  }

  /**
   * Update pallet count for a specific door
   */
  static async updatePalletCount(
    tenantId: string,
    doorNumber: number,
    count: number
  ): Promise<void> {
    // Find existing pallet data for this door
    const q = query(
      collection(db, this.COLLECTION),
      where('tenantId', '==', tenantId),
      where('doorNumber', '==', doorNumber),
      orderBy('timestamp', 'desc'),
      limit(1)
    )

    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      // Update existing record
      const docRef = querySnapshot.docs[0].ref
      await updateDoc(docRef, {
        count,
        timestamp: serverTimestamp(),
      })
    } else {
      // Create new record
      await this.savePalletData({
        doorNumber,
        count,
        tenantId,
      })
    }
  }
}

/**
 * Firebase User Profile Services
 */
export class FirebaseUserService {
  private static COLLECTION = 'userProfiles'

  /**
   * Create user profile after authentication
   */
  static async createUserProfile(
    userId: string,
    profileData: Omit<UserProfile, 'id' | 'createdAt' | 'lastLoginAt'>
  ): Promise<void> {
    const docRef = doc(db, this.COLLECTION, userId)
    const profile: Omit<UserProfile, 'id'> = {
      ...profileData,
      createdAt: serverTimestamp() as Timestamp,
      lastLoginAt: serverTimestamp() as Timestamp,
    }

    await setDoc(docRef, profile)
  }

  /**
   * Get user profile
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const docRef = doc(db, this.COLLECTION, userId)
    const docSnap = await getDoc(docRef)

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
      } as UserProfile
    }

    return null
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    const docRef = doc(db, this.COLLECTION, userId)
    await updateDoc(docRef, updates)
  }

  /**
   * Update last login time
   */
  static async updateLastLogin(userId: string): Promise<void> {
    const docRef = doc(db, this.COLLECTION, userId)
    await updateDoc(docRef, {
      lastLoginAt: serverTimestamp(),
    })
  }
}

/**
 * Firebase Offline/Online Management
 */
export class FirebaseOfflineService {
  /**
   * Enable offline persistence
   */
  static async enableOfflineMode(): Promise<void> {
    await disableNetwork(db)
  }

  /**
   * Enable online mode
   */
  static async enableOnlineMode(): Promise<void> {
    await enableNetwork(db)
  }

  /**
   * Check if Firebase is currently online
   */
  static isOnline(): boolean {
    // This is a simplified check - in a real app you'd want to monitor connection state
    return navigator.onLine
  }
}

/**
 * Utility functions for data synchronization
 */
export class FirebaseSyncService {
  /**
   * Sync local localStorage data to Firebase
   */
  static async syncLocalDataToFirebase(tenantId: string): Promise<void> {
    try {
      // Sync door entries from localStorage
      const doorEntries = JSON.parse(
        window.electronAPI?.store.get('doorEntries') || '[]'
      )
      for (const entry of doorEntries) {
        await FirebaseDoorService.saveDoorEntry({
          ...entry,
          tenantId,
        })
      }

      // Sync pallet data from localStorage
      const palletData = JSON.parse(
        window.electronAPI?.store.get('palletData') || '{}'
      )
      for (const [doorNumber, count] of Object.entries(palletData)) {
        await FirebasePalletService.updatePalletCount(
          tenantId,
          parseInt(doorNumber),
          count as number
        )
      }

      console.warn('Local data successfully synced to Firebase')
    } catch (error) {
      console.error('Failed to sync local data to Firebase:', error)
      throw error
    }
  }

  /**
   * Sync Firebase data to local storage
   */
  static async syncFirebaseToLocalData(tenantId: string): Promise<void> {
    try {
      // Sync door entries to localStorage
      const doorEntries = await FirebaseDoorService.getDoorEntries(tenantId)
      window.electronAPI?.store.set('doorEntries', JSON.stringify(doorEntries))

      // Sync pallet data to localStorage
      const palletData = await FirebasePalletService.getPalletData(tenantId)
      const palletMap: Record<string, number> = {}
      palletData.forEach(item => {
        palletMap[item.doorNumber.toString()] = item.count
      })
      window.electronAPI?.store.set('palletData', JSON.stringify(palletMap))

      console.warn('Firebase data successfully synced to local storage')
    } catch (error) {
      console.error('Failed to sync Firebase data to local storage:', error)
      throw error
    }
  }
}
