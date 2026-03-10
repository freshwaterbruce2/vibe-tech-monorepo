/**
 * NOTIFICATION SYSTEM - INTEGRATION GUIDE
 * =========================================
 *
 * This file demonstrates how to integrate and use the notification system in vibe-tutor.
 *
 * STEP 1: Wrap your app with NotificationProvider
 * ------------------------------------------------
 * In your main App.tsx or main.tsx, wrap your app with the NotificationProvider:
 *
 * ```tsx
 * import { NotificationProvider } from './contexts/NotificationContext';
 * import NotificationContainer from './components/ui/NotificationContainer';
 *
 * function App() {
 *   return (
 *     <NotificationProvider maxNotifications={5}>
 *       <YourAppContent />
 *       <NotificationContainer />
 *     </NotificationProvider>
 *   );
 * }
 * ```
 *
 * STEP 2: Use the hook in your components
 * ----------------------------------------
 * Import and use the useNotifications hook anywhere in your app:
 *
 * ```tsx
 * import { useNotifications } from '../../hooks/useNotifications';
 *
 * function MyComponent() {
 *   const { error, success, warning, info } = useNotifications();
 *
 *   const handleError = () => {
 *     error('Error', 'Something went wrong!');
 *   };
 *
 *   const handleSuccess = () => {
 *     success('Success', 'Operation completed successfully!');
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleError}>Show Error</button>
 *       <button onClick={handleSuccess}>Show Success</button>
 *     </div>
 *   );
 * }
 * ```
 */

import React from 'react';
import { useNotifications } from '../../hooks/useNotifications';

/**
 * Example component demonstrating all notification types
 */
export const NotificationExamples = () => {
  const { error, warning, success, info, clearAll } = useNotifications();

  return (
    <div className="glass-card p-6 space-y-4 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-4">
        Notification System Examples
      </h2>

      {/* Error Notifications */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Error Notifications</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => error('Error', 'This is an error notification')}
            className="glass-button px-4 py-2 text-sm"
          >
            Show Error
          </button>
          <button
            onClick={() => error('Critical Error', 'This error does not auto-dismiss', 0)}
            className="glass-button px-4 py-2 text-sm"
          >
            Persistent Error
          </button>
          <button
            onClick={() =>
              error('Database Error', 'Failed to connect to the database. Please try again.')
            }
            className="glass-button px-4 py-2 text-sm"
          >
            Database Error
          </button>
        </div>
      </div>

      {/* Warning Notifications */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Warning Notifications</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => warning('Warning', 'This is a warning notification')}
            className="glass-button px-4 py-2 text-sm"
          >
            Show Warning
          </button>
          <button
            onClick={() =>
              warning('Low Storage', 'You are running low on storage space.', 10000)
            }
            className="glass-button px-4 py-2 text-sm"
          >
            Storage Warning (10s)
          </button>
          <button
            onClick={() =>
              warning('Session Expiring', 'Your session will expire in 5 minutes.')
            }
            className="glass-button px-4 py-2 text-sm"
          >
            Session Warning
          </button>
        </div>
      </div>

      {/* Success Notifications */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">
          Success Notifications
        </h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => success('Success', 'Operation completed successfully!')}
            className="glass-button px-4 py-2 text-sm"
          >
            Show Success
          </button>
          <button
            onClick={() =>
              success('Homework Saved', 'Your homework has been saved successfully.', 3000)
            }
            className="glass-button px-4 py-2 text-sm"
          >
            Save Success (3s)
          </button>
          <button
            onClick={() => success('Achievement Unlocked', 'You earned 100 points!')}
            className="glass-button px-4 py-2 text-sm"
          >
            Achievement Success
          </button>
        </div>
      </div>

      {/* Info Notifications */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Info Notifications</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => info('Info', 'This is an informational notification')}
            className="glass-button px-4 py-2 text-sm"
          >
            Show Info
          </button>
          <button
            onClick={() =>
              info('New Feature', 'Check out our new feature in the settings menu!')
            }
            className="glass-button px-4 py-2 text-sm"
          >
            Feature Info
          </button>
          <button
            onClick={() => info('Tip', 'You can customize notification duration!', 7000)}
            className="glass-button px-4 py-2 text-sm"
          >
            Tip Info (7s)
          </button>
        </div>
      </div>

      {/* Multiple Notifications */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Multiple Notifications</h3>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => {
              info('Step 1', 'Starting process...', 2000);
              setTimeout(() => success('Step 2', 'Process completed!', 2000), 500);
              setTimeout(() => warning('Step 3', 'Please review results', 2000), 1000);
            }}
            className="glass-button px-4 py-2 text-sm"
          >
            Show Sequence
          </button>
          <button
            onClick={() => {
              for (let i = 1; i <= 3; i++) {
                setTimeout(() => {
                  info(`Notification ${i}`, `This is notification number ${i}`);
                }, i * 200);
              }
            }}
            className="glass-button px-4 py-2 text-sm"
          >
            Show Stack
          </button>
        </div>
      </div>

      {/* Clear All */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Actions</h3>
        <button
          onClick={clearAll}
          className="glass-button px-4 py-2 text-sm bg-red-500/20 hover:bg-red-500/30"
        >
          Clear All Notifications
        </button>
      </div>

      {/* API Reference */}
      <div className="mt-6 p-4 glass-card bg-[var(--background-surface)]">
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">API Reference</h3>
        <pre className="text-xs text-[var(--text-secondary)] overflow-x-auto">
          {`
// Basic usage
const { error, warning, success, info } = useNotifications();

// Show notifications
error(title, message, duration?)
warning(title, message, duration?)
success(title, message, duration?)
info(title, message, duration?)

// Duration: milliseconds (default: 5000)
// Set duration to 0 for persistent notifications

// Clear all notifications
clearAll()

// Remove specific notification
removeNotification(id)
          `}
        </pre>
      </div>
    </div>
  );
};

export default NotificationExamples;
