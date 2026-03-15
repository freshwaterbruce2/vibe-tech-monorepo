const fs = require('fs');

const path = 'C:/dev/apps/vibe-code-studio/src/components/AgentMode/ComposerMode.tsx';
const content = fs.readFileSync(path, 'utf8');

const dir = 'C:/dev/apps/vibe-code-studio/src/components/AgentMode/ComposerMode';
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

// 1. Types
let typesCode = `import type { UnifiedAIService } from '../../../services/ai/UnifiedAIService';\n\n${
  content.substring(
    content.indexOf('interface ComposerFile'),
    content.indexOf('const ComposerBackdrop')
  ).trim()
}\n`;

typesCode = typesCode.replace(/interface ComposerFile/, 'export interface ComposerFile');
typesCode = typesCode.replace(/interface ComposerModeProps/, 'export interface ComposerModeProps');

fs.writeFileSync(`${dir}/ComposerMode.types.ts`, typesCode);

// 2. Styles
const stylesRaw = content.substring(
  content.indexOf('const ComposerBackdrop'),
  content.indexOf('export const ComposerMode =')
).trim();

const stylesExported = stylesRaw.replace(/^const /gm, 'export const ');
const stylesCode = `import { motion } from 'framer-motion';
import styled from 'styled-components';
import { vibeTheme } from '../../../styles/theme';

${stylesExported}
`;

fs.writeFileSync(`${dir}/ComposerMode.styles.ts`, stylesCode);

// 3. Component
const componentRaw = content.substring(content.indexOf('export const ComposerMode ='));
const headerCode = `/**
 * Composer Mode - Multi-file editing interface inspired by Cursor's Composer
 */
import React, { useRef, useState } from 'react';
import { Editor as MonacoEditor } from '@monaco-editor/react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  FileSearch,
  FileText,
  GitBranch,
  Layers,
  Plus,
  Send,
  Sparkles,
  X,
  Zap,
} from 'lucide-react';

import type { UnifiedAIService } from '../../../services/ai/UnifiedAIService';
import { logger } from '../../../services/Logger';
import { vibeTheme } from '../../../styles/theme';

import type { ComposerFile, ComposerModeProps } from './ComposerMode.types';
import {
  ComposerBackdrop,
  ComposerContainer,
  ComposerHeader,
  ComposerTitle,
  ComposerActions,
  ActionButton,
  ComposerBody,
  FileList,
  FileListHeader,
  FileItem,
  EditorSection,
  EditorHeader,
  EditorContainer,
  EditorToolbar,
  PromptSection,
  PromptInput,
  ContextTags,
  ContextTag,
  StatusBar,
} from './ComposerMode.styles';

`;

fs.writeFileSync(`${dir}/ComposerMode.tsx`, headerCode + componentRaw);

// 4. Index
fs.writeFileSync(`${dir}/index.ts`, `export { ComposerMode, default } from './ComposerMode';
export * from './ComposerMode.types';
`);

// Delete old file
fs.unlinkSync(path);

console.warn("Refactoring complete!");
