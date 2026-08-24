/**
 * Database initialization effect for app boot.
 */

import { useEffect } from 'react';
import { getDatabase, getDbInitError } from '../../modules/core/services/DatabaseManager';

import { logger } from '../../services/Logger';
import type { DbStatus } from '../types';

interface DbInitHandlers {
  setDbStatus: (status: DbStatus) => void;
  showWarning: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
}

/** Log the app_start analytics event; swallow analytics failures. */
async function logAppStart(db: Awaited<ReturnType<typeof getDatabase>>): Promise<void> {
  try {
    await db.logEvent('app_start', {
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
    });
  } catch (analyticsError) {
    logger.warn('[App] Failed to log analytics event:', analyticsError);
  }
}

/** Migrate strategy patterns into the database; swallow migration failures. */
async function migrateStrategies(db: Awaited<ReturnType<typeof getDatabase>>): Promise<void> {
  try {
    const migrationResult = await db.migrateStrategyMemory();
    if (migrationResult.migrated > 0) {
      logger.info(`[App] Migrated ${migrationResult.migrated} strategy patterns to database`);
    }
  } catch (migrationError) {
    logger.warn('[App] Strategy migration failed:', migrationError);
  }
}

/** Initialize the database, applying fallback/ready status and migrations. */
async function initDatabase(handlers: DbInitHandlers): Promise<void> {
  const { setDbStatus, showWarning, showError } = handlers;
  setDbStatus('initializing');

  try {
    const db = await getDatabase();

    const usingFallback = await db.getSetting('_db_test_key').then(
      () => false,
      () => true
    );

    if (usingFallback || getDbInitError()) {
      setDbStatus('fallback');
      showWarning(
        'Database Service',
        'Unable to access database. Using localStorage for data persistence. Some features may be limited.'
      );
      logger.info('[App] Database using localStorage fallback mode');
    } else {
      setDbStatus('ready');
      logger.info('[App] Database initialized successfully with full features');
      await logAppStart(db);
    }

    if (!usingFallback) {
      await migrateStrategies(db);
    }
  } catch (error) {
    logger.error('[App] Critical database initialization error:', error);
    setDbStatus('fallback');
    showError(
      'Database Error',
      'Failed to initialize database service. The application will continue with limited functionality.'
    );
  }
}

/** Hook for database initialization effect */
export function useDatabaseInit(props: {
  setDbStatus: (status: DbStatus) => void;
  showWarning: (title: string, message?: string) => void;
  showError: (title: string, message?: string) => void;
}) {
  const { setDbStatus, showWarning, showError } = props;

  useEffect(() => {
    const timer = setTimeout(() => {
      initDatabase({ setDbStatus, showWarning, showError }).catch(error => {
        logger.error('[App] Uncaught database initialization error:', error);
        setDbStatus('fallback');
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [showWarning, showError, setDbStatus]);
}
