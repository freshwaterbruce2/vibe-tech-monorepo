import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Check,
  Eye,
  EyeOff,
  Key,
  Loader2,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { useEffect, useState } from 'react';

interface SettingsPanelProps {
  apiKey: string;
  onApiKeyChange: (key: string) => void;
}

type ConnectionStatus = 'checking' | 'connected' | 'disconnected' | 'error';

export function SettingsPanel({ apiKey, onApiKeyChange }: SettingsPanelProps) {
  const [showKey, setShowKey] = useState(false);
  const [tempKey, setTempKey] = useState(apiKey);
  const [isEditing, setIsEditing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('checking');
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Check connection status
  const checkConnection = async () => {
    setConnectionStatus('checking');
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        const data = await response.json();
        setConnectionStatus(data.apiConfigured ? 'connected' : 'disconnected');
      } else {
        setConnectionStatus('error');
      }
    } catch {
      setConnectionStatus('error');
    }
    setLastChecked(new Date());
  };

  // Check connection on mount and when API key changes
  useEffect(() => {
    checkConnection();
  }, [apiKey]);

  // Auto-refresh connection status every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSave = () => {
    onApiKeyChange(tempKey);
    setIsEditing(false);
    // Re-check connection after saving
    setTimeout(checkConnection, 500);
  };

  const handleCancel = () => {
    setTempKey(apiKey);
    setIsEditing(false);
  };

  const maskKey = (key: string) => {
    if (!key) return '';
    if (key.length <= 8) return '•'.repeat(key.length);
    return key.slice(0, 4) + '•'.repeat(key.length - 8) + key.slice(-4);
  };

  const getStatusConfig = () => {
    switch (connectionStatus) {
      case 'checking':
        return {
          icon: Loader2,
          text: 'Checking...',
          color: 'text-amber-500',
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          animate: 'animate-spin',
        };
      case 'connected':
        return {
          icon: Wifi,
          text: 'Connected',
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
          border: 'border-emerald-200',
          animate: '',
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          text: 'No API Key',
          color: 'text-orange-500',
          bg: 'bg-orange-50',
          border: 'border-orange-200',
          animate: '',
        };
      case 'error':
        return {
          icon: X,
          text: 'Error',
          color: 'text-red-500',
          bg: 'bg-red-50',
          border: 'border-red-200',
          animate: '',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <Card className="glass-card overflow-hidden">
      <CardHeader className="pb-3 bg-gradient-to-r from-slate-500/10 via-gray-500/5 to-transparent border-b border-slate-100/50">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-gradient-to-br from-slate-600 to-gray-700 text-white shadow-md">
              <Settings className="h-4 w-4" />
            </span>
            <span className="font-semibold">Settings</span>
          </div>
          {/* Connection Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border} border transition-all duration-300`}
          >
            <StatusIcon className={`h-3.5 w-3.5 ${statusConfig.animate}`} />
            <span>{statusConfig.text}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {/* Connection Status Card */}
        <div
          className={`p-4 rounded-xl border-2 transition-all duration-500 ${
            connectionStatus === 'connected'
              ? 'bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200'
              : connectionStatus === 'disconnected'
                ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200'
                : connectionStatus === 'error'
                  ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200'
                  : 'bg-gradient-to-br from-amber-50 to-yellow-50 border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2.5 rounded-xl ${
                  connectionStatus === 'connected'
                    ? 'bg-emerald-500'
                    : connectionStatus === 'disconnected'
                      ? 'bg-orange-500'
                      : connectionStatus === 'error'
                        ? 'bg-red-500'
                        : 'bg-amber-500'
                } text-white shadow-lg`}
              >
                {connectionStatus === 'connected' ? (
                  <Sparkles className="h-5 w-5" />
                ) : connectionStatus === 'checking' ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <WifiOff className="h-5 w-5" />
                )}
              </div>
              <div>
                <p
                  className={`font-semibold ${
                    connectionStatus === 'connected'
                      ? 'text-emerald-700'
                      : connectionStatus === 'disconnected'
                        ? 'text-orange-700'
                        : connectionStatus === 'error'
                          ? 'text-red-700'
                          : 'text-amber-700'
                  }`}
                >
                  {connectionStatus === 'connected'
                    ? 'API Connected'
                    : connectionStatus === 'disconnected'
                      ? 'API Key Required'
                      : connectionStatus === 'error'
                        ? 'Connection Failed'
                        : 'Checking Connection...'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {connectionStatus === 'connected'
                    ? 'Ready to optimize your prompts'
                    : connectionStatus === 'disconnected'
                      ? 'Enter your API key below to get started'
                      : connectionStatus === 'error'
                        ? 'Check your API key or try again'
                        : 'Verifying API connection...'}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={checkConnection}
              disabled={connectionStatus === 'checking'}
              className="h-9 w-9 p-0 hover:bg-white/50"
            >
              <RefreshCw
                className={`h-4 w-4 ${connectionStatus === 'checking' ? 'animate-spin' : ''}`}
              />
            </Button>
          </div>
          {lastChecked && (
            <p className="text-[10px] text-muted-foreground mt-2 text-right">
              Last checked: {lastChecked.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* API Key Input */}
        <div className="space-y-2">
          <label className="text-sm font-semibold bg-gradient-to-r from-slate-600 to-gray-600 bg-clip-text text-transparent flex items-center gap-2">
            <Key className="h-4 w-4 text-slate-500" />
            API Key
          </label>
          <div className="space-y-2">
            {isEditing ? (
              <div className="space-y-3">
                <div className="relative">
                  <Input
                    type={showKey ? 'text' : 'password'}
                    value={tempKey}
                    onChange={(e) => setTempKey(e.target.value)}
                    placeholder="sk-..."
                    className="pr-10 font-mono text-sm bg-white/80 border-slate-200 focus:border-violet-400 focus:ring-violet-300 rounded-xl"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSave}
                    className="flex-1 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 rounded-xl"
                    disabled={!tempKey.trim()}
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    Save Key
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1 rounded-xl border-slate-200 hover:bg-slate-50"
                  >
                    <X className="h-4 w-4 mr-1.5" />
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all group"
                onClick={() => setIsEditing(true)}
              >
                <Shield className="h-4 w-4 text-slate-400" />
                <span className="font-mono text-sm text-slate-600 flex-1">
                  {apiKey ? maskKey(apiKey) : 'Click to add API key...'}
                </span>
                <span className="text-xs text-slate-400 group-hover:text-violet-500 transition-colors">
                  Edit
                </span>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Shield className="h-3 w-3" />
            Stored securely in your browser's local storage
          </p>
        </div>

        {/* Help Link */}
        <div className="pt-2 border-t border-slate-100">
          <a
            href="https://openrouter.ai/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-violet-600 hover:text-violet-700 hover:underline flex items-center gap-1.5 transition-colors"
          >
            <Key className="h-3 w-3" />
            Get an API key →
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
