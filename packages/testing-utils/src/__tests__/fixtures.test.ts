import { describe, it, expect } from 'vitest';
import { mockUsers, createMockUser, createMockUsers } from '../fixtures/users.js';

describe('mockUsers', () => {
  it('contains 3 pre-defined users', () => {
    expect(mockUsers).toHaveLength(3);
  });

  it('has valid roles', () => {
    const validRoles = ['user', 'admin', 'guest'];
    mockUsers.forEach(user => {
      expect(validRoles).toContain(user.role);
    });
  });

  it('has unique ids', () => {
    const ids = mockUsers.map(u => u.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  it('all users have email addresses', () => {
    mockUsers.forEach(user => {
      expect(user.email).toMatch(/@/);
    });
  });
});

describe('createMockUser', () => {
  it('creates a user with default values', () => {
    const user = createMockUser();
    expect(user.name).toBe('Test User');
    expect(user.role).toBe('user');
    expect(user.email).toMatch(/@example\.com$/);
    expect(user.id).toBeDefined();
  });

  it('applies overrides', () => {
    const user = createMockUser({ name: 'Alice', role: 'admin', id: 99 });
    expect(user.name).toBe('Alice');
    expect(user.role).toBe('admin');
    expect(user.id).toBe(99);
  });

  it('generates an email matching the expected pattern', () => {
    const user = createMockUser();
    expect(user.email).toMatch(/^test\.user\.\d+@example\.com$/);
  });

  it('includes a createdAt timestamp', () => {
    const user = createMockUser();
    expect(new Date(user.createdAt!).getTime()).not.toBeNaN();
  });
});

describe('createMockUsers', () => {
  it('creates the requested number of users', () => {
    expect(createMockUsers(5)).toHaveLength(5);
  });

  it('assigns sequential ids starting at 1', () => {
    const users = createMockUsers(3);
    expect(users[0].id).toBe(1);
    expect(users[1].id).toBe(2);
    expect(users[2].id).toBe(3);
  });

  it('applies overrides to all users', () => {
    const users = createMockUsers(3, { role: 'admin' });
    users.forEach(u => expect(u.role).toBe('admin'));
  });

  it('returns empty array for count 0', () => {
    expect(createMockUsers(0)).toHaveLength(0);
  });

  it('names users sequentially', () => {
    const users = createMockUsers(2);
    expect(users[0].name).toBe('Test User 1');
    expect(users[1].name).toBe('Test User 2');
  });
});
