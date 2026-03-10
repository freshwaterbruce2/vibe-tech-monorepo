# Testing Migration to @vibetech/testing-utils

This document shows how to migrate existing tests to use the shared testing utilities package, reducing boilerplate by ~40%.

## Benefits

- **Less boilerplate**: No need to setup `userEvent.setup()` manually
- **Consistent patterns**: Same testing utilities across all projects
- **Type-safe fixtures**: Reusable mock data with TypeScript types
- **Easy mocking**: Simple API for common mocking scenarios

## Installation

Already added to `package.json`:

```json
{
  "devDependencies": {
    "@vibetech/testing-utils": "workspace:*"
  }
}
```

Run `pnpm install` to link the package.

## Migration Examples

### 1. Custom Render Function

**Before:**

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('handles click events', async () => {
    const user = userEvent.setup(); // Manual setup
    const { getByText } = render(<MyComponent />);

    await user.click(getByText('Click me'));
    // ...
  });
});
```

**After:**

```typescript
import { render } from '@vibetech/testing-utils/vitest';
import { vi, describe, it, expect } from 'vitest';

describe('MyComponent', () => {
  it('handles click events', async () => {
    const { user, getByText } = render(<MyComponent />); // user included!

    await user.click(getByText('Click me'));
    // ...
  });
});
```

### 2. Form Testing

**Before:**

```typescript
it('fills out booking form', async () => {
  const user = userEvent.setup();
  render(<BookingForm />);

  const firstNameInput = screen.getByLabelText('First Name');
  const lastNameInput = screen.getByLabelText('Last Name');
  const emailInput = screen.getByLabelText('Email');

  await user.clear(firstNameInput);
  await user.type(firstNameInput, 'John');
  await user.clear(lastNameInput);
  await user.type(lastNameInput, 'Doe');
  await user.clear(emailInput);
  await user.type(emailInput, 'john@example.com');

  const submitButton = screen.getByText('Submit');
  await user.click(submitButton);
});
```

**After:**

```typescript
import { render, formUtils } from '@vibetech/testing-utils/vitest';

it('fills out booking form', async () => {
  const { user } = render(<BookingForm />);

  await formUtils.fillForm(user, {
    'First Name': 'John',
    'Last Name': 'Doe',
    'Email': 'john@example.com'
  });

  await formUtils.submitForm(user, 'Submit');
});
```

### 3. Mock User Fixtures

**Before:**

```typescript
const mockGuest = {
  id: 1,
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  createdAt: '2024-01-01T00:00:00Z'
};

const mockGuests = [
  { id: 1, firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
  { id: 2, firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
  { id: 3, firstName: 'Bob', lastName: 'Johnson', email: 'bob@example.com' }
];
```

**After:**

```typescript
import { createMockUser, createMockUsers } from '@vibetech/testing-utils/fixtures';

const mockGuest = createMockUser({
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com'
});

const mockGuests = createMockUsers(3);
```

### 4. API Mocking

**Before:**

```typescript
beforeEach(() => {
  global.fetch = vi.fn((url) => {
    if (url.includes('/api/hotels')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: mockHotels })
      });
    }
    if (url.includes('/api/bookings')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: mockBooking })
      });
    }
    return Promise.reject(new Error('Unmocked URL'));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
```

**After:**

```typescript
import { mockFetch, resetFetchMocks } from '@vibetech/testing-utils/mocks';

beforeEach(() => {
  mockFetch({
    '/api/hotels': { data: mockHotels },
    '/api/bookings': { data: mockBooking }
  });
});

afterEach(() => {
  resetFetchMocks();
});
```

### 5. Console Suppression

**Before:**

```typescript
let consoleErrorSpy: any;

beforeEach(() => {
  consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
});
```

**After:**

```typescript
import { mockConsole, restoreConsole } from '@vibetech/testing-utils/mocks';

let consoleMocks: any;

beforeEach(() => {
  consoleMocks = mockConsole(['error', 'warn']);
});

afterEach(() => {
  restoreConsole(consoleMocks);
});
```

## Recommended Migration Order

1. **Start with new tests**: Use @vibetech/testing-utils for all new test files
2. **Migrate simple tests first**: Tests that just need the custom render function
3. **Migrate complex tests**: Tests with form interactions and API mocking
4. **Update gradually**: No need to migrate all tests at once

## Files to Migrate (Priority Order)

1. `src/__tests__/components/booking/BookingFlow.test.tsx` - Complex form interactions
2. `src/__tests__/components/search/SearchResults.test.tsx` - API mocking
3. `src/__tests__/components/hotels/HotelDetails.test.tsx` - Fixture usage
4. `src/__tests__/components/payment/PaymentElementForm.test.tsx` - Form validation
5. All other test files as time permits

## Next Steps

1. Run `pnpm install` to link the package
2. Start with one test file migration (e.g., BookingFlow.test.tsx)
3. Run tests to verify: `pnpm test BookingFlow.test.tsx`
4. Gradually migrate remaining test files

## Full API Reference

See `packages/testing-utils/README.md` for complete API documentation.
