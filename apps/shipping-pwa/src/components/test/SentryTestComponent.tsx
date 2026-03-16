import { useState } from 'react';
import { Button } from "@vibetech/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bug, CheckCircle, AlertTriangle } from 'lucide-react';
import { captureError, captureMessage, addBreadcrumb, setUser, setTags } from '@/lib/sentry';
import { handleError, createAppError, ErrorType } from '@/utils/errorHandling';

/**
 * Test component for verifying Sentry integration
 * This component should be removed in production
 */
 
export function SentryTestComponent() {
  const [testResults, setTestResults] = useState<string[]>([]);

  const addResult = (result: string) => {
    setTestResults(prev => [...prev, result]);
  };

  const testDirectSentryError = () => {
    try {
      addBreadcrumb('Testing direct Sentry error capture', 'test', 'info');

      const testError = new Error('Test error from Sentry integration');
      const eventId = captureError(testError, {
        tags: { testType: 'direct', component: 'SentryTestComponent' },
        extra: { testData: 'Direct error test' },
        level: 'warning'
      });

      addResult(`✅ Direct error captured with event ID: ${eventId}`);
    } catch (error) {
      addResult(`❌ Direct error test failed: ${error}`);
    }
  };

  const testSentryMessage = () => {
    try {
      const eventId = captureMessage(
        'Test message from Sentry integration',
        'info',
        {
          tags: { testType: 'message', component: 'SentryTestComponent' },
          extra: { testData: 'Message test' }
        }
      );

      addResult(`✅ Message captured with event ID: ${eventId}`);
    } catch (error) {
      addResult(`❌ Message test failed: ${error}`);
    }
  };

  const _testErrorBoundaryCapture = () => {
    try {
      // This will trigger the error boundary
      throw new Error('Test error to trigger ErrorBoundary');
    } catch {
      addResult(`❌ This should have triggered the error boundary`);
    }
  };

  const testAppErrorHandling = () => {
    try {
      const appError = createAppError(
        ErrorType.VALIDATION,
        'Test validation error for Sentry',
        {
          code: 'TEST_VALIDATION',
          details: { field: 'testField', value: 'invalid' },
          userMessage: 'This is a test validation error',
          recoverable: true
        }
      );

      handleError(appError, 'SentryTestComponent');
      addResult(`✅ App error handled and sent to Sentry`);
    } catch (error) {
      addResult(`❌ App error test failed: ${error}`);
    }
  };

  const testUserContext = () => {
    try {
      setUser({
        id: 'test-user-123',
        username: 'test-user',
        email: 'test@example.com'
      });

      setTags({
        testEnvironment: 'development',
        feature: 'sentry-integration'
      });

      addResult(`✅ User context and tags set successfully`);
    } catch (error) {
      addResult(`❌ User context test failed: ${error}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const runAllTests = async () => {
    clearResults();
    addResult('🧪 Starting Sentry integration tests...');

    // Run tests with delays to see them individually
    testUserContext();
    await new Promise(resolve => setTimeout(resolve, 500));

    testSentryMessage();
    await new Promise(resolve => setTimeout(resolve, 500));

    testDirectSentryError();
    await new Promise(resolve => setTimeout(resolve, 500));

    testAppErrorHandling();
    await new Promise(resolve => setTimeout(resolve, 500));

    addResult('🎉 All tests completed!');
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="w-5 h-5" />
          Sentry Integration Test
        </CardTitle>
        <CardDescription>
          Test the Sentry error monitoring integration. These tests should only be visible in development.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This component is for testing purposes only and should be removed in production builds.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-2">
          <Button onClick={testDirectSentryError} variant="outline" size="sm">
            Test Direct Error
          </Button>
          <Button onClick={testSentryMessage} variant="outline" size="sm">
            Test Message
          </Button>
          <Button onClick={testAppErrorHandling} variant="outline" size="sm">
            Test App Error
          </Button>
          <Button onClick={testUserContext} variant="outline" size="sm">
            Test User Context
          </Button>
        </div>

        <div className="flex gap-2">
          <Button onClick={runAllTests} className="flex-1">
            Run All Tests
          </Button>
          <Button onClick={clearResults} variant="outline">
            Clear Results
          </Button>
        </div>

        {testResults.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Test Results:
            </h3>
            <div className="space-y-1 text-sm">
              {testResults.map((result, index) => (
                <div key={index} className="font-mono text-xs">
                  {result}
                </div>
              ))}
            </div>
          </div>
        )}

        <Alert>
          <AlertDescription className="text-xs">
            Check your browser's console and Sentry dashboard to verify that errors are being captured correctly.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

export default SentryTestComponent;