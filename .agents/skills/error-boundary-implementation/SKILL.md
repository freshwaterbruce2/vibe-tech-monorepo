---
name: error-boundary-implementation
description: Implements error boundaries in React applications to gracefully handle errors in UI components.
license: Apache-2.0
metadata:
  author: Auto-Generated
  version: '1.0.0'
  generated_from: learning_pattern__occurrences
  success_rate: 92.0%
  category: development
---

# Error Boundary Implementation

**Auto-generated from successful patterns**

## Overview

This skill provides a method for implementing error boundaries in React applications within the VibeTech Nx monorepo. Error boundaries allow React components to catch JavaScript errors anywhere in their child component tree, log those errors, and display a fallback UI instead of crashing the entire application.

## Core Capabilities

- Catch JavaScript errors in child components
- Log errors to a structured logger
- Provide a fallback UI to improve user experience during errors
- Works seamlessly with React 19 and Tailwind CSS

## Usage Examples

### Step 1: Create an Error Boundary Component

Create a new file `ErrorBoundary.tsx` in your React app's components directory:

```tsx
import React, { Component, ErrorInfo } from 'react';
import { StructuredLogger } from '@nova/logger'; // Example of using structured logger

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error to a structured logger
    StructuredLogger.error('Error caught in ErrorBoundary', { error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return <h1>Something went wrong.</h1>;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### Step 2: Wrap Components with Error Boundary

In your main application file (e.g., `App.tsx`), wrap your components with the `ErrorBoundary`:

```tsx
import React from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import SomeComponent from './components/SomeComponent';

const App = () => (
  <ErrorBoundary>
    <SomeComponent />
  </ErrorBoundary>
);

export default App;
```

## Integration with Monorepo

This skill aligns with the VibeTech Nx monorepo structure by using TypeScript 5.9 and ensuring all packages and dependencies are managed via `pnpm`. The `@nova/logger` package is utilized for structured logging, maintaining consistency across the monorepo.

## Safety Measures

- **Validation**: Ensure the `ErrorBoundary` component is tested across different components to verify that it correctly catches and logs errors.
- **Snapshots**: Maintain snapshots of critical directories (e.g., `D:\`) to recover the application state in case of failure.
- **Rollback**: If issues arise, revert to the last stable commit that does not include the error boundary changes.

## Related Skills

- [structured-logger-migration](#)
- [task-management-patterns](#)
