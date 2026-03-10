# @vibetech/testing-utils

Shared testing utilities, fixtures, and mocks for the VibeTech monorepo.

## Installation

This package is internal to the monorepo. Add it as a dependency:

```json
{
  "dependencies": {
    "@vibetech/testing-utils": "workspace:*"
  }
}
```

## Usage

### Custom Render Function

```typescript
import { render } from '@vibetech/testing-utils/vitest';

test('component renders', async () => {
  const { user, getByText } = render(<MyComponent />);

  // user is automatically set up with userEvent.setup()
  await user.click(getByText('Click me'));
});
```

### Form Testing Utilities

```typescript
import { render, formUtils } from '@vibetech/testing-utils/vitest';

test('fills out form', async () => {
  const { user } = render(<LoginForm />);

  await formUtils.fillForm(user, {
    username: 'testuser',
    password: 'password123'
  });

  await formUtils.submitForm(user, 'Login');
});
```

### Mock User Fixtures

```typescript
import { mockUsers, createMockUser } from '@vibetech/testing-utils/fixtures';

test('displays users', () => {
  // Use predefined mock users
  const users = mockUsers;

  // Or create custom mock users
  const admin = createMockUser({ role: 'admin', name: 'Admin User' });
  const users = createMockUsers(5); // Create 5 mock users
});
```

### API Mocking

```typescript
import { mockFetch, mockLocalStorage } from '@vibetech/testing-utils/mocks';

beforeEach(() => {
  // Mock fetch responses
  mockFetch({
    '/api/users': { data: mockUsers },
    '/api/profile': { data: mockUsers[0] }
  });

  // Mock localStorage
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage()
  });
});
```

### Console Mocking

```typescript
import { mockConsole, restoreConsole } from '@vibetech/testing-utils/mocks';

test('suppresses console output', () => {
  const mocks = mockConsole(['error', 'warn']);

  // Test code that logs errors/warnings

  restoreConsole(mocks);
});
```

## Available Exports

### `@vibetech/testing-utils/vitest`

- `render` - Custom render function with userEvent
- `createWrapper` - Create wrapper with providers
- `waitForElementToBeRemoved` - Wait for element removal
- `formUtils` - Form testing utilities
  - `fillForm` - Fill form inputs
  - `submitForm` - Submit form by button text

### `@vibetech/testing-utils/fixtures`

- `MockUser` - User interface
- `mockUsers` - Array of 3 predefined users
- `createMockUser` - Create single mock user
- `createMockUsers` - Create multiple mock users

### `@vibetech/testing-utils/mocks`

- `mockFetch` - Mock fetch with custom responses
- `resetFetchMocks` - Reset fetch mocks
- `mockLocalStorage` - Mock localStorage
- `mockConsole` - Mock console methods
- `restoreConsole` - Restore console mocks
- `advanceTimers` - Advance fake timers

## Benefits

- **Reduces test boilerplate** - Common setup patterns extracted
- **Consistent test patterns** - Same utilities across all projects
- **Type-safe** - Full TypeScript support
- **Reusable fixtures** - Share mock data across tests
- **Easy mocking** - Simple API for common mocking scenarios

## Projects Using This Package

- business-booking-platform
- shipping-pwa
- iconforge
- nova-agent
- vibe-justice

## Development

```bash
# Build the package
pnpm nx build testing-utils

# Type check
pnpm nx typecheck testing-utils

# Run tests (if any)
pnpm nx test testing-utils
```
