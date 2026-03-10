/**
 * Common user fixtures for testing
 */

export interface MockUser {
  id: string | number;
  name: string;
  email: string;
  role?: 'user' | 'admin' | 'guest';
  createdAt?: string;
}

export const mockUsers: MockUser[] = [
  {
    id: 1,
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'user',
    createdAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    role: 'admin',
    createdAt: '2024-01-02T00:00:00Z',
  },
  {
    id: 3,
    name: 'Bob Johnson',
    email: 'bob.johnson@example.com',
    role: 'user',
    createdAt: '2024-01-03T00:00:00Z',
  },
];

/**
 * Create a mock user with custom overrides
 * Usage: const user = createMockUser({ name: 'Custom Name' })
 */
export function createMockUser(overrides: Partial<MockUser> = {}): MockUser {
  return {
    id: Math.floor(Math.random() * 10000),
    name: 'Test User',
    email: `test.user.${Date.now()}@example.com`,
    role: 'user',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create multiple mock users
 * Usage: const users = createMockUsers(5)
 */
export function createMockUsers(count: number, overrides: Partial<MockUser> = {}): MockUser[] {
  return Array.from({ length: count }, (_, i) =>
    createMockUser({
      id: i + 1,
      name: `Test User ${i + 1}`,
      ...overrides,
    })
  );
}
