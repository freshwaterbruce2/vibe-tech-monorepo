import styled from 'styled-components';

import { MODELS_ARRAY } from '../services/ai/AIProviderInterface';
import { useEditorStore } from '../stores/useEditorStore';
import { vibeTheme } from '../styles/theme';

import { Dialog } from './ui/dialog';

const SettingsGroup = styled.div`
  margin-bottom: ${vibeTheme.spacing[6]};
`;

const GroupTitle = styled.h3`
  font-size: ${vibeTheme.typography.fontSize.sm};
  font-weight: ${vibeTheme.typography.fontWeight.semibold};
  color: ${vibeTheme.colors.textSecondary};
  margin-bottom: ${vibeTheme.spacing[3]};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${vibeTheme.spacing[2]} 0;
  border-bottom: 1px solid rgba(139, 92, 246, 0.1);

  &:last-child {
    border-bottom: none;
  }
`;

const Label = styled.label`
  font-size: ${vibeTheme.typography.fontSize.sm};
  color: ${vibeTheme.colors.text};
`;

const Input = styled.input`
  background: ${vibeTheme.colors.tertiary};
  border: 1px solid rgba(139, 92, 246, 0.2);
  color: ${vibeTheme.colors.text};
  padding: ${vibeTheme.spacing[1]} ${vibeTheme.spacing[2]};
  border-radius: ${vibeTheme.borderRadius.sm};
  width: 60px;
  text-align: right;

  &:focus {
    outline: none;
    border-color: ${vibeTheme.colors.cyan};
  }
`;

const Select = styled.select`
  background: ${vibeTheme.colors.tertiary};
  border: 1px solid rgba(139, 92, 246, 0.2);
  color: ${vibeTheme.colors.text};
  padding: ${vibeTheme.spacing[1]} ${vibeTheme.spacing[2]};
  border-radius: ${vibeTheme.borderRadius.sm};

  &:focus {
    outline: none;
    border-color: ${vibeTheme.colors.cyan};
  }
`;

const ToggleSwitch = styled.label`
  position: relative;
  display: inline-block;
  width: 40px;
  height: 20px;
`;

const ToggleInput = styled.input`
  opacity: 0;
  width: 0;
  height: 0;

  &:checked + span {
    background-color: ${vibeTheme.colors.cyan};
  }

  &:checked + span:before {
    transform: translateX(20px);
  }
`;

const ToggleSlider = styled.span`
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${vibeTheme.colors.tertiary};
  transition: .4s;
  border-radius: 20px;

  &:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
  }
`;

const SettingsModal = () => {
    const settings = useEditorStore((state) => state.settings);
    const isOpen = useEditorStore((state) => state.settingsOpen);
    const { updateSettings, toggleSettings } = useEditorStore((state) => state.actions);

    const handleClose = () => {
        toggleSettings();
    };

    const handleChange = (key: keyof typeof settings, value: (typeof settings)[keyof typeof settings]) => {
        updateSettings({ [key]: value });
    };

    if (!isOpen) {return null;}

    return (
        <Dialog
            isOpen={isOpen}
            onClose={handleClose}
            title="Editor Settings"
            message=""
            showCancel={false}
            confirmLabel="Done"
            onConfirm={handleClose}
        >
            <div style={{ padding: '10px 0' }}>
                <SettingsGroup>
                    <GroupTitle>Appearance</GroupTitle>
                    <SettingRow>
                        <Label>Theme</Label>
                        <Select
                            value={settings.theme}
                            onChange={(e) => handleChange('theme', e.target.value)}
                        >
                            <option value="dark">Dark</option>
                            <option value="light">Light</option>
                        </Select>
                    </SettingRow>
                    <SettingRow>
                        <Label>Font Size</Label>
                        <Input
                            type="number"
                            value={settings.fontSize}
                            onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
                            min={8}
                            max={32}
                        />
                    </SettingRow>
                    <SettingRow>
                        <Label>Minimap</Label>
                        <ToggleSwitch>
                            <ToggleInput
                                type="checkbox"
                                checked={settings.minimap}
                                onChange={(e) => handleChange('minimap', e.target.checked)}
                            />
                            <ToggleSlider />
                        </ToggleSwitch>
                    </SettingRow>
                </SettingsGroup>

                <SettingsGroup>
                    <GroupTitle>Editor</GroupTitle>
                    <SettingRow>
                        <Label>Tab Size</Label>
                        <Input
                            type="number"
                            value={settings.tabSize}
                            onChange={(e) => handleChange('tabSize', parseInt(e.target.value))}
                            min={2}
                            max={8}
                        />
                    </SettingRow>
                    <SettingRow>
                        <Label>Word Wrap</Label>
                        <ToggleSwitch>
                            <ToggleInput
                                type="checkbox"
                                checked={settings.wordWrap}
                                onChange={(e) => handleChange('wordWrap', e.target.checked)}
                            />
                            <ToggleSlider />
                        </ToggleSwitch>
                    </SettingRow>
                    <SettingRow>
                        <Label>Auto Save</Label>
                        <ToggleSwitch>
                            <ToggleInput
                                type="checkbox"
                                checked={settings.autoSave}
                                onChange={(e) => handleChange('autoSave', e.target.checked)}
                            />
                            <ToggleSlider />
                        </ToggleSwitch>
                    </SettingRow>
                </SettingsGroup>

                <SettingsGroup>
                    <GroupTitle>AI Assistance</GroupTitle>
                    <SettingRow>
                        <Label>AI Auto-Complete</Label>
                        <ToggleSwitch>
                            <ToggleInput
                                type="checkbox"
                                checked={settings.aiAutoComplete}
                                onChange={(e) => handleChange('aiAutoComplete', e.target.checked)}
                            />
                            <ToggleSlider />
                        </ToggleSwitch>
                    </SettingRow>
                    <SettingRow>
                        <Label>AI Suggestions</Label>
                        <ToggleSwitch>
                            <ToggleInput
                                type="checkbox"
                                checked={settings.aiSuggestions}
                                onChange={(e) => handleChange('aiSuggestions', e.target.checked)}
                            />
                            <ToggleSlider />
                        </ToggleSwitch>
                    </SettingRow>
                    <SettingRow>
                        <Label>Show Reasoning</Label>
                        <ToggleSwitch>
                            <ToggleInput
                                type="checkbox"
                                checked={settings.showReasoningProcess ?? false}
                                onChange={(e) => handleChange('showReasoningProcess', e.target.checked)}
                            />
                            <ToggleSlider />
                        </ToggleSwitch>
                    </SettingRow>
                    <SettingRow>
                        <Label>AI Model</Label>
                        <Select
                            value={settings.aiModel ?? 'moonshot/kimi-2.5-pro'}
                            onChange={(e) => handleChange('aiModel', e.target.value)}
                            style={{ width: '200px' }}
                        >
                            <optgroup label="✨ Vibe Code Studio 2026 Models">
                                {MODELS_ARRAY.filter(m => m.recommended !== false).map((model) => (
                                    <option key={model.id} value={model.id}>
                                        {model.name}
                                    </option>
                                ))}
                            </optgroup>
                            <optgroup label="🏠 Local">
                                <option value="local/vibe-completion">Vibe Custom</option>
                            </optgroup>
                        </Select>
                    </SettingRow>
                </SettingsGroup>
            </div>
        </Dialog>
    );
};

export default SettingsModal;
