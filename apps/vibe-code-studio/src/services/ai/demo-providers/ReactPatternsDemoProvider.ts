import type { AIResponse } from '../../../types';

export class ReactPatternsDemoProvider {
  static getComponentResponse(): AIResponse {
    return {
      content: `Here's a React component example:

\`\`\`jsx
import React, { useState } from 'react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    
    try {
      // API call here
      console.debug('Login attempt:', { email, password })
    } catch (error) {
      console.error('Login failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="password">Password:</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  )
}

export default LoginForm
\`\`\`

This component includes:
- State management with useState
- Form handling
- Loading states
- Basic validation
- Proper accessibility with labels`,
      metadata: {
        model: 'demo',
        tokens: 150,
        processing_time: 200,
      },
    };
  }

  static getHookResponse(): AIResponse {
    return {
      content: `Here's a custom React hook example:

\`\`\`typescript
import { useState, useEffect, useCallback } from 'react'

interface UseApiOptions<T> {
  initialData?: T
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
}

interface UseApiResult<T> {
  data: T | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

function useApi<T>(
  fetcher: () => Promise<T>,
  dependencies: unknown[] = [],
  options: UseApiOptions<T> = {}
): UseApiResult<T> {
  const [data, setData] = useState<T | null>(options.initialData || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetcher()
      setData(result)
      options.onSuccess?.(result)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      options.onError?.(error)
    } finally {
      setLoading(false)
    }
  }, dependencies)

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    refetch: fetchData
  }
}

// Usage example
function UserProfile({ userId }: { userId: string }) {
  const { data: user, loading, error, refetch } = useApi(
    () => fetch(\`/api/users/\${userId}\`).then(res => res.json()),
    [userId],
    {
      onError: (error) => console.error('Failed to load user:', error)
    }
  )

  if (loading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>
  if (!user) return <div>No user found</div>

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
      <button onClick={refetch}>Refresh</button>
    </div>
  )
}
\`\`\`

This hook provides:
- Generic type support
- Loading and error states
- Automatic refetching
- Dependency tracking
- Success/error callbacks`,
      metadata: {
        model: 'demo',
        tokens: 160,
        processing_time: 220,
      },
    };
  }
}
