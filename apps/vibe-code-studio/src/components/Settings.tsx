import { Info, RotateCcw, Save, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { EditorSettings } from '../types';

import { MODELS_ARRAY } from '../services/ai/AIProviderInterface';
import ApiKeySettings from './ApiKeySettings';
import { ModelComparison } from './ModelComparison';
import { defaultSettings, getModelPricing, supportsReasoning } from './Settings.constants';
import {
    Button,
    ButtonGroup,
    CloseButton,
    ModelPricingInfo,
    NumberInput,
    SectionTitle,
    Select,
    SettingControl,
    SettingItem,
    SettingLabel,
    SettingsContent,
    SettingsHeader,
    SettingsOverlay,
    SettingsPanel,
    SettingsSection,
    Toggle,
} from './Settings.styles';

export interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
  settings: EditorSettings;
  onSettingsChange: (settings: EditorSettings) => void;
}

export const Settings = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}: SettingsProps) => {
  const [localSettings, setLocalSettings] = useState<EditorSettings>(settings);
  const [showModelComparison, setShowModelComparison] = useState(false);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  const handleReset = () => {
    setLocalSettings(defaultSettings);
  };

  const updateSetting = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
  };

  const pricing = getModelPricing(localSettings.aiModel);

  return (
    <SettingsOverlay $isOpen={isOpen}>
      <SettingsPanel>
        <SettingsHeader>
          <h2>Settings</h2>
          <CloseButton onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </SettingsHeader>

        <SettingsContent>
          {/* Appearance Section */}
          <SettingsSection>
            <SectionTitle>Appearance</SectionTitle>

            <SettingItem>
              <SettingLabel>
                Theme
                <span>Choose between standard themes or create your own</span>
              </SettingLabel>
              <SettingControl>
                <Select
                  id="theme-select"
                  name="theme"
                  aria-label="Theme selection"
                  value={localSettings.theme}
                  onChange={(e) => updateSetting('theme', e.target.value)}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="custom">Custom JSON</option>
                </Select>
              </SettingControl>
            </SettingItem>

            {localSettings.theme === 'custom' && (
              <SettingItem>
                <SettingLabel>
                  Custom Theme JSON
                  <span>Paste a VS Code compatible JSON theme</span>
                </SettingLabel>
                <SettingControl>
                  <textarea
                    value={localSettings.customThemeJson || ''}
                    onChange={(e) => updateSetting('customThemeJson', e.target.value)}
                    placeholder="{\n  'name': 'My Theme',\n  'type': 'dark',\n  'colors': { ... },\n  'tokenColors': [ ... ]\n}"
                    style={{
                      width: '100%',
                      height: '150px',
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#d4d4d4',
                      padding: '8px',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      borderRadius: '4px',
                      resize: 'vertical'
                    }}
                  />
                </SettingControl>
              </SettingItem>
            )}

            <SettingItem>
              <SettingLabel>
                Font Size
                <span>Editor font size in pixels</span>
              </SettingLabel>
              <SettingControl>
                <NumberInput
                  id="font-size-input"
                  name="fontSize"
                  aria-label="Font size in pixels"
                  value={localSettings.fontSize}
                  onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                  min="10"
                  max="24"
                />
              </SettingControl>
            </SettingItem>

            <SettingItem>
              <SettingLabel>
                Show Minimap
                <span>Display code minimap on the right side</span>
              </SettingLabel>
              <SettingControl>
                <Toggle
                  checked={localSettings.minimap}
                  onChange={(e) => updateSetting('minimap', e.target.checked)}
                />
              </SettingControl>
            </SettingItem>
          </SettingsSection>

          {/* Editor Section */}
          <SettingsSection>
            <SectionTitle>Editor</SectionTitle>

            <SettingItem>
              <SettingLabel>
                Tab Size
                <span>Number of spaces for indentation</span>
              </SettingLabel>
              <SettingControl>
                <NumberInput
                  id="tab-size-input"
                  name="tabSize"
                  aria-label="Tab size in spaces"
                  value={localSettings.tabSize}
                  onChange={(e) => updateSetting('tabSize', parseInt(e.target.value))}
                  min="1"
                  max="8"
                />
              </SettingControl>
            </SettingItem>

            <SettingItem>
              <SettingLabel>
                Word Wrap
                <span>Wrap long lines to fit editor width</span>
              </SettingLabel>
              <SettingControl>
                <Toggle
                  checked={localSettings.wordWrap}
                  onChange={(e) => updateSetting('wordWrap', e.target.checked)}
                />
              </SettingControl>
            </SettingItem>

            <SettingItem>
              <SettingLabel>
                Auto Save
                <span>Automatically save files after changes</span>
              </SettingLabel>
              <SettingControl>
                <Toggle
                  checked={localSettings.autoSave}
                  onChange={(e) => updateSetting('autoSave', e.target.checked)}
                />
              </SettingControl>
            </SettingItem>

            <SettingItem>
              <SettingLabel>
                Line Numbers
                <span>Show line numbers in the editor</span>
              </SettingLabel>
              <SettingControl>
                <Toggle
                  checked={localSettings.lineNumbers ?? true}
                  onChange={(e) => updateSetting('lineNumbers', e.target.checked)}
                />
              </SettingControl>
            </SettingItem>

            <SettingItem>
              <SettingLabel>
                Code Folding
                <span>Enable code folding for functions and blocks</span>
              </SettingLabel>
              <SettingControl>
                <Toggle
                  checked={localSettings.folding ?? true}
                  onChange={(e) => updateSetting('folding', e.target.checked)}
                />
              </SettingControl>
            </SettingItem>

            <SettingItem>
              <SettingLabel>
                Bracket Matching
                <span>Highlight matching brackets</span>
              </SettingLabel>
              <SettingControl>
                <Toggle
                  checked={localSettings.bracketMatching ?? true}
                  onChange={(e) => updateSetting('bracketMatching', e.target.checked)}
                />
              </SettingControl>
            </SettingItem>

            <SettingItem>
              <SettingLabel>
                Auto Indent
                <span>Automatically indent new lines</span>
              </SettingLabel>
              <SettingControl>
                <Toggle
                  checked={localSettings.autoIndent ?? true}
                  onChange={(e) => updateSetting('autoIndent', e.target.checked)}
                />
              </SettingControl>
            </SettingItem>

            <SettingItem>
              <SettingLabel>
                Format on Save
                <span>Automatically format code when saving</span>
              </SettingLabel>
              <SettingControl>
                <Toggle
                  checked={localSettings.formatOnSave ?? true}
                  onChange={(e) => updateSetting('formatOnSave', e.target.checked)}
                />
              </SettingControl>
            </SettingItem>

            <SettingItem>
              <SettingLabel>
                Render Whitespace
                <span>Show spaces and tabs as visible characters</span>
              </SettingLabel>
              <SettingControl>
                <Toggle
                  checked={localSettings.renderWhitespace ?? false}
                  onChange={(e) => updateSetting('renderWhitespace', e.target.checked)}
                />
              </SettingControl>
            </SettingItem>

            <SettingItem>
              <SettingLabel>
                Smooth Scrolling
                <span>Enable smooth scrolling animation</span>
              </SettingLabel>
              <SettingControl>
                <Toggle
                  checked={localSettings.smoothScrolling ?? true}
                  onChange={(e) => updateSetting('smoothScrolling', e.target.checked)}
                />
              </SettingControl>
            </SettingItem>

            <SettingItem>
              <SettingLabel>
                Cursor Blinking
                <span>Enable cursor blinking animation</span>
              </SettingLabel>
              <SettingControl>
                <Toggle
                  checked={localSettings.cursorBlinking ?? true}
                  onChange={(e) => updateSetting('cursorBlinking', e.target.checked)}
                />
              </SettingControl>
            </SettingItem>
          </SettingsSection>

          {/* AI Features Section */}
          <SettingsSection>
            <SectionTitle>AI Features</SectionTitle>

            <SettingItem>
              <SettingLabel>
                AI Auto Complete
                <span>Enable AI-powered code completions</span>
              </SettingLabel>
              <SettingControl>
                <Toggle
                  checked={localSettings.aiAutoComplete}
                  onChange={(e) => updateSetting('aiAutoComplete', e.target.checked)}
                />
              </SettingControl>
            </SettingItem>

            <SettingItem>
              <SettingLabel>
                AI Suggestions
                <span>Show AI suggestions in chat</span>
              </SettingLabel>
              <SettingControl>
                <Toggle
                  checked={localSettings.aiSuggestions}
                  onChange={(e) => updateSetting('aiSuggestions', e.target.checked)}
                />
              </SettingControl>
            </SettingItem>

            <SettingItem>
              <SettingLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  AI Model
                  <button
                    onClick={() => setShowModelComparison(!showModelComparison)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#8b5cf6',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      borderRadius: '4px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = 'rgba(139, 92, 246, 0.1)')
                    }
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    title="Compare AI models"
                  >
                    <Info size={14} />
                  </button>
                </div>
                <span>Choose the AI model for code assistance</span>
              </SettingLabel>
              <SettingControl>
                <Select
                  id="ai-model-select"
                  name="aiModel"
                  aria-label="AI model selection"
                  value={localSettings.aiModel ?? 'deepseek/deepseek-v3.2'}
                  onChange={(e) => updateSetting('aiModel', e.target.value as EditorSettings['aiModel'])}
                >
                  {/* Dynamically map the latest models from the registry */}
                  <optgroup label="✨ Vibe Code Studio 2026 Models">
                    {MODELS_ARRAY.filter(m => m.recommended !== false).map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} - ${model.costPerMillionInput}/1M in
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="🏠 Local Models">
                    <option value="local/vibe-completion">Vibe Custom (Requires Local Server)</option>
                  </optgroup>
                </Select>
              </SettingControl>
            </SettingItem>

            {pricing && (
              <ModelPricingInfo>
                <div className="pricing-label">Pricing per 1M tokens</div>
                <div className="pricing-details">
                  <div className="pricing-item">
                    <span className="label">Input:</span>
                    <span className="value">{pricing.input}</span>
                  </div>
                  <div className="pricing-item">
                    <span className="label">Output:</span>
                    <span className="value">{pricing.output}</span>
                  </div>
                  <div className="pricing-item">
                    <span className="label">Context:</span>
                    <span className="value">{pricing.context}</span>
                  </div>
                </div>
              </ModelPricingInfo>
            )}

            {showModelComparison && (
              <ModelComparison currentModel={localSettings.aiModel ?? undefined} />
            )}

            {supportsReasoning(localSettings.aiModel) && (
              <SettingItem>
                <SettingLabel>
                  Show Reasoning Process
                  <span>Display extended thinking in AI responses</span>
                </SettingLabel>
                <SettingControl>
                  <Toggle
                    checked={localSettings.showReasoningProcess ?? false}
                    onChange={(e) => updateSetting('showReasoningProcess', e.target.checked)}
                  />
                </SettingControl>
              </SettingItem>
            )}
          </SettingsSection>

          {/* API Keys Section */}
          <SettingsSection>
            <SectionTitle>API Keys</SectionTitle>
            <ApiKeySettings />
          </SettingsSection>
        </SettingsContent>

        <ButtonGroup>
          <Button onClick={handleReset}>
            <RotateCcw size={16} />
            Reset to Defaults
          </Button>
          <Button $variant="primary" onClick={handleSave}>
            <Save size={16} />
            Save Changes
          </Button>
        </ButtonGroup>
      </SettingsPanel>
    </SettingsOverlay>
  );
};

export default Settings;
