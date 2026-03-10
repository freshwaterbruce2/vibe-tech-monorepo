import { DatabaseService } from '../../../services/DatabaseService';
import { logger } from '../../../services/Logger';

let dbService: DatabaseService | null = null;
let dbInitError: Error | null = null;

export const getDatabase = async (): Promise<DatabaseService> => {
  if (!dbService) {
    dbService = new DatabaseService();
    try {
      await dbService.initialize();
      logger.info('[App] Database initialized successfully');
    } catch (error) {
      dbInitError = error as Error;
      logger.warn('[App] Database initialization failed, using localStorage fallback:', error);
      // Service will automatically use localStorage fallback
    }

    // Expose to window for debugging (development only)
    if (process.env['NODE_ENV'] === 'development') {
      (window as any).__deepcodeDB = dbService;
      (window as any).__deepcodeDBStatus = async () => dbService?.getStatus();
      logger.debug('[App] Database service exposed to window.__deepcodeDB for debugging');
    }
  }
  return dbService;
};

export const getDbInitError = () => dbInitError;
