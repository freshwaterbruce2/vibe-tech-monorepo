import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Palette, Check, ArrowLeftRight, Save, Download, Sparkles, Wand2,
  ChevronLeft, Brush, ZoomIn, ZoomOut, RotateCcw,
} from 'lucide-react';
import { useZenColoring } from './useZenColoring';
import { PaletteName } from './zenColoringTypes';
import { PALETTES } from './zenColoringTypes';

export function ZenColoring() {
  const hook = useZenColoring();
  const {
    screen, setScreen, activeArtworkId, setActiveArtworkId, fills,
    currentArtwork, currentFills, selectedColor, setSelectedColor,
    activePalette, setActivePalette, symmetryMode, setSymmetryMode,
    isClassicMode, activeCategory, setActiveCategory,
    hintPathId, notice, exporting, pendingReset, selectedVectorArtwork,
    setSelectedVectorArtwork, sessionInfo, aiLoading, currentPalette,
    svgRef, ENRICHED_ARTWORKS, VECTOR_SHIFT_ARTWORKS,
    handleFill, toggleClassicMode, handleHint, handleReset, confirmReset,
    handleExport, generateAISession, showNotice,
  } = hook;

  const [zoom, setZoom] = useState(1);

  return (
    <div className="flex flex-col items-center pb-40 min-h-screen relative">
      <style>{`
        @keyframes cosmicShimmer { 0% { stroke-dashoffset: 300; } 100% { stroke-dashoffset: 0; } }
        @keyframes cosmicGlow { 0%,100%{filter:drop-shadow(0 0 4px rgba(255,255,255,0.4));opacity:0.7;} 50%{filter:drop-shadow(0 0 12px rgba(255,255,255,0.9)) drop-shadow(0 0 24px rgba(56,189,248,0.8));opacity:1;} }
        .cosmic-shimmer { stroke-dasharray:15 45; animation:cosmicShimmer 4s linear infinite, cosmicGlow 3s ease-in-out infinite; }
        .cosmic-shimmer-layer2 { stroke-dasharray:40 80; stroke-width:3px; animation:cosmicShimmer 7s linear infinite reverse, cosmicGlow 5s ease-in-out infinite; }
      `}</style>

      <AnimatePresence>
        {notice && (
          <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-12}}
            className="fixed top-6 left-1/2 z-[80] -translate-x-1/2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-2xl">
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
          <div className="flex gap-2 overflow-x-auto pb-4 mb-8">
            {['All','Butterflies','Nature','Geometric','Abstract','Love'].map(cat => (
              <button key={cat} onClick={() => setActiveCategory(cat as any)}
                className={`px-5 py-2.5 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeCategory === cat ? 'bg-sky-500 text-white shadow-md' : 'bg-white/60 text-sky-900/40 hover:bg-white/80 hover:text-sky-900 shadow-sm border border-white/60'
                }`}>
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
                <div key={art.id} className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-200 transition-all p-4 sm:p-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6 text-left">
                  <div className="w-full sm:w-36 h-48 sm:h-36 shrink-0 bg-slate-50 rounded-xl relative flex items-center justify-center p-3 border border-slate-100 overflow-hidden group-hover:bg-slate-100/50">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{backgroundImage:'radial-gradient(#000 1px,transparent 1px)',backgroundSize:'16px 16px'}} />
                    <svg viewBox={art.viewBox} className="w-full h-full drop-shadow-sm relative z-10 transition-transform duration-700 ease-out group-hover:scale-105 pointer-events-none">
                      {art.paths.map(p => {
                        const savedColor = savedFills[p.id];
                        const targetColor = art.classicPalette?.[((p.number||1)-1)%(art.classicPalette?.length||1)] || '#cbd5e1';
                        const fillColor = savedColor || '#ffffff';
                        const strokeColor = savedColor ? 'rgba(0,0,0,0.1)' : '#334155';
                        return (
                          <g key={p.id} className={(art.id==='butterfly'||art.id==='monarch-journey') && (p.id.startsWith('ul-')||p.id.startsWith('ll-')) ? 'wing-left' : (art.id==='butterfly'||art.id==='monarch-journey') && (p.id.startsWith('ur-')||p.id.startsWith('lr-')) ? 'wing-right' : ''}>
                            <path d={p.d} fill={fillColor} fillOpacity={1} stroke={strokeColor} strokeWidth={savedColor?1:0.8} strokeLinecap="round" />
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                  <div className="flex flex-col flex-1 min-w-0 z-10 relative pr-1 sm:pr-2">
                    <h3 className="text-xl sm:text-lg font-bold text-slate-800 font-serif leading-tight truncate">{art.name}</h3>
                    <div className="flex items-center justify-between mt-1 mb-4 gap-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider truncate">{art.category} • {total} parts</span>
                      {progress > 0 && <span className="text-[10px] shrink-0 font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full ring-1 ring-sky-200">{Math.round(progress)}%</span>}
                    </div>
                    {progress > 0 && <div className="h-1.5 w-full bg-slate-100 rounded-full mb-4 overflow-hidden border border-black/5"><div className="h-full bg-sky-500 rounded-full" style={{width:`${progress}%`}} /></div>}
                    <div className="grid grid-cols-2 gap-2 mt-auto pt-2 sm:pt-4">
                      <button onClick={() => { setActiveArtworkId(art.id); setIsClassicMode(true); setActivePalette('classic'); setScreen('workspace'); }} className="w-full py-3 sm:py-2.5 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800">Classic</button>
                      <button onClick={() => { setActiveArtworkId(art.id); setIsClassicMode(false); setActivePalette('celestial'); setScreen('workspace'); }} className="w-full py-3 sm:py-2.5 bg-sky-50 text-sky-700 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-sky-100 border border-sky-100">Zen</button>
                    </div>
                  </div>
                </div>
              );
            })}
            {activeCategory === 'All' && VECTOR_SHIFT_ARTWORKS.map(asset => (
              <div key={asset.id} className="group relative bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-sky-200 p-4 sm:p-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-4 sm:gap-6">
                <div className="w-full sm:w-36 h-48 sm:h-36 shrink-0 bg-slate-50 rounded-xl flex items-center justify-center p-2 border border-slate-100 group-hover:bg-slate-100/50">
                  <img src={asset.src} alt={asset.name} loading="lazy" className="h-full w-full object-contain transition-transform group-hover:scale-105" />
                </div>
                <div className="flex flex-col flex-1 min-w-0 pr-1 sm:pr-2">
                  <span className="mb-2 w-fit rounded-full px-2.5 py-1 text-[9px] font-bold uppercase text-white" style={{backgroundColor:asset.accent}}>VectorShift SVG</span>
                  <h3 className="text-xl font-bold text-slate-800 font-serif">{asset.name}</h3>
                  <p className="mt-2 text-xs text-slate-500">Imported from the local VectorShift output set.</p>
                  <button onClick={() => { setSelectedVectorArtwork(asset); setScreen('vector-preview'); }} className="mt-auto pt-4 w-full py-3 bg-sky-50 text-sky-700 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-sky-100 border border-sky-100">View SVG</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : screen === 'vector-preview' && selectedVectorArtwork ? (
        <div className="fixed inset-0 bg-[#f8fafc] flex z-50 overflow-hidden">
          <div className="absolute top-4 inset-x-4 z-30 flex items-center justify-between">
            <button onClick={() => setScreen('gallery')} className="w-12 h-12 bg-white/90 backdrop-blur rounded-2xl border flex items-center justify-center"><ChevronLeft className="w-6 h-6" /></button>
            <div className="bg-white/90 px-5 h-12 border rounded-2xl flex flex-col justify-center">
              <h2 className="text-sm font-serif">{selectedVectorArtwork.name}</h2>
              <p className="text-[8px] uppercase text-slate-400">VectorShift Import</p>
            </div>
          </div>
          <div className="absolute inset-0 z-10 flex items-center justify-center pt-20 pb-24">
            <img src={selectedVectorArtwork.src} alt={selectedVectorArtwork.name} className="max-h-full max-w-full rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200" />
          </div>
        </div>
      ) : (
        /* Workspace */
        <div className="fixed inset-0 bg-[#f8fafc] flex z-50 overflow-hidden font-sans">
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{backgroundImage:'radial-gradient(#000 1px,transparent 1px)',backgroundSize:'32px 32px'}} />

          {/* Pending reset modal */}
          <AnimatePresence>
            {pendingReset && (
              <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="absolute inset-0 z-[70] flex items-center justify-center bg-slate-900/30 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-3xl p-8 max-w-sm text-center">
                  <h3 className="font-serif text-2xl mb-2">Reset artwork?</h3>
                  <p className="text-sm text-gray-600 mb-6">All colors will be cleared.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setPendingReset(false)} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-900 font-medium">Cancel</button>
                    <button onClick={confirmReset} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-medium">Reset</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top bar */}
          <div className="absolute top-4 inset-x-4 z-40 flex items-center justify-between pointer-events-auto">
            <div className="flex items-center gap-3">
              <button onClick={() => setScreen('gallery')} className="w-12 h-12 bg-white/90 backdrop-blur rounded-2xl border flex items-center justify-center"><ChevronLeft className="w-6 h-6" /></button>
              <div className="bg-white/90 px-5 h-12 border rounded-2xl flex items-center">
                <span className="font-serif text-lg text-slate-800">{currentArtwork.name}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <button onClick={toggleClassicMode} className={`px-4 py-2 rounded-full font-medium transition ${isClassicMode ? 'bg-amber-600 text-white' : 'bg-white text-slate-700 border'}`}>
                {isClassicMode ? 'Classic Mode ✓' : 'Switch to Classic'}
              </button>
              <button onClick={handleHint} disabled={!isClassicMode} className="px-4 py-2 rounded-full bg-white border disabled:opacity-40">Hint</button>
              <button onClick={handleReset} className="px-4 py-2 rounded-full bg-white border flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Reset</button>
              <button onClick={handleExport} disabled={exporting} className="px-4 py-2 rounded-full bg-sky-600 text-white flex items-center gap-2"><Download className="w-4 h-4" /> {exporting ? 'Exporting…' : 'Export SVG'}</button>
            </div>
          </div>

          {/* Palette / Tools sidebar */}
          <div className="w-80 bg-white border-r border-slate-200 flex flex-col pt-20 pb-6 px-4 gap-6 overflow-auto z-30">
            <div>
              <div className="uppercase tracking-[1.5px] text-[10px] font-bold text-slate-400 mb-2 flex items-center gap-2">PALETTE</div>
              <div className="flex flex-wrap gap-1.5">
                {PALETTE_NAMES.map(p => (
                  <button key={p.id} onClick={() => { setActivePalette(p.id); if (p.id === 'ai') generateAISession(); }} className={`px-3 py-1.5 text-xs rounded-full border transition ${activePalette===p.id ? 'bg-sky-600 text-white border-sky-600' : 'bg-white hover:bg-slate-50 border-slate-200'}`}>
                    {p.label}
                  </button>
                ))}
                <button onClick={generateAISession} disabled={aiLoading} className="px-3 py-1.5 text-xs rounded-full border flex items-center gap-1 bg-white hover:bg-amber-50 disabled:opacity-60 border-amber-200 text-amber-600">
                  <Sparkles className="w-3.5 h-3.5" /> AI
                </button>
              </div>
            </div>

            <div>
              <div className="uppercase tracking-[1.5px] text-[10px] font-bold text-slate-400 mb-2 flex justify-between">
                <span>COLORS</span>
                {activePalette === 'ai' && <button onClick={() => generateAISession()} className="text-amber-500 hover:underline text-[10px]">Regenerate</button>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(activePalette === 'ai' ? Object.values(sessionInfo.palette).map(o => o.hex) : currentPalette).map((hex,i) => (
                  <button key={i} onClick={() => setSelectedColor(hex)} className={`w-9 h-9 rounded-full border-2 transition ${selectedColor===hex ? 'border-sky-600 scale-110' : 'border-slate-200 hover:border-slate-400'}`} style={{backgroundColor:hex}} />
                ))}
              </div>
            </div>

            <div className="mt-auto pt-4 border-t">
              <div className="uppercase tracking-[1.5px] text-[10px] font-bold text-slate-400 mb-2">OPTIONS</div>
              <div className="flex items-center justify-between text-sm mb-3">
                <span>Symmetry</span>
                <button onClick={() => setSymmetryMode(!symmetryMode)} className={`relative h-6 w-11 rounded-full transition ${symmetryMode ? 'bg-sky-600' : 'bg-slate-200'}`}><span className={`absolute top-0.5 ${symmetryMode ? 'right-0.5' : 'left-0.5'} h-5 w-5 rounded-full bg-white shadow`} /></button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setZoom(Math.max(0.5, zoom-0.1))} className="flex-1 py-2 bg-white border rounded-xl text-xs font-medium flex items-center justify-center gap-1"><ZoomOut className="w-4 h-4"/> Zoom Out</button>
                <button onClick={() => setZoom(Math.min(3, zoom+0.1))} className="flex-1 py-2 bg-white border rounded-xl text-xs font-medium flex items-center justify-center gap-1"><ZoomIn className="w-4 h-4"/> Zoom In</button>
              </div>
            </div>
          </div>

          {/* Canvas area */}
          <div className="flex-1 flex items-center justify-center pt-20 pb-16 relative z-20 overflow-hidden" style={{background:'radial-gradient(circle at center,#f8fafc 0%,#e0f2fe 100%)'}}>
            <motion.div style={{scale:zoom}} className="relative" animate={{scale:zoom}}>
              <svg ref={svgRef} viewBox={currentArtwork.viewBox} width={520} height={520}
                className="bg-white rounded-3xl shadow-xl border border-slate-200 touch-none"
                onClick={(e) => {
                  const el = e.target as SVGPathElement;
                  if (el.tagName === 'path' && el.id) handleFill(el.id);
                }}>
                {currentArtwork.paths.map((p,i) => {
                  const saved = currentFills[p.id];
                  const cls = hintPathId === p.id ? 'animate-pulse' : '';
                  return (
                    <g key={i} className={cls}>
                      <path id={p.id} d={p.d} fill={saved || '#ffffff'} stroke={saved ? '#334155' : '#64748b'} strokeWidth={0.8} strokeLinecap="round" strokeLinejoin="round" style={{cursor:'pointer'}}/>
                      {saved && <path d={p.d} fill="none" stroke="rgba(15,23,42,0.15)" strokeWidth={1.2} strokeLinecap="round"/>}
                    </g>
                  );
                })}
              </svg>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
