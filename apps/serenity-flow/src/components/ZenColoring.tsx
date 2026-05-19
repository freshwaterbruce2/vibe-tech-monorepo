import { useState, useEffect, useRef } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { motion, AnimatePresence } from 'motion/react';
import { Palette, Check, ArrowLeftRight, Save, Download, Sparkles, Wand2, ChevronLeft, Brush, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { generateDetailedMandala, generateMajesticButterfly, generateGracefulSwans, generateStellarLotus, generateCelestialPhoenix } from './complexArtworks';
import { generateZentangleHearts, generateZentangleSunrise, generateZentangleForest, generateZentangleNebula, generateZentangleStainedGlass, generateZentangleRose, generateZentangleHarmony } from './zentangleGenerators';
import { VECTOR_SHIFT_ARTWORKS, type VectorShiftArtwork } from '../lib/vectorShiftAssets';
import { getGeminiApiKey } from '../lib/gemini';

interface SessionInfo {
  therapeutic_intro: string;
  palette: Record<string, { hex: string, theme: string }>;
  mid_coloring_prompt: string;
  completion_affirmation: string;
}

const DEFAULT_SESSION: SessionInfo = {
  therapeutic_intro: 'Let each color arrive slowly. There is no wrong pace here.',
  palette: {
    '1': { hex: '#38bdf8', theme: 'Breath' },
    '2': { hex: '#14b8a6', theme: 'Steady' },
    '3': { hex: '#f472b6', theme: 'Warmth' },
    '4': { hex: '#a78bfa', theme: 'Ease' },
  },
  mid_coloring_prompt: 'Notice one place in your body that feels even slightly softer than before.',
  completion_affirmation: 'You made space for calm, and that space is yours to return to.',
};

const PALETTES = {
  celestial: [
    '#0891b2', '#06b6d4', '#22d3ee', '#67e8f9', '#a5f3fc', '#ecfeff',
    '#0284c7', '#0ea5e9', '#38bdf8', '#7dd3fc', '#bae6fd', '#f0f9ff',
    '#7e22ce', '#9333ea', '#a855f7', '#c084fc', '#d8b4fe', '#f5f3ff',
    '#be185d', '#db2777', '#e11d48', '#f43f5e', '#fb7185', '#fda4af'
  ],
  pastel: [
    '#ffe4e6', '#fecdd3', '#fda4af', '#fb7185', '#f43f5e', '#e11d48',
    '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c',
    '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706',
    '#ecfdf5', '#d1fae5', '#a7f3d0', '#6ee7b7', '#34d399', '#10b981'
  ],
  earth: [
    '#fef3c7', '#fde68a', '#fcd34d', '#fbbf24', '#f59e0b', '#d97706',
    '#ecfccb', '#d9f99d', '#bef264', '#a3e635', '#84cc16', '#65a30d',
    '#ffedd5', '#fed7aa', '#fdba74', '#fb923c', '#f97316', '#ea580c',
    '#f3f4f6', '#e5e7eb', '#d1d5db', '#9ca3af', '#6b7280', '#4b5563'
  ]
};

type PaletteName = keyof typeof PALETTES | 'ai' | 'classic';

const PALETTE_NAMES: { id: PaletteName; label: string }[] = [
  { id: 'classic', label: 'Color by Number' },
  { id: 'celestial', label: 'Celestial' },
  { id: 'pastel', label: 'Pastel' },
  { id: 'earth', label: 'Earth Tones' },
  { id: 'ai', label: 'AI Guided' }
];

const serializeArtworkSvg = (svg: SVGSVGElement) => {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('role', 'img');
  clone.style.backgroundColor = '#ffffff';

  const viewBox = svg.viewBox.baseVal;
  const width = viewBox?.width || svg.clientWidth || 800;
  const height = viewBox?.height || svg.clientHeight || 800;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));

  return new XMLSerializer().serializeToString(clone);
};

interface PathObj {
  id: string;
  d: string;
  isSymmetric?: boolean;
  mirrorId?: string;
  number?: number;
  center?: { x: number, y: number };
}

interface Artwork {
  id: string;
  name: string;
  paths: PathObj[];
  viewBox: string;
  classicPalette?: string[];
  category?: 'Butterflies' | 'Nature' | 'Geometric' | 'Abstract' | 'Love';
}

const ARTWORKS: Artwork[] = [
  {
    id: 'monarch-journey',
    name: 'Monarch Journey',
    viewBox: '0 0 200 200',
    category: 'Butterflies',
    classicPalette: ['#f97316', '#ea580c', '#c2410c', '#fcd34d', '#0f172a', '#e2e8f0'],
    paths: generateMajesticButterfly()
  },
  {
    id: 'twin-hearts',
    name: 'Twin Hearts',
    viewBox: '0 0 200 200',
    category: 'Love',
    classicPalette: ['#f43f5e', '#e11d48', '#be185d', '#fda4af', '#fecdd3', '#16a34a', '#86efac'],
    paths: generateZentangleHearts()
  },
  {
    id: 'mountain-sunrise',
    name: 'Mountain Sunrise',
    viewBox: '0 0 200 200',
    category: 'Nature',
    classicPalette: ['#fcd34d', '#f59e0b', '#f43f5e', '#3b82f6', '#1e3a8a', '#10b981', '#064e3b'],
    paths: generateZentangleSunrise()
  },
  {
    id: 'butterfly',
    name: 'Eternal Butterfly',
    viewBox: '0 0 200 200',
    classicPalette: ['#f43f5e', '#fb923c', '#fbbf24', '#34d399', '#38bdf8', '#818cf8'],
    paths: generateMajesticButterfly()
  },
  {
    id: 'lotus',
    name: 'Sacred Lotus',
    viewBox: '0 0 200 200',
    paths: generateStellarLotus()
  },
  {
    id: 'mandala',
    name: 'Mandala of Peace',
    viewBox: '0 0 200 200',
    paths: generateDetailedMandala()
  },
  {
    id: 'flower',
    name: 'Desert Rose',
    viewBox: '0 0 200 200',
    paths: generateZentangleRose()
  },
  {
    id: 'forest',
    name: 'Enchanted Forest',
    viewBox: '0 0 200 200',
    classicPalette: ['#166534', '#15803d', '#22c55e', '#4ade80', '#86efac', '#fde047'],
    paths: generateZentangleForest()
  },
  {
    id: 'nebula',
    name: 'Cosmic Nebula',
    viewBox: '0 0 200 200',
    paths: generateZentangleNebula()
  },
  {
    id: 'harmony',
    name: 'Geometric Harmony',
    viewBox: '0 0 200 200',
    classicPalette: ['#4f46e5', '#7c3aed', '#c026d3', '#db2777', '#f43f5e', '#fb923c'],
    paths: generateZentangleHarmony()
  },
  {
    id: 'stained-glass',
    name: 'Stained Glass Sun',
    viewBox: '0 0 200 200',
    classicPalette: ['#fbbf24', '#f59e0b', '#ea580c', '#e11d48', '#38bdf8', '#6366f1', '#a855f7'],
    paths: generateZentangleStainedGlass()
  },
  {
    id: 'masterpiece-mandala',
    name: 'Masterpiece Mandala',
    viewBox: '0 0 200 200',
    category: 'Geometric',
    classicPalette: ['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316'],
    paths: generateDetailedMandala()
  },
  {
    id: 'majestic-butterfly',
    name: 'Majestic Monarch',
    viewBox: '0 0 200 200',
    category: 'Butterflies',
    classicPalette: ['#1e1e1e', '#eab308', '#f97316', '#f43f5e', '#ec4899', '#3b82f6', '#14b8a6'],
    paths: generateMajesticButterfly()
  },
  {
    id: 'stellar-lotus',
    name: 'Stellar Lotus',
    viewBox: '0 0 200 200',
    category: 'Nature',
    classicPalette: ['#f472b6', '#db2777', '#9d174d', '#be185d', '#ec4899', '#fce7f3', '#fbcfe8'],
    paths: generateStellarLotus()
  },
  {
    id: 'graceful-swans',
    name: 'Graceful Swans',
    viewBox: '0 0 400 400',
    category: 'Nature',
    classicPalette: ['#1e3a8a', '#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#f8fafc', '#e2e8f0', '#cbd5e1', '#94a3b8', '#0ea5e9', '#38bdf8', '#7dd3fc', '#0f172a'],
    paths: generateGracefulSwans()
  },
  {
    id: 'celestial-phoenix',
    name: 'Celestial Phoenix',
    viewBox: '0 0 400 400',
    category: 'Nature',
    classicPalette: ['#f43f5e', '#fb923c', '#fbbf24', '#f59e0b', '#dc2626', '#991b1b', '#4c0519', '#fef3c7'],
    paths: generateCelestialPhoenix()
  }
];

// Helper to auto-enrich artworks with numbers and centers if missing
const RAW_ARTWORKS = ARTWORKS;
const ENRICHED_ARTWORKS = RAW_ARTWORKS.map(art => {
  let cat = art.category;
  if (!cat) {
    if (art.id === 'butterfly') cat = 'Butterflies';
    else if (art.id === 'lotus' || art.id === 'flower' || art.id === 'forest') cat = 'Nature';
    else if (art.id === 'mandala' || art.id === 'harmony') cat = 'Geometric';
    else if (art.id === 'nebula' || art.id === 'stained-glass') cat = 'Abstract';
    else cat = 'Abstract';
  }

  const classicColors = art.classicPalette || PALETTES.celestial.slice(0, 8);
  const numColors = classicColors.length;

  let currentNum = 1;
  const assignments: Record<string, number> = {};

  const newPaths = art.paths.map((p, i) => {
    let num = p.number;
    if (num === undefined && !p.id.startsWith('ant')) {
      if (assignments[p.id]) {
        num = assignments[p.id];
      } else if (p.mirrorId && assignments[p.mirrorId]) {
        num = assignments[p.mirrorId];
      } else {
        num = currentNum;
        assignments[p.id] = num;
        currentNum = (currentNum % numColors) + 1;
      }
    }

    let center = p.center;
    if (!center && num !== undefined) {
      // Find a rough bounding or M coordinate
      const match = p.d.match(/[M|m]\s*([0-9.-]+)[,\s]+([0-9.-]+)/);
      if (match) {
        center = { x: parseFloat(match[1]) + 5, y: parseFloat(match[2]) + 5 }; // offset so it sits loosely inside
      } else {
        center = { x: 100, y: 100 };
      }
    }

    return { ...p, number: num, center };
  });

  return { ...art, paths: newPaths, classicPalette: classicColors, category: cat };
});

export default function ZenColoring() {
  const [screen, setScreen] = useState<'gallery' | 'workspace' | 'vector-preview'>('gallery');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [activePalette, setActivePalette] = useState<PaletteName>('classic');
  const [selectedColor, setSelectedColor] = useState('#f43f5e'); // will set properly in useEffect
  const [activeArtworkId, setActiveArtworkId] = useState('butterfly');
  const [fills, setFills] = useState<Record<string, Record<string, string>>>({});
  const [symmetryMode, setSymmetryMode] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isClassicMode, setIsClassicMode] = useState(true);
  const [hintPathId, setHintPathId] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingReset, setPendingReset] = useState(false);
  const [selectedVectorArtwork, setSelectedVectorArtwork] = useState<VectorShiftArtwork | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const currentArtwork = ENRICHED_ARTWORKS.find(a => a.id === activeArtworkId) || ENRICHED_ARTWORKS[0];
  const currentFills = fills[activeArtworkId] || {};

  // Auto-select correct next color in classic mode
  useEffect(() => {
    if (!isClassicMode || !currentArtwork.classicPalette) return;

    const selectedIndex = currentArtwork.classicPalette.indexOf(selectedColor);
    // if currently selected color is fully filled, automatically pick the next available one
    if (selectedIndex !== -1) {
      const targetNumber = selectedIndex + 1;
      const unfilledWithCurrent = currentArtwork.paths.filter(p => !p.id.startsWith('ant') && p.number === targetNumber && !currentFills[p.id]);

      if (unfilledWithCurrent.length === 0) {
        // find next
        for (let i = 0; i < currentArtwork.classicPalette.length; i++) {
          const num = i + 1;
          const remaining = currentArtwork.paths.filter(p => p.number === num && !currentFills[p.id]).length;
          if (remaining > 0) {
            setSelectedColor(currentArtwork.classicPalette[i]);
            break;
          }
        }
      }
    } else {
       // if selecting an artwork sets an invalid color, set to the first unfilled
       for (let i = 0; i < currentArtwork.classicPalette.length; i++) {
          const num = i + 1;
          const remaining = currentArtwork.paths.filter(p => p.number === num && !currentFills[p.id]).length;
          if (remaining > 0) {
            setSelectedColor(currentArtwork.classicPalette[i]);
            break;
          }
       }
    }
  }, [currentFills, selectedColor, currentArtwork, isClassicMode]);

  const requestAISession = async () => {
    setLoadingSession(true);
    try {
      const apiKey = getGeminiApiKey();
      if (!apiKey) {
        setSessionInfo(DEFAULT_SESSION);
        setActivePalette('ai');
        setSelectedColor(DEFAULT_SESSION.palette["1"].hex);
        setAiError('Using offline guidance. Add a Gemini API key to enable live AI sessions.');
        setTimeout(() => setAiError(null), 6000);
        return;
      }

      const genAI = new GoogleGenAI({ apiKey });
      const response = await genAI.models.generateContent({
        model: "gemini-2.5-flash",
        contents: "You are the companion behind Serenity Flow. Set up a new coloring session for the user. Provide a soothing intro, a theme-based palette (4 colors with hex and theme name), a mindfulness prompt for middle of coloring, and a completion affirmation. Output JSON.",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              therapeutic_intro: { type: Type.STRING },
              palette: {
                type: Type.OBJECT,
                properties: {
                  "1": { type: Type.OBJECT, properties: { hex: { type: Type.STRING }, theme: { type: Type.STRING } } },
                  "2": { type: Type.OBJECT, properties: { hex: { type: Type.STRING }, theme: { type: Type.STRING } } },
                  "3": { type: Type.OBJECT, properties: { hex: { type: Type.STRING }, theme: { type: Type.STRING } } },
                  "4": { type: Type.OBJECT, properties: { hex: { type: Type.STRING }, theme: { type: Type.STRING } } }
                }
              },
              mid_coloring_prompt: { type: Type.STRING },
              completion_affirmation: { type: Type.STRING }
            }
          }
        }
      });

      const data = JSON.parse(response.text);
      setSessionInfo(data);
      setActivePalette('ai');
      setSelectedColor(data.palette["1"].hex);
      setAiError(null);
    } catch (e: unknown) {
      setSessionInfo(DEFAULT_SESSION);
      setActivePalette('ai');
      setSelectedColor(DEFAULT_SESSION.palette["1"].hex);
      let errorMsg = "The AI guiding companion is currently taking a mindful breath. Please try again in a moment.";
      const errorStr = (e instanceof Error ? e.message : String(e));
      if (errorStr.includes('"code":503') || errorStr.includes('high demand') || errorStr.includes('UNAVAILABLE')) {
        errorMsg = "The AI guiding companion is currently experiencing high demand. Please try again in a few moments.";
      }
      setAiError(errorMsg);
      setTimeout(() => setAiError(null), 6000);
    } finally {
      setLoadingSession(false);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('serenity-flow-fills');
    if (saved) {
      try {
        setFills(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load saved state', e);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem('serenity-flow-fills', JSON.stringify(fills));
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3500);
  };

  const handleExport = async () => {
    if (svgRef.current === null) return;
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
      console.error('Failed to export image', err);
      showNotice('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleFill = (id: string) => {
    if (id.startsWith('ant')) return;

    if (isClassicMode) {
      const path = currentArtwork.paths.find(p => p.id === id);
      if (path && path.number) {
        const selectedIndex = currentArtwork.classicPalette?.indexOf(selectedColor);
        if (selectedIndex !== (path.number - 1)) {
          // Wrong color feedback? Maybe a shake?
          return;
        }
      }
    }

    setFills(prev => {
      const artFills = { ...(prev[activeArtworkId] || {}) };
      artFills[id] = selectedColor;

      if (symmetryMode) {
        const path = currentArtwork.paths.find(p => p.id === id);
        if (path?.mirrorId) {
          const mirrorPath = currentArtwork.paths.find(p => p.id === path.mirrorId);
          // Only mirror if it is also a valid target in classic mode
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
    setIsClassicMode(!isClassicMode);
    if (!isClassicMode && currentArtwork.classicPalette) {
      setActivePalette('classic');
      setSelectedColor(currentArtwork.classicPalette[0]);
    } else {
      setActivePalette('celestial');
    }
    setFills(prev => ({ ...prev, [activeArtworkId]: {} })); // Reset on mode switch for clarity
  };

  const handleHint = () => {
    if (!isClassicMode || !currentArtwork.classicPalette) return;
    const selectedNumber = currentArtwork.classicPalette.indexOf(selectedColor) + 1;
    const remainingPaths = currentArtwork.paths.filter(p => p.number === selectedNumber && !currentFills[p.id]);
    if (remainingPaths.length > 0) {
      const randomPath = remainingPaths[Math.floor(Math.random() * remainingPaths.length)];
      setHintPathId(randomPath.id);
      setTimeout(() => setHintPathId(null), 3000);
    }
  };

  const handleReset = () => {
    setPendingReset(true);
  };

  const confirmReset = () => {
    setFills(prev => ({ ...prev, [activeArtworkId]: {} }));
    setPendingReset(false);
    showNotice(`${currentArtwork.name} was reset.`);
  };

  return (
    <div className="flex flex-col items-center pb-40 min-h-screen relative">
      <style>
        {`
          @keyframes cosmicShimmer {
            0% { stroke-dashoffset: 300; }
            100% { stroke-dashoffset: 0; }
          }
          @keyframes cosmicGlow {
            0%, 100% { filter: drop-shadow(0 0 4px rgba(255,255,255,0.4)); opacity: 0.7; }
            50% { filter: drop-shadow(0 0 12px rgba(255,255,255,0.9)) drop-shadow(0 0 24px rgba(56, 189, 248, 0.8)); opacity: 1; }
          }
          .cosmic-shimmer {
            stroke-dasharray: 15 45;
            animation: cosmicShimmer 4s linear infinite, cosmicGlow 3s ease-in-out infinite;
          }
          .cosmic-shimmer-layer2 {
            stroke-dasharray: 40 80;
            stroke-width: 3px;
            animation: cosmicShimmer 7s linear infinite reverse, cosmicGlow 5s ease-in-out infinite;
          }
        `}
      </style>
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-6 left-1/2 z-[80] -translate-x-1/2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-2xl"
          >
            {notice}
          </motion.div>
        )}
      </AnimatePresence>
      {screen === 'gallery' ? (
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-8 pt-8">
           <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8 w-full border-b border-sky-900/10 pb-6">
              <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-sky-500/20">
                      <Brush className="w-7 h-7 text-white" />
                  </div>
                  <div>
                      <h1 className="text-3xl font-serif text-sky-900 leading-tight">Serenity Flow</h1>
                      <p className="text-xs uppercase tracking-widest font-bold text-sky-900/40">Mindful Coloring Studio</p>
                  </div>
              </div>
           </div>

           {/* Categories */}
           <div className="flex gap-2 overflow-x-auto pb-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] mb-8">
             {['All', 'Butterflies', 'Nature', 'Geometric', 'Abstract', 'Love'].map(cat => (
               <button
                 key={cat}
                 onClick={() => setActiveCategory(cat)}
                 className={`px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                    activeCategory === cat ? 'bg-sky-500 text-white shadow-md' : 'bg-white/60 text-sky-900/40 hover:bg-white/80 hover:text-sky-900 shadow-sm border border-white/60'
                 }`}
               >
                 {cat}
               </button>
             ))}
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pb-20">
             {ENRICHED_ARTWORKS.filter(art => activeCategory === 'All' || art.category === activeCategory).map(art => {
               const total = art.paths.filter(p => !p.id.startsWith('ant')).length;
               const savedFills = fills[art.id] || {};
               const filledCount = Object.keys(savedFills).filter(k => !k.startsWith('ant') && savedFills[k]).length;
               const progress = total > 0 ? (filledCount / total) * 100 : 0;
               return (
                 <div key={art.id} className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-200 transition-all duration-300 p-4 sm:p-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 text-left">
                    {/* SVG preview */}
                    <div className="w-full sm:w-36 h-48 sm:h-36 shrink-0 bg-slate-50 rounded-xl relative flex items-center justify-center p-3 border border-slate-100 overflow-hidden group-hover:bg-slate-100/50 transition-colors">
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
                      <svg viewBox={art.viewBox} className="w-full h-full drop-shadow-sm relative z-10 transition-transform duration-700 ease-out group-hover:scale-105 pointer-events-none">
                         {art.paths.map(p => {
                            const savedColor = savedFills[p.id];

                            const targetColor = art.classicPalette?.[((p.number || 1) - 1) % (art.classicPalette?.length || 1)] || '#cbd5e1';
                            const fillColor = savedColor || '#ffffff';
                            const fillOpacity = 1;
                            const strokeColor = savedColor ? "rgba(0,0,0,0.1)" : "#334155";

                            return (
                               <g key={p.id} className={
                                 (art.id === 'butterfly' || art.id === 'monarch-journey' || art.id === 'majestic-butterfly') && (p.id.startsWith('ul-') || p.id.startsWith('ll-') || p.id.startsWith('mj-l')) ? 'wing-left' :
                                 (art.id === 'butterfly' || art.id === 'monarch-journey' || art.id === 'majestic-butterfly') && (p.id.startsWith('ur-') || p.id.startsWith('lr-') || p.id.startsWith('mj-r')) ? 'wing-right' : ''
                               }>
                                 <path d={p.d} fill={fillColor} fillOpacity={fillOpacity} stroke={strokeColor} strokeWidth={savedColor ? 1 : 0.8} strokeLinecap="round" />
                                 {art.id === 'nebula' && (p.id === 'spiral-1' || p.id === 'spiral-2') && (
                                   <>
                                     <path
                                       d={p.d}
                                       fill="none"
                                       stroke="rgba(255, 255, 255, 0.7)"
                                       strokeWidth="2"
                                       strokeLinecap="round"
                                       className="pointer-events-none cosmic-shimmer mix-blend-screen"
                                     />
                                     <path
                                       d={p.d}
                                       fill="none"
                                       stroke="rgba(186, 230, 253, 0.5)"
                                       strokeWidth="3"
                                       strokeLinecap="round"
                                       className="pointer-events-none cosmic-shimmer-layer2 mix-blend-screen"
                                     />
                                   </>
                                 )}
                               </g>
                            );
                         })}
                      </svg>
                    </div>
                    <div className="flex flex-col flex-1 min-w-0 z-10 relative pr-1 sm:pr-2">
                      <h3 className="text-xl sm:text-lg font-bold text-slate-800 font-serif leading-tight truncate" title={art.name}>{art.name}</h3>
                      <div className="flex items-center justify-between mt-1 mb-4 gap-2">
                         <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">
                           {art.category} • {total} parts
                         </span>
                         {progress > 0 && (
                            <span className="text-[10px] shrink-0 font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full ring-1 ring-sky-200">
                               {Math.round(progress)}%
                            </span>
                         )}
                      </div>

                      {progress > 0 && (
                        <div className="h-1.5 w-full bg-slate-100 rounded-full mb-4 overflow-hidden border border-black/5 shadow-inner">
                          <div className="h-full bg-sky-500 rounded-full" style={{ width: `${progress}%` }} />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2 mt-auto pt-2 sm:pt-4">
                         <button onClick={(e) => { e.stopPropagation(); setActiveArtworkId(art.id); setIsClassicMode(true); setActivePalette('classic'); setScreen('workspace'); }} className="w-full py-3 sm:py-2.5 bg-slate-900 text-white rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors whitespace-nowrap overflow-hidden text-ellipsis shadow-sm">Classic</button>
                         <button onClick={(e) => { e.stopPropagation(); setActiveArtworkId(art.id); setIsClassicMode(false); setActivePalette('celestial'); setScreen('workspace'); }} className="w-full py-3 sm:py-2.5 bg-sky-50 text-sky-700 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-widest hover:bg-sky-100 transition-colors whitespace-nowrap overflow-hidden text-ellipsis border border-sky-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)] group-hover:border-sky-200">Zen</button>
                      </div>
                    </div>
                 </div>
               );
             })}
             {activeCategory === 'All' && VECTOR_SHIFT_ARTWORKS.map((asset) => (
               <div key={asset.id} className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-200 transition-all duration-300 p-4 sm:p-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 text-left">
                 <div className="w-full sm:w-36 h-48 sm:h-36 shrink-0 bg-slate-50 rounded-xl relative flex items-center justify-center p-2 border border-slate-100 overflow-hidden group-hover:bg-slate-100/50 transition-colors">
                   <img
                     src={asset.src}
                     alt={asset.name}
                     loading="lazy"
                     className="h-full w-full object-contain transition-transform duration-700 ease-out group-hover:scale-105"
                   />
                 </div>
                 <div className="flex flex-col flex-1 min-w-0 z-10 relative pr-1 sm:pr-2">
                   <span className="mb-2 w-fit rounded-full px-2.5 py-1 text-[9px] font-bold uppercase tracking-widest text-white" style={{ backgroundColor: asset.accent }}>
                     VectorShift SVG
                   </span>
                   <h3 className="text-xl sm:text-lg font-bold text-slate-800 font-serif leading-tight" title={asset.name}>{asset.name}</h3>
                   <p className="mt-2 text-xs leading-relaxed text-slate-500">
                     Imported from the local VectorShift output set and bundled with Serenity Flow.
                   </p>
                   <button
                     onClick={() => {
                       setSelectedVectorArtwork(asset);
                       setScreen('vector-preview');
                     }}
                     className="mt-auto pt-4 w-full py-3 sm:py-2.5 bg-sky-50 text-sky-700 rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-widest hover:bg-sky-100 transition-colors whitespace-nowrap overflow-hidden text-ellipsis border border-sky-100"
                   >
                     View SVG
                   </button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      ) : screen === 'vector-preview' && selectedVectorArtwork ? (
        <div className="fixed inset-0 bg-[#f8fafc] flex z-50 overflow-hidden font-sans selection:bg-sky-100">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
          <div className="absolute top-4 inset-x-4 sm:inset-x-6 z-30 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
              <button
                onClick={() => setScreen('gallery')}
                className="w-10 h-10 sm:w-12 sm:h-12 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all hover:shadow-md"
              >
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
              <div className="bg-white/90 backdrop-blur-md px-3 sm:px-5 h-10 sm:h-12 border border-slate-200/60 rounded-2xl shadow-sm flex flex-col justify-center">
                <h2 className="text-xs sm:text-sm font-serif text-slate-800 leading-tight">{selectedVectorArtwork.name}</h2>
                <p className="text-[8px] sm:text-[9px] uppercase tracking-widest font-bold text-slate-400">VectorShift Import</p>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 z-10 flex items-center justify-center px-4 pt-20 pb-24 overflow-auto">
            <img
              src={selectedVectorArtwork.src}
              alt={selectedVectorArtwork.name}
              className="max-h-full max-w-full rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200"
            />
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 bg-[#f8fafc] flex z-50 overflow-hidden font-sans selection:bg-sky-100">
           {/* Background Texture */}
           <div className="absolute inset-0 opacity-[0.03] pointer-events-none z-0" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

           <AnimatePresence>
             {pendingReset && (
               <motion.div
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 className="absolute inset-0 z-[70] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm"
               >
                 <motion.div
                   initial={{ scale: 0.96, y: 8 }}
                   animate={{ scale: 1, y: 0 }}
                   exit={{ scale: 0.96, y: 8 }}
                   className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl"
                 >
                   <h3 className="font-serif text-2xl text-slate-900">Reset Artwork?</h3>
                   <p className="mt-2 text-sm leading-relaxed text-slate-500">
                     This clears the colors on {currentArtwork.name} for this browser.
                   </p>
                   <div className="mt-6 grid grid-cols-2 gap-3">
                     <button
                       onClick={() => setPendingReset(false)}
                       className="rounded-xl border border-slate-200 px-4 py-3 text-xs font-bold uppercase tracking-widest text-slate-500 hover:bg-slate-50"
                     >
                       Cancel
                     </button>
                     <button
                       onClick={confirmReset}
                       className="rounded-xl bg-red-500 px-4 py-3 text-xs font-bold uppercase tracking-widest text-white hover:bg-red-600"
                     >
                       Reset
                     </button>
                   </div>
                 </motion.div>
               </motion.div>
             )}
             {aiError && (
               <motion.div
                 initial={{ opacity: 0, y: -20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 className="absolute top-24 inset-x-0 mx-auto w-full max-w-lg z-50 pointer-events-none flex justify-center"
               >
                 <div className="bg-red-50 text-red-600 px-6 py-4 rounded-3xl shadow-xl flex flex-col items-center text-center border border-red-100 pointer-events-auto">
                    <p className="text-sm font-medium">{aiError}</p>
                 </div>
               </motion.div>
             )}

             {sessionInfo && activePalette === 'ai' && (
               <motion.div
                 initial={{ opacity: 0, y: -20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: -20 }}
                 className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none max-w-md w-full px-4"
               >
                 <div className="bg-slate-900/95 backdrop-blur-md text-white px-6 py-4 rounded-3xl shadow-2xl flex flex-col items-center text-center border border-white/10 pointer-events-auto">
                    <p className="text-sm font-serif italic mb-1">
                      "{sessionInfo.therapeutic_intro}"
                    </p>
                    <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-widest font-bold text-slate-400">
                       <Sparkles className="w-3 h-3 text-sky-400" />
                       Guided Intention
                    </div>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>

           {/* Header Area */}
           <div className="absolute top-4 inset-x-4 sm:inset-x-6 z-30 flex items-center justify-between pointer-events-none">
             <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto">
               <button
                 onClick={() => setScreen('gallery')}
                 className="w-10 h-10 sm:w-12 sm:h-12 bg-white/90 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-all hover:shadow-md"
               >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
               </button>
               <div className="bg-white/90 backdrop-blur-md px-3 sm:px-5 h-10 sm:h-12 border border-slate-200/60 rounded-2xl shadow-sm flex flex-col justify-center">
                   <h2 className="text-xs sm:text-sm font-serif text-slate-800 leading-tight">{currentArtwork.name}</h2>
                   <p className="text-[8px] sm:text-[9px] uppercase tracking-widest font-bold text-slate-400">{isClassicMode ? 'Classic Mode' : 'Zen Freeplay'}</p>
               </div>
             </div>

             <div className="bg-white/90 backdrop-blur-md h-10 sm:h-12 p-1 border border-slate-200/60 rounded-2xl shadow-sm flex items-center gap-0.5 sm:gap-1 pointer-events-auto shrink-0">
               <button
                 onClick={requestAISession}
                 disabled={loadingSession}
                 className={`h-full px-2 sm:px-3 shrink-0 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-1 ${loadingSession ? 'bg-sky-50 text-sky-400' : 'bg-sky-50 text-sky-600 hover:bg-sky-100'}`}
               >
                 {loadingSession ? <div className="w-3 h-3 rounded-full border-2 border-sky-400/40 border-t-sky-400 animate-spin" /> : <Sparkles className="w-3 sm:w-3.5 h-3 sm:h-3.5" />}
                 <span className="hidden sm:inline">AI Guide</span>
               </button>
               <div className="w-px h-5 sm:h-6 bg-slate-200 mx-0.5 sm:mx-1" />
               <button onClick={handleSave} className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors" title="Save">
                  {saveStatus === 'saved' ? <Check className="w-4 h-4 text-green-500" /> : <Save className="w-4 h-4" />}
               </button>
               <button onClick={handleExport} disabled={exporting} className="flex w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors" title="Export">
                  <Download className="w-4 h-4" />
               </button>
               <button onClick={() => setSymmetryMode(!symmetryMode)} className={`flex w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl items-center justify-center transition-colors ${symmetryMode ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`} title="Symmetry">
                  <ArrowLeftRight className="w-4 h-4" />
               </button>
               <button onClick={handleReset} className="flex w-8 h-8 sm:w-10 sm:h-10 shrink-0 rounded-xl items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-500 transition-colors" title="Reset">
                  <RotateCcw className="w-4 h-4" />
               </button>
             </div>
           </div>

           {/* Floating Bottom Dock */}
           <div className="absolute bottom-24 sm:bottom-28 inset-x-4 sm:inset-x-8 z-30 flex flex-col items-center pointer-events-none">
             {isClassicMode && (
               <div className="w-full max-w-4xl h-1 bg-slate-200/50 rounded-t-full mb-1 flex overflow-hidden backdrop-blur-sm pointer-events-auto">
                 <motion.div
                   className="h-full bg-sky-500 rounded-full"
                   initial={{ width: 0 }}
                   animate={{ width: `${(Object.keys(currentFills).filter(k => !k.startsWith('ant')).length / currentArtwork.paths.filter(p => !p.id.startsWith('ant')).length) * 100}%` }}
                   transition={{ duration: 0.5 }}
                 />
               </div>
             )}

             <div className="w-full max-w-4xl bg-white/95 backdrop-blur-md rounded-3xl border border-slate-200/60 shadow-xl pointer-events-auto flex flex-col overflow-hidden">
                <div className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 border-b border-slate-100 bg-slate-50/50">
                  <div className="flex items-center gap-2 sm:gap-4 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-1">
                    <button
                      onClick={() => { setActivePalette('classic'); setIsClassicMode(true); }}
                      className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                        isClassicMode ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      Classic By Number
                    </button>
                    <div className="w-px h-4 bg-slate-200 shrink-0" />
                    {PALETTE_NAMES.filter(p => p.id !== 'classic').map(p => (
                      <button
                        key={p.id}
                        onClick={() => { setActivePalette(p.id); setIsClassicMode(false); }}
                        className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                          !isClassicMode && activePalette === p.id ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-200 shadow-sm' : 'text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                  {isClassicMode && (
                    <button onClick={handleHint} className="hidden sm:flex shrink-0 px-3 py-1.5 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold uppercase tracking-wider hover:bg-amber-100 transition-colors items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Hint
                    </button>
                  )}
                </div>

                <div className="px-4 py-4 sm:py-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] flex w-full min-h-[100px] bg-white/40 border-t border-slate-100/60 shadow-inner">
                  <AnimatePresence mode="popLayout">
                    <motion.div
                      key={activePalette}
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="flex gap-4 sm:gap-6 px-2 sm:px-4 items-center m-auto"
                    >
                      {activePalette === 'ai' && sessionInfo ? (
                        Object.entries(sessionInfo.palette).map(([key, item]: [string, { hex: string, theme: string }]) => (
                          <div key={`ai-${key}`} className="flex flex-col items-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                              onClick={() => setSelectedColor(item.hex)}
                              className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-full shadow-sm border border-black/5 shrink-0 ${selectedColor === item.hex ? 'ring-4 ring-sky-500/30 ring-offset-2' : ''}`}
                              style={{ backgroundColor: item.hex }}
                            >
                              {selectedColor === item.hex && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-md" />
                                </div>
                              )}
                            </motion.button>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{item.theme}</span>
                          </div>
                        ))
                      ) : activePalette === 'classic' && currentArtwork.classicPalette ? (
                        currentArtwork.classicPalette.map((color, index) => {
                          const total = currentArtwork.paths.filter(p => p.number === (index + 1) && !p.id.startsWith('ant')).length;
                          const remaining = currentArtwork.paths.filter(p => p.number === (index + 1) && !currentFills[p.id] && !p.id.startsWith('ant')).length;
                          const isDone = total > 0 && remaining === 0;
                          const progress = total === 0 ? 100 : ((total - remaining) / total) * 100;
                          const isSelected = selectedColor === color;

                          return (
                            <motion.button
                              key={`classic-${color}`}
                              whileHover={!isDone ? { scale: 1.1 } : {}} whileTap={!isDone ? { scale: 0.95 } : {}}
                              onClick={() => setSelectedColor(color)}
                              className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-full shrink-0 flex items-center justify-center ${isSelected && !isDone ? 'ring-4 ring-sky-500/30 ring-offset-2' : ''}`}
                            >
                              <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none">
                                 <circle cx="50%" cy="50%" r="45%" fill={isDone ? '#f1f5f9' : "white"} className="drop-shadow-sm" />
                                 {!isDone && (
                                   <circle
                                     cx="50%" cy="50%" r="45%" fill="none" stroke={color} strokeWidth="4"
                                     strokeDasharray="283" strokeDashoffset={`${283 * (1 - progress / 100)}`}
                                     strokeLinecap="round" className="transition-all duration-500"
                                   />
                                 )}
                              </svg>
                              <div className="w-[70%] h-[70%] rounded-full shadow-inner flex items-center justify-center z-10" style={{ backgroundColor: color, opacity: isDone ? 0.3 : 1 }}>
                                 {!isDone && <span className="text-white text-sm sm:text-lg font-bold drop-shadow-sm">{index + 1}</span>}
                                 {isDone && <Check className="w-4 h-4 sm:w-5 sm:h-5 text-slate-400 absolute" />}
                              </div>
                              {isSelected && !isDone && (
                                 <div className="absolute -top-1 -right-1 min-w-[20px] sm:min-w-[24px] h-[20px] sm:h-[24px] px-1 rounded-full bg-slate-800 text-white text-[10px] sm:text-xs font-bold flex items-center justify-center border-2 border-white shadow-sm z-20">
                                   {remaining}
                                 </div>
                              )}
                            </motion.button>
                          );
                        })
                      ) : (
                        (activePalette !== 'ai') && PALETTES[activePalette as keyof typeof PALETTES]?.map((color) => (
                          <motion.button
                            key={`${activePalette}-${color}`}
                            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}
                            onClick={() => setSelectedColor(color)}
                            className={`relative w-12 h-12 sm:w-16 sm:h-16 rounded-full shadow-sm border border-black/5 shrink-0 transition-all ${selectedColor === color ? 'ring-4 ring-sky-500/30 ring-offset-2' : ''}`}
                            style={{ backgroundColor: color }}
                          >
                            {selectedColor === color && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <Check className="w-5 h-5 sm:w-6 sm:h-6 text-white drop-shadow-md" />
                              </div>
                            )}
                          </motion.button>
                        ))
                      )}
                    </motion.div>
                  </AnimatePresence>
                </div>
             </div>
           </div>

           {/* Zoom Controls */}
           <div className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-30 pointer-events-auto">
               <div className="bg-white/90 backdrop-blur-md border border-slate-200/60 shadow-lg rounded-2xl p-1.5 flex flex-col gap-1">
                 <button onClick={() => setZoomLevel(z => Math.min(z + 0.3, 4))} className="w-10 h-10 rounded-xl hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors">
                   <ZoomIn className="w-5 h-5" />
                 </button>
                 <div className="w-6 h-px bg-slate-200 mx-auto" />
                 <button onClick={() => setZoomLevel(z => Math.max(z - 0.3, 0.5))} className="w-10 h-10 rounded-xl hover:bg-slate-100 text-slate-600 flex items-center justify-center transition-colors">
                   <ZoomOut className="w-5 h-5" />
                 </button>
               </div>
           </div>

           {/* Main Workspace Area (Canvas Layer) */}
           <div className="absolute inset-0 z-10 flex items-center justify-center pt-16 pb-48 overflow-hidden cursor-grab active:cursor-grabbing">
              <motion.div
                key={activeArtworkId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: zoomLevel }}
                className="transform-origin-center transition-transform duration-300 w-[85vmin] max-w-[800px] aspect-square"
              >
                <svg ref={svgRef} viewBox={currentArtwork.viewBox} className="w-full h-full drop-shadow-2xl relative z-10 filter-glow">
                  <defs>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="1.5" result="blur" />
                      <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>

                    <linearGradient id="brush-shine" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="white" stopOpacity="0.4" />
                      <stop offset="50%" stopColor="white" stopOpacity="0" />
                      <stop offset="100%" stopColor="black" stopOpacity="0.1" />
                    </linearGradient>

                    <pattern id="target-pattern" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                       <rect width="10" height="10" fill="rgba(0,0,0,0)" />
                       <circle cx="5" cy="5" r="2" fill="rgba(56, 189, 248, 0.5)" />
                    </pattern>

                    <filter id="paper-noise">
                      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
                      <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0.05 0.05 0.05 0 0" in="noise" />
                    </filter>
                  </defs>

                  {currentArtwork.paths.map((path) => {
                    const isFilled = !!currentFills[path.id];
                    const isHinted = hintPathId === path.id;

                    // In classic mode, highlight paths matching selected color
                    const isTargetNumber = isClassicMode && currentArtwork.classicPalette &&
                      path.number === (currentArtwork.classicPalette.indexOf(selectedColor) + 1) && !isFilled;

                    const fillColor = isFilled ? currentFills[path.id] : (isTargetNumber ? '#e2e8f0' : '#ffffff');

                    let wingCls = '';
                    if (currentArtwork.id === 'butterfly' || currentArtwork.id === 'monarch-journey' || currentArtwork.id === 'majestic-butterfly') {
                       if (path.id.startsWith('ul-') || path.id.startsWith('ll-') || path.id.startsWith('mj-l')) wingCls = 'wing-left';
                       else if (path.id.startsWith('ur-') || path.id.startsWith('lr-') || path.id.startsWith('mj-r')) wingCls = 'wing-right';
                    }

                    return (
                      <g key={path.id} className={wingCls}>
                        <path
                          d={path.d}
                          fill={fillColor}
                          stroke={isFilled ? 'transparent' : '#334155'}
                          strokeWidth={isTargetNumber ? 1.5 : 0.75}
                          strokeLinecap="round"
                          onClick={() => handleFill(path.id)}
                          className={`cursor-pointer hover:opacity-80 transition-opacity duration-300 ${isHinted ? 'animate-pulse' : ''}`}
                          style={{ filter: isFilled ? 'none' : (isTargetNumber ? 'url(#target-pattern)' : 'none'), transition: 'fill 0.6s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        />
                        {isHinted && !isFilled && (
                           <path d={path.d} fill="rgba(250, 204, 21, 0.6)" stroke="#facc15" strokeWidth="2" className="pointer-events-none animate-pulse" />
                        )}
                        <>
                          <path
                            d={path.d}
                            fill="url(#brush-shine)"
                            className="pointer-events-none mix-blend-overlay opacity-30"
                          />
                          {currentArtwork.id === 'nebula' && (path.id === 'spiral-1' || path.id === 'spiral-2') && (
                              <>
                                <path
                                  d={path.d}
                                  fill="none"
                                  stroke="rgba(255, 255, 255, 0.7)"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  className="pointer-events-none cosmic-shimmer mix-blend-screen"
                                />
                                <path
                                  d={path.d}
                                  fill="none"
                                  stroke="rgba(186, 230, 253, 0.5)"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  className="pointer-events-none cosmic-shimmer-layer2 mix-blend-screen"
                                />
                              </>
                            )}
                            {path.number && path.center && (!isFilled) && (
                              <text
                                x={path.center.x}
                                y={path.center.y}
                                fontSize={isTargetNumber ? "8" : "6"}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                className={`pointer-events-none font-bold select-none transition-colors ${isTargetNumber ? 'fill-sky-700' : 'fill-slate-500'}`}
                              >
                                {path.number}
                              </text>
                            )}
                          </>
                      </g>
                    );
                  })}

                  {/* Subtle paper texture overlay */}
                  <rect
                    x="-20%" y="-20%" width="140%" height="140%"
                    fill="url(#paper-noise)"
                    className="pointer-events-none mix-blend-multiply opacity-70"
                  />
                </svg>
              </motion.div>
           </div>

           {/* Completion Overlays */}
           <AnimatePresence>
             {sessionInfo && Object.values(fills[activeArtworkId] || {}).length > currentArtwork.paths.length * 0.4 && Object.values(fills[activeArtworkId] || {}).length < currentArtwork.paths.length * 0.45 && (
               <motion.div
                 initial={{ opacity: 0, scale: 0.9, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 30 }}
                 className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 bg-white/95 backdrop-blur-md px-6 py-4 rounded-3xl shadow-2xl border border-slate-200/50 max-w-sm w-full text-center"
               >
                 <p className="text-sm font-serif italic text-slate-800">
                   A gentle check-in: "{sessionInfo.mid_coloring_prompt}"
                 </p>
               </motion.div>
             )}

             {sessionInfo && Object.values(fills[activeArtworkId] || {}).length >= currentArtwork.paths.filter(p => !p.id.startsWith('ant')).length && (
               <motion.div
                 initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                 className="absolute inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-md p-4"
               >
                 <div className="bg-gradient-to-br from-white to-slate-50 text-slate-800 p-10 rounded-[3rem] shadow-2xl text-center max-w-lg w-full relative overflow-hidden border border-white">
                   <div className="absolute top-0 right-0 p-8 opacity-5">
                     <Sparkles className="w-48 h-48" />
                   </div>
                   <h4 className="text-4xl font-serif mb-4 relative z-10 text-sky-900">Masterpiece Complete</h4>
                   <p className="text-lg opacity-80 italic relative z-10 font-serif">"{sessionInfo.completion_affirmation}"</p>
                   <button
                     onClick={() => setSessionInfo(null)}
                     className="mt-8 px-6 py-3 bg-sky-500 hover:bg-sky-600 shadow-md text-white rounded-full font-bold uppercase tracking-widest text-xs transition-colors relative z-10"
                   >
                     Continue
                   </button>
                 </div>
               </motion.div>
             )}
           </AnimatePresence>

        </div>
      )}
    </div>
  );
}
