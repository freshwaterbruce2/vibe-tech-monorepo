// API Types and Interfaces for Shipping PWA
// Complete type-safe API integration layer

import { DoorSchedule, PalletEntry, UserSettings } from '@/types/shipping';

// ================== Core API Types ==================

export interface ApiResponse<T = any> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
  version: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: string;
  requestId?: string;
  statusCode: number;
  type: 'client_error' | 'server_error' | 'network_error' | 'validation_error';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ================== Request/Response Types ==================

// Door Schedule API Types
export interface CreateDoorScheduleRequest {
  doorNumber: number;
  destinationDC: string;
  freightType: string;
  trailerStatus: string;
  palletCount?: number;
  tcrPresent?: boolean;
  notes?: string;
}

export interface UpdateDoorScheduleRequest extends Partial<CreateDoorScheduleRequest> {
  updatedBy?: string;
}

export interface DoorScheduleListParams {
  page?: number;
  limit?: number;
  sortBy?: 'doorNumber' | 'timestamp' | 'destinationDC';
  sortOrder?: 'asc' | 'desc';
  filterBy?: {
    destinationDC?: string;
    freightType?: string;
    trailerStatus?: string;
    dateRange?: {
      start: string;
      end: string;
    };
  };
}

// Pallet Entry API Types
export interface CreatePalletEntryRequest {
  doorNumber: number;
  count: number;
  startTime?: string;
  notes?: string;
}

export interface UpdatePalletEntryRequest extends Partial<CreatePalletEntryRequest> {
  endTime?: string;
  elapsedTime?: number;
  isActive?: boolean;
  updatedBy?: string;
}

export interface PalletEntryListParams {
  doorNumber?: number;
  isActive?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  page?: number;
  limit?: number;
}

// User Settings API Types
export interface UpdateUserSettingsRequest extends Partial<UserSettings> {
  userId?: string;
}

// Analytics and Reporting Types
export interface DoorSummaryResponse {
  totalDoors: number;
  totalPallets: number;
  doorsByStatus: Record<string, number>;
  doorsByDC: Record<string, number>;
  activePalletEntries: number;
  averagePalletsPerDoor: number;
  lastUpdated: string;
}

export interface PalletSummaryResponse {
  totalEntries: number;
  totalPallets: number;
  activeEntries: number;
  averageCountPerEntry: number;
  totalElapsedTime: number;
  lastUpdated: string;
}

export interface PerformanceMetrics {
  responseTime: number;
  requestCount: number;
  errorRate: number;
  cacheHitRate: number;
  lastChecked: string;
}

// ================== Authentication Types ==================

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginRequest {
  username: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse extends ApiResponse<AuthTokens> {
  user: {
    id: string;
    username: string;
    role: string;
    permissions: string[];
  };
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// ================== Configuration Types ==================

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableMocking: boolean;
  mockDelay: number;
  version: string;
  headers: Record<string, string>;
}

export interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  enablePersistence: boolean;
  storageKey: string;
}

// ================== Mock Data Types ==================

export interface MockDataConfig {
  enableRandomization: boolean;
  generateLargeDatasets: boolean;
  simulateNetworkDelay: boolean;
  errorRate: number; // 0-1, percentage of requests that should fail
  delayRange: [number, number]; // min, max delay in ms
}

export interface MockScenario {
  id: string;
  name: string;
  description: string;
  doorCount: number;
  palletEntryCount: number;
  responseDelay: number;
  errorRate: number;
  config: Partial<MockDataConfig>;
}

// ================== WebSocket Types ==================

export interface WebSocketMessage<T = any> {
  type: 'door_update' | 'pallet_update' | 'system_notification' | 'heartbeat';
  payload: T;
  timestamp: string;
  id: string;
}

export interface DoorUpdateMessage {
  doorSchedule: DoorSchedule;
  action: 'created' | 'updated' | 'deleted';
  updatedBy: string;
}

export interface PalletUpdateMessage {
  palletEntry: PalletEntry;
  action: 'created' | 'updated' | 'deleted';
  updatedBy: string;
}

// ================== Export Types ==================

export interface ExportRequest {
  format: 'csv' | 'json' | 'xlsx';
  dataType: 'doors' | 'pallets' | 'all';
  dateRange?: {
    start: string;
    end: string;
  };
  includeHeaders: boolean;
  compress?: boolean;
}

export interface ExportResponse extends ApiResponse<string> {
  downloadUrl: string;
  filename: string;
  fileSize: number;
  expiresAt: string;
}

// ================== Utility Types ==================

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestConfig {
  method: ApiMethod;
  url: string;
  data?: any;
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  cache?: boolean;
  cacheTTL?: number;
}

export interface InterceptorConfig {
  request?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
  response?: (response: ApiResponse) => ApiResponse | Promise<ApiResponse>;
  error?: (error: ApiError) => Promise<ApiError | any>;
}

// ================== Type Guards ==================

export const isApiError = (error: any): error is ApiError => {
  return (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    'statusCode' in error &&
    'type' in error
  );
};

export const isApiResponse = <T>(response: any): response is ApiResponse<T> => {
  return (
    response &&
    typeof response === 'object' &&
    'data' in response &&
    'success' in response &&
    'timestamp' in response &&
    'version' in response
  );
};

export const isPaginatedResponse = <T>(response: any): response is PaginatedResponse<T> => {
  return (
    isApiResponse(response) &&
    'pagination' in response &&
    Array.isArray(response.data)
  );
};

// ================== Constants ==================

export const API_ENDPOINTS = {
  // Door Schedule endpoints
  DOORS: '/api/v1/doors',
  DOOR_BY_ID: (id: string) => `/api/v1/doors/${id}`,
  DOOR_BY_NUMBER: (doorNumber: number) => `/api/v1/doors/number/${doorNumber}`,
  DOOR_SUMMARY: '/api/v1/doors/summary',

  // Pallet Entry endpoints
  PALLETS: '/api/v1/pallets',
  PALLET_BY_ID: (id: string) => `/api/v1/pallets/${id}`,
  PALLET_BY_DOOR: (doorNumber: number) => `/api/v1/pallets/door/${doorNumber}`,
  PALLET_SUMMARY: '/api/v1/pallets/summary',

  // User Settings endpoints
  USER_SETTINGS: '/api/v1/user/settings',
  USER_SETTINGS_BY_ID: (userId: string) => `/api/v1/user/${userId}/settings`,

  // Authentication endpoints
  AUTH_LOGIN: '/api/v1/auth/login',
  AUTH_REFRESH: '/api/v1/auth/refresh',
  AUTH_LOGOUT: '/api/v1/auth/logout',

  // Export endpoints
  EXPORT_DATA: '/api/v1/export',
  EXPORT_STATUS: (exportId: string) => `/api/v1/export/${exportId}/status`,

  // Analytics endpoints
  ANALYTICS_PERFORMANCE: '/api/v1/analytics/performance',
  ANALYTICS_DASHBOARD: '/api/v1/analytics/dashboard',

  // Health check
  HEALTH: '/api/v1/health',
  VERSION: '/api/v1/version',
} as const;

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const ERROR_CODES = {
  // Generic errors
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',

  // Authentication errors
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_DOOR_NUMBER: 'INVALID_DOOR_NUMBER',
  DUPLICATE_DOOR: 'DUPLICATE_DOOR',
  INVALID_PALLET_COUNT: 'INVALID_PALLET_COUNT',

  // Business logic errors
  DOOR_NOT_FOUND: 'DOOR_NOT_FOUND',
  PALLET_NOT_FOUND: 'PALLET_NOT_FOUND',
  OPERATION_NOT_ALLOWED: 'OPERATION_NOT_ALLOWED',

  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',

  // Server errors
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  DATABASE_ERROR: 'DATABASE_ERROR',
} as const;