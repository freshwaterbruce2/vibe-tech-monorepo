import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import {
  Artwork,
  SessionInfo,
  DEFAULT_SESSION,
  PALETTES,
  PaletteName,
  serializeArtworkSvg,
} from './zenColoringTypes';
import { getGeminiApiKey } from '../lib/gemini';
import {
  generateMajesticButterfly,
  generateGracefulSwans,
  generateStellarLotus,
  generateCelestialPhoenix,
} from './artworks';
import {
  generateZentangleHearts,
  generateZentangleSunrise,
  generateZentangleForest,
  generateZentangleNebula,
  generateZentangleStainedGlass,
  generateZentangleRose,
  generateZentangleHarmony,
} from './zentangleGenerators';
import { VECTOR_SHIFT_ARTWORKS, type VectorShiftArtwork } from '../lib/vectorShiftAssets';

const ARTWORKS: Artwork[] = [
  {
    id: 'monarch-journey',
    name: 'Monarch Journey',
    viewBox: '0 0 200 200',
    category: 'Butterflies',
    classicPalette: ['#f97316','#ea580c','#c2410c','#fcd34d','#0f172a','#e2e8f0'],
    paths: generateMajesticButterfly(),
  },
  {
    id: 'twin-hearts',
    name: 'Twin Hearts',
    viewBox: '0 0 200 200',
    category: 'Love',
    classicPalette: ['#f43f5e','#e11d48','#be185d','#fda4af','#fecdd3','#16a34a','#86efac'],
    paths: generateZentangleHearts(),
  },
  {
    id: 'mountain-sunrise',
    name: 'Mountain Sunrise',
    viewBox: '0 0 200 200',
    category: 'Nature',
    classicPalette: ['#fcd34d','#f59e0b','#f43f5e','#3b82f6','#1e3a8a','#10b981','#064e3b'],
    paths: generateZentangleSunrise(),
  },
  {
    id: 'butterfly',
    name: 'Eternal Butterfly',
    viewBox: '0 0 200 200',
    category: 'Butterflies',
    classicPalette: ['#c026d3','#a21caf','#86198f','#f472b6','#be185d','#fda4af','#f8fafc'],
    paths: generateMajesticButterfly(),
  },
  {
    id: 'forest-meditation',
    name: 'Forest Meditation',
    viewBox: '0 0 200 200',
    category: 'Nature',
    classicPalette: ['#166534','#4ade80','#86efac','#fef3c7','#854d0e','#a16207'],
    paths: generateZentangleForest(),
  },
  {
    id: 'nebula-dream',
    name: 'Nebula Dream',
    viewBox: '0 0 200 200',
    category: 'Abstract',
    classicPalette: ['#1e3a8a','#312e81','#4338ca','#6366f1','#a5b4fc','#c7d2fe','#e0e7ff'],
    paths: generateZentangleNebula(),
  },
  {
    id: 'swan-duet',
    name: 'Swan Duet',
    viewBox: '0 0 400 400',
    category: 'Nature',
    classicPalette: ['#e0f2fe','#bae6fd','#7dd3fc','#0ea5e9','#0284c7','#0369a1','#f8fafc'],
    paths: generateGracefulSwans(),
  },
  {
    id: 'celestial-lotus',
    name: 'Celestial Lotus',
    viewBox: '0 0 200 200',
    category: 'Nature',
    classicPalette: ['#f43f5e','#e11d48','#be185d','#fda4af','#c026d3','#a21caf','#86198f','#f8fafc'],
    paths: generateStellarLotus(),
  },
  {
    id: 'phoenix-rise',
    name: 'Phoenix Rise',
    viewBox: '0 0 200 220',
    category: 'Abstract',
    classicPalette: ['#b91c1c','#dc2626','#f87171','#fed7aa','#fb923c','#c2410c','#854d0e','#f8fafc'],
    paths: generateCelestialPhoenix(),
  },
  {
    id: 'stained-glass',
    name: 'Stained Glass Mandala',
    viewBox: '0 0 200 200',
    category: 'Geometric',
    classicPalette: ['#7e22ce','#a855f7','#c026d3','#f472b6','#fb7185','#e11d48','#f8fafc'],
    paths: generateZentangleStainedGlass(),
  },
  {
    id: 'rose-window',
    name: 'Rose Window',
    viewBox: '0 0 200 200',
    category: 'Geometric',
    classicPalette: ['#9f1239','#be123c','#e11d48','#f43f5e','#fda4af','#fed7aa','#fef3c7'],
    paths: generateZentangleRose(),
  },
  {
    id: 'harmony',
    name: 'Harmony Mandala',
    viewBox: '0 0 200 200',
    category: 'Geometric',
    classicPalette: ['#0e7490','#0891b2','#22d3ee','#67e8f9','#a5f3fc','#ecfeff'],
    paths: generateZentangleHarmony(),
  },
];

const ENRICHED_ARTWORKS = ARTWORKS.map((art) => ({
  ...art,
  session: DEFAULT_SESSION,
}));

export function useZenColoring() {
  const [screen, setScreen] = useState<'gallery' | 'workspace' | 'vector-preview'>('gallery');
  const [activeArtworkId, setActiveArtworkId] = useState(ENRICHED_ARTWORKS[0].id);
  const [fills, setFills] = useState<Record<string, Record<string, string>>>({});
  const [selectedColor, setSelectedColor] = useState('#38bdf8');
  const [activePalette, setActivePalette] = useState<PaletteName>('celestial');
  const [symmetryMode, setSymmetryMode] = useState(true);
  const [isClassicMode, setIsClassicMode] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'All' | 'Butterflies' | 'Nature' | 'Geometric' | 'Abstract' | 'Love'>('All');
  const [hintPathId, setHintPathId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [pendingReset, setPendingReset] = useState(false);
  const [selectedVectorArtwork, setSelectedVectorArtwork] = useState<VectorShiftArtwork | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const currentArtwork = ENRICHED_ARTWORKS.find((a) => a.id === activeArtworkId)!;
  const currentFills = fills[activeArtworkId] || {};

  const showNotice = (text: string) => {
    setNotice(text);
    setTimeout(() => setNotice(null), 2400);
  };

  // Gemini session (AI Guided palette)
  const [sessionInfo, setSessionInfo] = useState<SessionInfo>(DEFAULT_SESSION);
  const [aiLoading, setAiLoading] = useState(false);

  const generateAISession = async () => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      showNotice('No Gemini API key found. Using default session.');
      return;
    }
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const resp = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Create a short therapeutic coloring session for the artwork "${currentArtwork.name}". Return JSON only:
{
  "therapeutic_intro": "string",
  "palette": { "1": { "hex": "#hex", "theme": "string" }, ... },
  "mid_coloring_prompt": "string",
  "completion_affirmation": "string"
}`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              therapeutic_intro: { type: Type.STRING },
              palette: { type: Type.OBJECT },
              mid_coloring_prompt: { type: Type.STRING },
              completion_affirmation: { type: Type.STRING },
            },
            required: ['therapeutic_intro', 'palette', 'mid_coloring_prompt', 'completion_affirmation'],
          },
        },
      });
      const json = JSON.parse(resp.text || '{}');
      setSessionInfo(json);
      setActivePalette('ai');
      showNotice('AI session generated. Palette synchronized.');
    } catch (e) {
      console.error(e);
      showNotice('AI session failed. Using default.');
    } finally {
      setAiLoading(false);
    }
  };

  const currentPalette = activePalette === 'ai'
    ? Object.values(sessionInfo.palette).map((v) => v.hex)
    : activePalette === 'classic'
    ? (currentArtwork.classicPalette || [])
    : (activePalette in PALETTES ? PALETTES[activePalette as keyof typeof PALETTES] : PALETTES.celestial);

  const handleFill = (id: string) => {
    if (id.startsWith('ant')) return;
    if (isClassicMode) {
      const path = currentArtwork.paths.find((p) => p.id === id);
      if (path && path.number) {
        const selectedIndex = currentArtwork.classicPalette?.indexOf(selectedColor);
        if (selectedIndex !== path.number - 1) return;
      }
    }
    setFills((prev) => {
      const artFills = { ...(prev[activeArtworkId] || {}) };
      artFills[id] = selectedColor;
      if (symmetryMode) {
        const path = currentArtwork.paths.find((p) => p.id === id);
        if (path?.mirrorId) {
          const mirrorPath = currentArtwork.paths.find((p) => p.id === path.mirrorId);
          if (!isClassicMode || (mirrorPath?.number === path?.number)) {
            artFills[path.mirrorId] = selectedColor;
          }
        }
      }
      return { ...prev, [activeArtworkId]: artFills };
    });
    if (id === hintPathId) setHintPathId(null);
  };

  const toggleClassicMode = () => {
    const next = !isClassicMode;
    setIsClassicMode(next);
    if (next && currentArtwork.classicPalette) {
      setActivePalette('classic');
      setSelectedColor(currentArtwork.classicPalette[0]);
    } else {
      setActivePalette('celestial');
    }
    setFills((prev) => ({ ...prev, [activeArtworkId]: {} }));
  };

  const handleHint = () => {
    if (!isClassicMode || !currentArtwork.classicPalette) return;
    const selectedNumber = currentArtwork.classicPalette.indexOf(selectedColor) + 1;
    const remaining = currentArtwork.paths.filter((p) => p.number === selectedNumber && !currentFills[p.id]);
    if (remaining.length > 0) {
      const randomPath = remaining[Math.floor(Math.random() * remaining.length)];
      setHintPathId(randomPath.id);
      setTimeout(() => setHintPathId(null), 3000);
    }
  };

  const handleReset = () => setPendingReset(true);
  const confirmReset = () => {
    setFills((prev) => ({ ...prev, [activeArtworkId]: {} }));
    setPendingReset(false);
    showNotice(`${currentArtwork.name} was reset.`);
  };

  const handleExport = async () => {
    if (!svgRef.current) return;
    try {
      setExporting(true);
      const svgSource = serializeArtworkSvg(svgRef.current);
      const blob = new Blob([svgSource], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = `${currentArtwork.name}-serenity-flow.svg`;
      link.href = url;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed', err);
      showNotice('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  return {
    // state
    screen,
    setScreen,
    activeArtworkId,
    setActiveArtworkId,
    fills,
    currentArtwork,
    currentFills,
    selectedColor,
    setSelectedColor,
    activePalette,
    setActivePalette,
    symmetryMode,
    setSymmetryMode,
    isClassicMode,
    setIsClassicMode,
    activeCategory,
    setActiveCategory,
    hintPathId,
    notice,
    exporting,
    pendingReset,
    setPendingReset,
    selectedVectorArtwork,
    setSelectedVectorArtwork,
    sessionInfo,
    aiLoading,
    currentPalette,
    svgRef,
    ENRICHED_ARTWORKS,
    VECTOR_SHIFT_ARTWORKS,

    // actions
    handleFill,
    toggleClassicMode,
    handleHint,
    handleReset,
    confirmReset,
    handleExport,
    generateAISession,
    showNotice,
  };
}
