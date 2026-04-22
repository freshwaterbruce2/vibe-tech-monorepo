/**
 * React 19 compatibility shim for react-dom/test-utils
 * 
 * React 19 moved `act` from react-dom/test-utils to react.
 * This shim provides backwards compatibility for libraries like
 * @testing-library/react that still import from the old location.
 */

// Re-export act from react (React 19's new location)
export { act } from 'react'

// For any other exports that might be needed from react-dom/test-utils
// We can add them here as needed
