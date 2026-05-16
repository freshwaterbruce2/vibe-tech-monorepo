import { useState, useCallback, useRef, useEffect, type FormEvent, type KeyboardEvent } from 'react';
import { Input } from "@vibetech/ui";
import { Button } from "@vibetech/ui";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@vibetech/ui";
import { Badge } from "@vibetech/ui";
import { Keyboard, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

interface AndroidVoiceFallbackProps {
  onCommandRecognized: (command: string, params?: string[]) => void;
  commandPatterns: {
    regex: RegExp;
    commandName: string;
    feedback?: string;
    example?: string;
  }[];
  compatibilityIssues: string[];
  androidDeviceInfo: {
    isAndroid: boolean;
    isWebView: boolean;
    isChrome: boolean;
    version: string | null;
  };
}

 
export const AndroidVoiceFallback = ({
  onCommandRecognized,
  commandPatterns,
  compatibilityIssues,
  androidDeviceInfo
}: AndroidVoiceFallbackProps) => {
  const [textInput, setTextInput] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [recentCommands, setRecentCommands] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Store recent commands in localStorage
  useEffect(() => {
    const stored = localStorage.getItem('android-voice-fallback-commands');
    if (stored) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setRecentCommands(JSON.parse(stored));
      } catch (error) {
        console.error('Error loading recent commands:', error);
      }
    }
  }, []);

  const saveRecentCommand = useCallback((command: string) => {
    const updated = [command, ...recentCommands.filter(c => c !== command)].slice(0, 5);
    setRecentCommands(updated);
    localStorage.setItem('android-voice-fallback-commands', JSON.stringify(updated));
  }, [recentCommands]);

  const processTextCommand = useCallback((input: string) => {
    const command = input.toLowerCase().trim();
    
    if (!command) return;

    let commandRecognized = false;

    // Check against all command patterns
    for (const pattern of commandPatterns) {
      const match = command.match(pattern.regex);
      if (match) {
        const params = match.slice(1);
        
        try {
          onCommandRecognized(pattern.commandName, params);
          
          toast.success(`${pattern.commandName} executed successfully!`, {
            description: pattern.feedback ?? 'Command processed via text input',
            duration: 2000,
          });
          
          saveRecentCommand(input);
          setTextInput('');
          commandRecognized = true;
        } catch (error) {
          console.error('Error executing command:', error);
          toast.error('Error executing command', {
            description: 'Please check your input and try again',
            duration: 3000,
          });
        }
        break;
      }
    }

    if (!commandRecognized) {
      toast.warning('Command not recognized', {
        description: 'Please check the examples below for valid commands',
        duration: 3000,
      });
    }
  }, [commandPatterns, onCommandRecognized, saveRecentCommand]);

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    processTextCommand(textInput);
  }, [textInput, processTextCommand]);

  const handleKeyPress = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      processTextCommand(textInput);
    }
  }, [textInput, processTextCommand]);

  const insertRecentCommand = useCallback((command: string) => {
    setTextInput(command);
    inputRef.current?.focus();
  }, []);

  const getCompatibilityStatus = () => {
    if (androidDeviceInfo.isWebView) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        text: "WebView Detected",
        description: "Voice commands not available in WebView apps",
        variant: "destructive" as const
      };
    }
    
    if (!androidDeviceInfo.isChrome) {
      return {
        icon: <Info className="h-4 w-4" />,
        text: "Non-Chrome Browser",
        description: "Voice commands work best in Chrome",
        variant: "secondary" as const
      };
    }
    
    if (androidDeviceInfo.version && parseFloat(androidDeviceInfo.version) < 6.0) {
      return {
        icon: <AlertTriangle className="h-4 w-4" />,
        text: "Old Android Version",
        description: "Voice commands may not work reliably",
        variant: "destructive" as const
      };
    }
    
    return {
      icon: <Info className="h-4 w-4" />,
      text: "Text Input Available",
      description: "Type commands below as an alternative to voice",
      variant: "default" as const
    };
  };

  const compatibilityStatus = getCompatibilityStatus();

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Keyboard className="h-5 w-5" />
          Voice Command Alternative
        </CardTitle>
        <CardDescription>
          Use text input instead of voice commands on this device
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Compatibility Status */}
        <div className="flex items-start gap-2">
          <Badge variant={compatibilityStatus.variant} className="flex items-center gap-1">
            {compatibilityStatus.icon}
            {compatibilityStatus.text}
          </Badge>
          <p className="text-sm text-muted-foreground flex-1">
            {compatibilityStatus.description}
          </p>
        </div>

        {/* Compatibility Issues */}
        {compatibilityIssues.length > 0 && (
          <div className="bg-muted/50 p-3 rounded-md">
            <h4 className="font-medium text-sm mb-2 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              Detected Issues:
            </h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              {compatibilityIssues.map((issue, index) => (
                <li key={index}>• {issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Text Input Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a voice command here (e.g., 'door 332')"
              className="flex-1"
            />
            <Button type="submit" disabled={!textInput.trim()}>
              Execute
            </Button>
          </div>
          
          {/* Toggle Keyboard Hint */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowKeyboard(!showKeyboard)}
            className="text-xs"
          >
            {showKeyboard ? 'Hide' : 'Show'} Command Examples
          </Button>
        </form>

        {/* Recent Commands */}
        {recentCommands.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2">Recent Commands:</h4>
            <div className="flex flex-wrap gap-2">
              {recentCommands.map((command, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => insertRecentCommand(command)}
                  className="text-xs"
                >
                  {command}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Command Examples */}
        {showKeyboard && commandPatterns.length > 0 && (
          <div className="bg-muted/50 p-3 rounded-md">
            <h4 className="font-medium text-sm mb-2">Available Commands:</h4>
            <div className="grid gap-2 text-xs">
              {commandPatterns.map((pattern, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="font-mono bg-background px-2 py-1 rounded">
                    {pattern.example ?? pattern.commandName}
                  </span>
                  <span className="text-muted-foreground">
                    {pattern.feedback ?? pattern.commandName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Device Info (for debugging) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs">
            <summary className="cursor-pointer font-medium">Device Info (Debug)</summary>
            <div className="mt-2 bg-background p-2 rounded border">
              <pre>{JSON.stringify(androidDeviceInfo, null, 2)}</pre>
            </div>
          </details>
        )}
      </CardContent>
    </Card>
  );
};