import type { AIResponse } from '../../../types';

export class TypeScriptPatternsDemoProvider {
  static getInterfaceResponse(): AIResponse {
    return {
      content: `Here's a TypeScript interface and implementation example:

\`\`\`typescript
interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'user' | 'guest'
  createdAt: Date
  updatedAt: Date
}

interface UserService {
  createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>
  getUserById(id: string): Promise<User | null>
  updateUser(id: string, updates: Partial<User>): Promise<User>
  deleteUser(id: string): Promise<boolean>
}

class UserServiceImpl implements UserService {
  private users: Map<string, User> = new Map()

  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const user: User = {
      ...userData,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    }
    
    this.users.set(user.id, user)
    return user
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    const existingUser = this.users.get(id)
    if (!existingUser) {
      throw new Error('User not found')
    }

    const updatedUser: User = {
      ...existingUser,
      ...updates,
      updatedAt: new Date()
    }

    this.users.set(id, updatedUser)
    return updatedUser
  }

  async deleteUser(id: string): Promise<boolean> {
    return this.users.delete(id)
  }
}
\`\`\`

This demonstrates:
- Interface definitions with union types
- Generic types and utility types (Omit, Partial)
- Class implementation of interfaces
- Async/await patterns
- Error handling`,
      metadata: {
        model: 'demo',
        tokens: 180,
        processing_time: 250,
      },
    };
  }

  static getTestResponse(): AIResponse {
    return {
      content: `Here's a comprehensive test example:

\`\`\`typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  const mockOnSubmit = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render login form with email and password fields', () => {
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument()
  })

  it('should call onSubmit with form data when submitted', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/password/i), 'password123')
    await user.click(screen.getByRole('button', { name: /login/i }))
    
    expect(mockOnSubmit).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123'
    })
  })

  it('should show loading state when submitting', async () => {
    const user = userEvent.setup()
    mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<LoginForm onSubmit={mockOnSubmit} />)
    
    await user.click(screen.getByRole('button', { name: /login/i }))
    
    expect(screen.getByText(/logging in/i)).toBeInTheDocument()
  })
})
\`\`\`

This test covers:
- Component rendering
- User interactions
- Form submission
- Loading states
- Mocking functions
- Async testing patterns`,
      metadata: {
        model: 'demo',
        tokens: 120,
        processing_time: 180,
      },
    };
  }

  static getFunctionResponse(): AIResponse {
    return {
      content: `Here are function examples with different patterns:

\`\`\`typescript
// Arrow function with type annotations
const processData = <T>(
  data: T[],
  predicate: (item: T) => boolean,
  transform: (item: T) => T
): T[] => {
  return data
    .filter(predicate)
    .map(transform)
}

// Traditional function with overloads
function formatValue(value: string): string
function formatValue(value: number): string
function formatValue(value: boolean): string
function formatValue(value: string | number | boolean): string {
  if (typeof value === 'string') {
    return value.trim().toLowerCase()
  }
  if (typeof value === 'number') {
    return value.toLocaleString()
  }
  return value ? 'yes' : 'no'
}

// Async function with error handling
const fetchWithRetry = async (
  url: string,
  maxRetries: number = 3
): Promise<Response> => {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(\`HTTP \${response.status}: \${response.statusText}\`)
      }
      return response
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      if (attempt === maxRetries) {
        throw lastError
      }
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
    }
  }

  throw lastError!
}

// Higher-order function
const createValidator = <T>(
  rules: Array<(value: T) => string | null>
) => {
  return (value: T): string[] => {
    return rules
      .map(rule => rule(value))
      .filter((error): error is string => error !== null)
  }
}

// Usage examples
const emailValidator = createValidator<string>([
  (email) => email.includes('@') ? null : 'Must contain @',
  (email) => email.length > 5 ? null : 'Too short'
])

const errors = emailValidator('test@example.com')
console.debug(errors) // []
\`\`\`

These examples show:
- Generic functions
- Function overloads
- Async/await patterns
- Error handling
- Higher-order functions
- Type guards`,
      metadata: {
        model: 'demo',
        tokens: 200,
        processing_time: 300,
      },
    };
  }
}
