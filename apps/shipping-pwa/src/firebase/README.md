# Firebase Integration Guide

This guide explains how to use the Firebase integration that has been set up for the Shipping PWA.

## Overview

The Firebase integration provides:

- **Authentication** - User sign-in/sign-up with email/password
- **Cloud Firestore** - Real-time database for door entries and pallet data
- **Offline Support** - Automatic sync when connectivity is restored
- **Multi-tenant Support** - Data isolation by tenant ID

## Setup

### 1. Firebase Project Configuration

Replace the placeholder values in your `.env` file with your actual Firebase project configuration:

```bash
# Get these values from Firebase Console > Project Settings > General > Your apps > Web app
VITE_FIREBASE_API_KEY=your_actual_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_actual_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
VITE_FIREBASE_APP_ID=your_actual_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_actual_measurement_id  # Optional, for Analytics
```

### 2. Firebase Console Setup

1. Create a new Firebase project at <https://console.firebase.google.com>
2. Enable Authentication with Email/Password provider
3. Create a Firestore database
4. Set up Firestore security rules (see below)

### 3. Firestore Security Rules

Add these rules in Firebase Console > Firestore Database > Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their tenant's data
    match /doorEntries/{document} {
      allow read, write: if request.auth != null &&
        resource.data.tenantId == getUserTenantId(request.auth.uid);
    }

    match /palletData/{document} {
      allow read, write: if request.auth != null &&
        resource.data.tenantId == getUserTenantId(request.auth.uid);
    }

    match /userProfiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Helper function to get user's tenant ID
    function getUserTenantId(userId) {
      return get(/databases/$(database)/documents/userProfiles/$(userId)).data.tenantId;
    }
  }
}
```

## Usage

### 1. Basic Authentication

```typescript
import { useFirebaseSync } from '@/hooks/useFirebaseSync';

function LoginComponent() {
  const { signIn, signUp, signOut, user, isLoading } = useFirebaseSync();

  const handleSignIn = async () => {
    try {
      await signIn('user@example.com', 'password');
      console.log('Signed in successfully');
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {user ? (
        <div>
          <p>Welcome, {user.email}</p>
          <button onClick={signOut}>Sign Out</button>
        </div>
      ) : (
        <button onClick={handleSignIn}>Sign In</button>
      )}
    </div>
  );
}
```

### 2. Saving Door Entries

```typescript
import { useFirebaseSync } from '@/hooks/useFirebaseSync';

function DoorEntryForm() {
  const { saveDoorEntry } = useFirebaseSync();

  const handleSubmit = async (doorData) => {
    try {
      await saveDoorEntry({
        doorNumber: 332,
        destination: '6024',
        freightType: '23/43',
        trailerStatus: 'partial'
      });
      console.log('Door entry saved');
    } catch (error) {
      console.error('Failed to save door entry:', error);
    }
  };
}
```

### 3. Updating Pallet Counts

```typescript
import { useFirebaseSync } from '@/hooks/useFirebaseSync';

function PalletCounter() {
  const { updatePalletCount } = useFirebaseSync();

  const handlePalletUpdate = async (doorNumber: number, count: number) => {
    try {
      await updatePalletCount(doorNumber, count);
      console.log('Pallet count updated');
    } catch (error) {
      console.error('Failed to update pallet count:', error);
    }
  };
}
```

### 4. Data Synchronization

```typescript
import { useFirebaseSync } from '@/hooks/useFirebaseSync';

function SyncComponent() {
  const {
    syncToFirebase,
    syncFromFirebase,
    lastSyncAt,
    isOnline,
    syncError
  } = useFirebaseSync();

  const handleSyncUp = async () => {
    try {
      await syncToFirebase();
      console.log('Data synced to Firebase');
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  const handleSyncDown = async () => {
    try {
      await syncFromFirebase();
      console.log('Data synced from Firebase');
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  return (
    <div>
      <p>Status: {isOnline ? 'Online' : 'Offline'}</p>
      {lastSyncAt && <p>Last sync: {lastSyncAt.toLocaleString()}</p>}
      {syncError && <p>Error: {syncError}</p>}

      <button onClick={handleSyncUp}>Sync to Cloud</button>
      <button onClick={handleSyncDown}>Sync from Cloud</button>
    </div>
  );
}
```

## Data Flow

### Without Authentication (Current Behavior)

- Data is saved to `localStorage` only
- No cloud backup or sync
- Works offline by default

### With Authentication (New Capability)

- Data is saved to both `localStorage` and Firestore
- Automatic sync when online
- Real-time updates across devices
- Backup and restore capabilities

## Integration with Existing Code

The Firebase integration is designed to work seamlessly with the existing codebase:

1. **Backward Compatible**: Existing localStorage-based functionality continues to work
2. **Progressive Enhancement**: Firebase features are added on top, not replacing existing functionality
3. **Tenant-Aware**: Integrates with the existing `tenantApiService` for multi-tenant support
4. **Offline-First**: Maintains the PWA's offline capabilities

## File Structure

```
src/firebase/
├── config.ts          # Firebase app configuration and initialization
├── services.ts        # Firebase service classes for auth, firestore operations
├── README.md          # This documentation file
```

```
src/hooks/
├── useFirebaseSync.tsx # React hook for Firebase integration
```

## Error Handling

The Firebase integration includes comprehensive error handling:

- Network connectivity issues
- Authentication failures
- Firestore permission errors
- Data validation errors
- Offline/online state management

All errors are captured and exposed through the `useFirebaseSync` hook's `syncError` property.

## Performance Considerations

- **Lazy Loading**: Firebase services are only initialized when needed
- **Efficient Queries**: Firestore queries are optimized with proper indexing
- **Offline Persistence**: Firestore's offline persistence is enabled by default
- **Minimal Dependencies**: Only the required Firebase modules are imported

## Security

- **Authentication Required**: All Firestore operations require user authentication
- **Tenant Isolation**: Data is isolated by tenant ID in Firestore rules
- **Environment Variables**: Sensitive configuration is stored in environment variables
- **HTTPS Only**: Firebase requires HTTPS in production

## Development vs Production

### Development

- Set `VITE_FIREBASE_USE_EMULATOR=true` to use local Firebase emulators
- Uses development environment variables

### Production

- Ensure all Firebase environment variables are set correctly
- Enable Firebase Security Rules
- Configure proper CORS settings
- Set up monitoring and analytics

## Troubleshooting

### Common Issues

1. **Environment Variables Not Loading**
   - Ensure `.env` file is in the project root
   - Restart the development server after changing environment variables
   - Verify all required variables are set

2. **Authentication Errors**
   - Check Firebase Console > Authentication > Sign-in methods
   - Ensure Email/Password is enabled
   - Verify API key is correct

3. **Firestore Permission Errors**
   - Review Firestore security rules
   - Ensure user is authenticated before accessing data
   - Check that tenantId is properly set

4. **Sync Issues**
   - Check network connectivity
   - Verify user is authenticated
   - Look for errors in browser console

### Debug Mode

Enable debug logging by adding this to your component:

```typescript
import { enableNetwork, disableNetwork } from 'firebase/firestore';
import { db } from '@/firebase/config';

// Enable debug logging
if (import.meta.env.DEV) {
  console.log('Firebase Debug Mode Enabled');
}
```

## Next Steps

1. Set up your Firebase project and get the configuration values
2. Update the `.env` file with your Firebase configuration
3. Test authentication in development
4. Configure Firestore security rules
5. Deploy to production with proper environment variables
