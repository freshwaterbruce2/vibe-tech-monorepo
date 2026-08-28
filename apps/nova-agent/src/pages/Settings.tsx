import SettingsLayout from '@/components/nova/SettingsLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useDbHealth } from '@/hooks/useNovaData';
import { invoke } from '@tauri-apps/api/core';
import { Store } from '@tauri-apps/plugin-store';
import { Settings as SettingsIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import AiModelsTab from './settings/AiModelsTab';
import ApiKeysTab from './settings/ApiKeysTab';
import type { ApiKeyStatus } from './settings/ApiKeysTab';
import GeneralTab from './settings/GeneralTab';
import SystemHealthTab from './settings/SystemHealthTab';

const SETTINGS_STORE_PATH = 'store.json';
const SETTINGS_ACTIVE_TAB_KEY = 'settings-active-tab';

const Settings = () => {
  const { isHealthy, lastCheck } = useDbHealth();
  const [activeModel, setActiveModel] = useState('llama-3.3-70b-versatile');
  const [groqKey, setGroqKey] = useState('');
  const hasLoadedSettings = useRef(false);

  const [activeTab, setActiveTab] = useState('ai');

  // API Key Management State
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [deepseekKey, setDeepseekKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [kimiKey, setKimiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    const loadActiveTab = async () => {
      try {
        const store = await Store.load(SETTINGS_STORE_PATH);
        const savedTab = await store.get<string>(SETTINGS_ACTIVE_TAB_KEY);
        if (!isCancelled && savedTab) {
          setActiveTab(savedTab);
        }
      } catch (error) {
        console.error('Failed to load settings tab:', error);
      } finally {
        hasLoadedSettings.current = true;
      }
    };

    void loadActiveTab();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedSettings.current) return;

    const saveActiveTab = async () => {
      try {
        const store = await Store.load(SETTINGS_STORE_PATH);
        await store.set(SETTINGS_ACTIVE_TAB_KEY, activeTab);
        await store.save();
      } catch (error) {
        console.error('Failed to save settings tab:', error);
      }
    };

    void saveActiveTab();
  }, [activeTab]);

  const handleModelChange = async (value: string) => {
    setActiveModel(value);
    try {
      await invoke('set_active_model', { model: value });
      toast({ title: 'Model Updated', description: `Model changed to ${value}` });
    } catch (error) {
      console.error('Failed to set active model:', error);
      toast({ title: 'Error', description: 'Failed to update model', variant: 'destructive' });
    }
  };

  const handleSaveGroqKey = () => {
    if (groqKey.startsWith('gsk_') && groqKey.length > 20) {
      toast({ title: 'Key Saved', description: 'Groq API Key saved (session only)' });
    } else {
      toast({ title: 'Invalid Key', description: 'Invalid Groq API Key format', variant: 'destructive' });
    }
  };

  // Load API key status on mount
  useEffect(() => {
    void loadApiKeyStatus();
  }, []);

  const loadApiKeyStatus = async () => {
    try {
      const status = await invoke<ApiKeyStatus>('get_api_key_status');
      setApiKeyStatus(status);
    } catch (error) {
      console.error('Failed to load API key status:', error);
      toast({ title: 'Error', description: 'Failed to load API key status', variant: 'destructive' });
    }
  };

  const handleSaveApiKeys = async () => {
    setIsSaving(true);
    try {
      await invoke('save_api_keys', {
        deepseekKey: deepseekKey || null,
        groqKey: groqKey || null,
        openrouterKey: openrouterKey || null,
        googleKey: googleKey || null,
        kimiKey: kimiKey || null,
      });
      toast({ title: 'API Keys Saved', description: 'Keys securely stored in Windows Credential Manager' });
      setDeepseekKey('');
      setGroqKey('');
      setOpenrouterKey('');
      setGoogleKey('');
      setKimiKey('');
      await loadApiKeyStatus();
    } catch (error) {
      console.error('Failed to save API keys:', error);
      toast({ title: 'Error', description: `Failed to save API keys: ${error}`, variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const verifyRagConnection = async () => {
    try {
      const result = await invoke('rag_search', { query: 'Who is Vanessa Freshwater?', topK: 1 });
      console.log('RAG CONNECTION VERIFIED:', JSON.stringify(result, null, 2));
      toast({ title: 'Connection Verified', description: 'Check console for raw Rust JSON response' });
    } catch (e) {
      console.error('RAG Verification Failed:', e);
      toast({ title: 'Verification Failed', description: String(e), variant: 'destructive' });
    }
  };

  return (
    <SettingsLayout>
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex items-center gap-3 mb-8">
          <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20">
            <SettingsIcon className="w-8 h-8 text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              System Settings
            </h1>
            <p className="text-gray-500 mt-1">Configure your Nova Agent environment</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-black/40 border border-white/5 p-1">
            <TabsTrigger value="general" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
              General
            </TabsTrigger>
            <TabsTrigger value="ai" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
              AI & Models
            </TabsTrigger>
            <TabsTrigger value="api-keys" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
              API Keys
            </TabsTrigger>
            <TabsTrigger value="system" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-300">
              System Health
            </TabsTrigger>
          </TabsList>

          <TabsContent value="general">
            <GeneralTab />
          </TabsContent>

          <TabsContent value="ai">
            <AiModelsTab
              activeModel={activeModel}
              groqKey={groqKey}
              onModelChange={(v) => { void handleModelChange(v); }}
              onGroqKeyChange={setGroqKey}
              onSaveGroqKey={handleSaveGroqKey}
            />
          </TabsContent>

          <TabsContent value="api-keys">
            <ApiKeysTab
              apiKeyStatus={apiKeyStatus}
              deepseekKey={deepseekKey}
              groqKey={groqKey}
              openrouterKey={openrouterKey}
              googleKey={googleKey}
              kimiKey={kimiKey}
              isSaving={isSaving}
              onDeepseekKeyChange={setDeepseekKey}
              onGroqKeyChange={setGroqKey}
              onOpenrouterKeyChange={setOpenrouterKey}
              onGoogleKeyChange={setGoogleKey}
              onKimiKeyChange={setKimiKey}
              onSaveApiKeys={() => { void handleSaveApiKeys(); }}
            />
          </TabsContent>

          <TabsContent value="system">
            <SystemHealthTab
              isHealthy={isHealthy}
              lastCheck={lastCheck}
              onVerifyRagConnection={() => { void verifyRagConnection(); }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </SettingsLayout>
  );
};

export default Settings;
