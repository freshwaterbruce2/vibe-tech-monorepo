-- Update NOVA's system prompt configuration
-- Version 2.0 - January 4, 2026
-- Store path to 7-layer system prompt file

DELETE FROM settings WHERE key IN ('nova_system_prompt_path', 'nova_system_prompt_version', 'nova_use_7layer_prompt');

-- Point to the 7-layer system prompt file
INSERT INTO settings (key, value) VALUES 
  ('nova_system_prompt_path', 'C:\dev\apps\nova-agent\docs\7-layer-system-prompt.md'),
  ('nova_system_prompt_version', '2.0_7layer'),
  ('nova_use_7layer_prompt', 'true');

-- Verify the update
SELECT key, value, updated_at 
FROM settings 
WHERE key LIKE 'nova_%prompt%'
ORDER BY key;
