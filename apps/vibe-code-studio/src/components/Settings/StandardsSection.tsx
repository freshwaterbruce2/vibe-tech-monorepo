/**
 * StandardsSection — spec 03 (Open Agent Standards) AC #10 settings toggles.
 *
 * Self-persisting section (ApiKeySettings pattern): toggles write through
 * `setStandardsSetting` immediately, so prompt assembly (PromptBuilder /
 * TaskPlanner) and the AGENTS.md Commands palette pick the change up without
 * the panel's Save button. Each standards source toggles independently
 * (disabling one never breaks the others).
 */
import { useEffect, useState } from 'react';

import type { StandardsSettings } from '../../services/ai/standards/standardsSettings';

import {
  getStandardsSettings,
  loadStandardsSettings,
  setStandardsSetting,
} from '../../services/ai/standards/standardsSettings';
import { SettingControl, SettingItem, SettingLabel, Toggle } from '../Settings.styles';

interface StandardsToggle {
  key: keyof StandardsSettings;
  title: string;
  description: string;
}

const TOGGLES: StandardsToggle[] = [
  {
    key: 'agentsMd',
    title: 'Read AGENTS.md files',
    description: 'Inject AGENTS.md standards into planning and chat prompts',
  },
  {
    key: 'projectRules',
    title: 'Read .deepcoderules / .cursorrules',
    description: 'Inject project custom rules into chat prompts',
  },
  {
    key: 'agentsMdCommands',
    title: 'AGENTS.md commands',
    description: 'Offer fenced blocks under a Commands heading as one-click actions',
  },
];

export const StandardsSection = () => {
  const [settings, setSettings] = useState<StandardsSettings>(getStandardsSettings());

  useEffect(() => {
    let cancelled = false;
    void loadStandardsSettings().then(loaded => {
      if (!cancelled) {
        setSettings(loaded);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (key: keyof StandardsSettings, value: boolean): void => {
    setSettings(prev => ({ ...prev, [key]: value }));
    void setStandardsSetting(key, value);
  };

  return (
    <>
      {TOGGLES.map(toggle => (
        <SettingItem key={toggle.key}>
          <SettingLabel>
            {toggle.title}
            <span>{toggle.description}</span>
          </SettingLabel>
          <SettingControl>
            <Toggle
              aria-label={toggle.title}
              checked={settings[toggle.key]}
              onChange={e => update(toggle.key, e.target.checked)}
            />
          </SettingControl>
        </SettingItem>
      ))}
    </>
  );
};

export default StandardsSection;
