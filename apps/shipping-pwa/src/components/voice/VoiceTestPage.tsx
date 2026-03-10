import React, { useState } from "react";
import { VoiceCommandButton } from "./VoiceCommandButton";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { Card, CardContent, CardHeader, CardTitle } from "@vibetech/ui";
import { Badge } from "@vibetech/ui";
import { Button } from "@vibetech/ui";

export const VoiceTestPage = () => {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isTestMode, setIsTestMode] = useState(false);

  const {
    transcript,
    interimTranscript,
    isListening,
    startListening,
    stopListening,
    confidence,
    isProcessing,
    isFinal,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition({
    engine: 'browser'
  });

  const addTestResult = (result: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [`[${timestamp}] ${result}`, ...prev.slice(0, 9)]);
  };

  const handleVoiceToggle = () => {
    addTestResult(`Voice toggle clicked - isListening: ${isListening}`);
    
    if (isListening) {
      addTestResult("Attempting to stop listening...");
      stopListening();
    } else {
      addTestResult("Attempting to start listening...");
      startListening();
    }
  };

  const runPermissionTest = async () => {
    addTestResult("Testing microphone permissions...");
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      addTestResult("✅ Microphone permission granted");
      stream.getTracks().forEach(track => track.stop());
    } catch (error) {
      addTestResult(`❌ Microphone permission denied: ${error}`);
    }
  };

  const runDeviceDetectionTest = () => {
    const userAgent = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    
    addTestResult(`Device Detection - iOS: ${isIOS}, Safari: ${isSafari}, Mobile: ${isMobile}`);
    addTestResult(`User Agent: ${userAgent.substring(0, 100)}...`);
  };

  const runSpeechRecognitionTest = () => {
    const hasWebkitSpeechRecognition = !!window.webkitSpeechRecognition;
    const hasNativeSpeechRecognition = !!window.SpeechRecognition;
    
    addTestResult(`Speech Recognition Support - Webkit: ${hasWebkitSpeechRecognition}, Native: ${hasNativeSpeechRecognition}`);
    addTestResult(`Browser Supports Speech Recognition: ${browserSupportsSpeechRecognition}`);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div className="p-4 max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎤 Voice Command Test Page
            <Badge variant={isListening ? "destructive" : "secondary"}>
              {isListening ? "Listening" : "Idle"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Voice Command Button Test */}
          <div className="border-2 border-dashed border-gray-300 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Voice Command Button Test</h3>
            <VoiceCommandButton
              isListening={isListening}
              onToggle={handleVoiceToggle}
              label="Test Voice Command"
              stopLabel="Stop Test Voice"
              className="mb-2"
            />
            <div className="text-sm text-gray-600 space-y-1">
              <div>Status: {isListening ? "🔴 Listening" : "⚪ Idle"}</div>
              <div>Processing: {isProcessing ? "🟡 Yes" : "⚪ No"}</div>
              <div>Final: {isFinal ? "✅ Yes" : "⚪ No"}</div>
              <div>Confidence: {Math.round(confidence * 100)}%</div>
            </div>
          </div>

          {/* Speech Recognition Status */}
          <div className="border-2 border-dashed border-blue-300 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Speech Recognition Status</h3>
            <div className="space-y-2 text-sm">
              <div><strong>Transcript:</strong> {transcript || "None"}</div>
              <div><strong>Interim:</strong> {interimTranscript || "None"}</div>
              <div><strong>Browser Support:</strong> {browserSupportsSpeechRecognition ? "✅ Yes" : "❌ No"}</div>
            </div>
          </div>

          {/* Test Controls */}
          <div className="border-2 border-dashed border-green-300 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Test Controls</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={runPermissionTest} variant="outline" size="sm">
                Test Permissions
              </Button>
              <Button onClick={runDeviceDetectionTest} variant="outline" size="sm">
                Test Device Detection
              </Button>
              <Button onClick={runSpeechRecognitionTest} variant="outline" size="sm">
                Test Speech Recognition
              </Button>
              <Button onClick={clearResults} variant="outline" size="sm">
                Clear Results
              </Button>
            </div>
          </div>

          {/* Test Results */}
          <div className="border-2 border-dashed border-purple-300 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Test Results</h3>
            <div className="bg-gray-100 p-3 rounded max-h-60 overflow-y-auto">
              {testResults.length === 0 ? (
                <div className="text-gray-500 text-sm">No test results yet. Click the test buttons above.</div>
              ) : (
                <div className="space-y-1 text-xs font-mono">
                  {testResults.map((result, index) => (
                    <div key={index} className="border-b border-gray-200 pb-1">
                      {result}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
