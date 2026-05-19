import { CheckCircle2, Layers, Cpu, Code, Download, Zap } from 'lucide-react';

export function CoreFeatures() {
  const features = [
    {
      icon: <Cpu className="w-6 h-6" />,
      title: "Deep Learning Tracing Model",
      desc: "Proprietary AI model that analyzes pixel grouping, predicting geometric shapes, beziér curves, and sharp corners.",
      tags: ["AI/ML"]
    },
    {
      icon: <Layers className="w-6 h-6" />,
      title: "Full Color & Palette Extraction",
      desc: "Automatically identifies dominant color palettes and groups similar colors to reduce vector complexity.",
      tags: ["Processing"]
    },
    {
      icon: <Code className="w-6 h-6" />,
      title: "Developer REST API",
      desc: "High-throughput API endpoints for integrating auto-tracing directly into print-on-demand platforms.",
      tags: ["B2B API"]
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Real-time Browser Preview",
      desc: "Instant side-by-side comparison of original raster and traced vector with interactive zoom and pan support.",
      tags: ["UX"]
    },
    {
      icon: <Download className="w-6 h-6" />,
      title: "Multi-format Export",
      desc: "Export to industry-standard formats including SVG (web), EPS (print), PDF (document), and DXF (CAD).",
      tags: ["Utility"]
    }
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-end border-b border-[#333] pb-6">
        <div className="flex flex-col">
          <span className="text-[#CCFF00] font-mono text-xs tracking-widest mb-2 uppercase">[ Technical Capabilities ]</span>
          <h2 className="text-4xl md:text-5xl font-black uppercase leading-none tracking-tighter italic">Core <span className="text-[#CCFF00]">Engine</span> Features</h2>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((f, i) => (
          <div key={i} className="group p-6 bg-neutral-900 border-l-2 border-neutral-700 hover:border-[#CCFF00] transition-all duration-300 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 border border-[#333] text-[#F0F0F0] group-hover:bg-[#CCFF00] group-hover:text-black flex items-center justify-center mb-6 transition-colors">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold uppercase italic text-[#F0F0F0] mb-3">{f.title}</h3>
              <p className="text-xs text-neutral-400 leading-relaxed mb-6">
                {f.desc}
              </p>
            </div>
            <div className="flex gap-2 border-t border-[#333] pt-4">
              {f.tags.map(tag => (
                <span key={tag} className="bg-[#CCFF00] text-black px-2 py-1 text-[10px] font-black uppercase tracking-widest">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
