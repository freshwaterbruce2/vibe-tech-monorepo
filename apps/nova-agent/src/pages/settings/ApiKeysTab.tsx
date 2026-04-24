import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, Eye, EyeOff, Key, Shield, XCircle } from 'lucide-react';
import { useState } from 'react';

export interface ApiKeyStatus {
  deepseek_key_set: boolean;
  groq_key_set: boolean;
  openrouter_key_set: boolean;
  google_key_set: boolean;
  kimi_key_set: boolean;
}

interface ApiKeysTabProps {
  apiKeyStatus: ApiKeyStatus | null;
  deepseekKey: string;
  groqKey: string;
  openrouterKey: string;
  googleKey: string;
  kimiKey: string;
  isSaving: boolean;
  onDeepseekKeyChange: (v: string) => void;
  onGroqKeyChange: (v: string) => void;
  onOpenrouterKeyChange: (v: string) => void;
  onGoogleKeyChange: (v: string) => void;
  onKimiKeyChange: (v: string) => void;
  onSaveApiKeys: () => void;
}

const ApiKeysTab = ({
  apiKeyStatus,
  deepseekKey,
  groqKey,
  openrouterKey,
  googleKey,
  kimiKey,
  isSaving,
  onDeepseekKeyChange,
  onGroqKeyChange,
  onOpenrouterKeyChange,
  onGoogleKeyChange,
  onKimiKeyChange,
  onSaveApiKeys,
}: ApiKeysTabProps) => {
  const [showDeepseekKey, setShowDeepseekKey] = useState(false);
  const [showGroqKey, setShowGroqKey] = useState(false);
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);
  const [showGoogleKey, setShowGoogleKey] = useState(false);
  const [showKimiKey, setShowKimiKey] = useState(false);

  return (
    <div className="space-y-4 mt-6">
      <Card className="bg-black/40 border-white/10 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-cyan-400" />
            API Key Management
          </CardTitle>
          <CardDescription>
            Securely store API keys in Windows Credential Manager
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Status */}
          {apiKeyStatus && (
            <div className="p-4 rounded-lg bg-white/5 border border-white/5">
              <h3 className="text-sm font-semibold mb-3 text-gray-300">Current Status</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  {apiKeyStatus.openrouter_key_set ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm">OpenRouter</span>
                </div>
                <div className="flex items-center gap-2">
                  {apiKeyStatus.deepseek_key_set ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm">DeepSeek</span>
                </div>
                <div className="flex items-center gap-2">
                  {apiKeyStatus.groq_key_set ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm">Groq</span>
                </div>
                <div className="flex items-center gap-2">
                  {apiKeyStatus.google_key_set ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm">Google</span>
                </div>
                <div className="flex items-center gap-2">
                  {apiKeyStatus.kimi_key_set ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-400" />
                  )}
                  <span className="text-sm">Kimi / Moonshot</span>
                </div>
              </div>
            </div>
          )}

          {/* OpenRouter API Key */}
          <ApiKeyField
            label="OpenRouter API Key"
            labelColor="text-cyan-400"
            placeholder="sk-or-v1-..."
            value={openrouterKey}
            onChange={onOpenrouterKeyChange}
            show={showOpenrouterKey}
            onToggleShow={() => setShowOpenrouterKey(!showOpenrouterKey)}
            borderColor="border-cyan-500/30"
            textColor="text-cyan-100"
            helpLink={{ url: 'https://openrouter.ai/keys', text: 'openrouter.ai/keys', color: 'text-cyan-400' }}
          />

          {/* DeepSeek API Key */}
          <ApiKeyField
            label="DeepSeek API Key"
            labelColor="text-purple-400"
            placeholder="sk-..."
            value={deepseekKey}
            onChange={onDeepseekKeyChange}
            show={showDeepseekKey}
            onToggleShow={() => setShowDeepseekKey(!showDeepseekKey)}
            borderColor="border-purple-500/30"
            textColor="text-purple-100"
          />

          {/* Groq API Key */}
          <ApiKeyField
            label="Groq API Key"
            labelColor="text-orange-400"
            placeholder="gsk_..."
            value={groqKey}
            onChange={onGroqKeyChange}
            show={showGroqKey}
            onToggleShow={() => setShowGroqKey(!showGroqKey)}
            borderColor="border-orange-500/30"
            textColor="text-orange-100"
          />

          {/* Google API Key */}
          <ApiKeyField
            label="Google API Key"
            labelColor="text-blue-400"
            placeholder="AIza..."
            value={googleKey}
            onChange={onGoogleKeyChange}
            show={showGoogleKey}
            onToggleShow={() => setShowGoogleKey(!showGoogleKey)}
            borderColor="border-blue-500/30"
            textColor="text-blue-100"
          />

          {/* Kimi / Moonshot API Key */}
          <ApiKeyField
            label="Kimi / Moonshot API Key"
            labelColor="text-rose-400"
            placeholder="sk-..."
            value={kimiKey}
            onChange={onKimiKeyChange}
            show={showKimiKey}
            onToggleShow={() => setShowKimiKey(!showKimiKey)}
            borderColor="border-rose-500/30"
            textColor="text-rose-100"
            helpLink={{ url: 'https://platform.moonshot.cn/console/api-keys', text: 'platform.moonshot.cn', color: 'text-rose-400' }}
          />

          {/* Save Button */}
          <Button
            onClick={onSaveApiKeys}
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-purple-500 to-cyan-500 hover:from-purple-600 hover:to-cyan-600"
          >
            {isSaving ? 'Saving...' : 'Save API Keys'}
          </Button>

          {/* Security Notice */}
          <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/10">
            <div className="flex items-center gap-2 text-green-500 mb-2">
              <Shield className="w-4 h-4" />
              <span className="font-semibold text-sm">Secure Storage</span>
            </div>
            <p className="text-sm text-gray-400">
              API keys are encrypted and stored in Windows Credential Manager. Only your user
              account can access them.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/* ── Reusable API key input field ── */
interface ApiKeyFieldProps {
  label: string;
  labelColor: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  borderColor: string;
  textColor: string;
  helpLink?: { url: string; text: string; color: string };
}

const ApiKeyField = ({
  label,
  labelColor,
  placeholder,
  value,
  onChange,
  show,
  onToggleShow,
  borderColor,
  textColor,
  helpLink,
}: ApiKeyFieldProps) => (
  <div className="space-y-2">
    <Label className={labelColor}>{label}</Label>
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`bg-black/50 ${borderColor} ${textColor} font-mono pr-10`}
        />
        <button
          type="button"
          onClick={onToggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </div>
    {helpLink && (
      <p className="text-xs text-gray-500">
        Get your key at{' '}
        <a
          href={helpLink.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${helpLink.color} hover:underline`}
        >
          {helpLink.text}
        </a>
      </p>
    )}
  </div>
);

export default ApiKeysTab;
