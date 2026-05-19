import { Users, Building2, Paintbrush, Braces } from 'lucide-react';

export function TargetAudience() {
  const personas = [
    {
      icon: <Paintbrush className="w-6 h-6" />,
      title: "Graphic Professionals",
      subtitle: "Workflow optimization for logo designers",
      needs: [
        "Convert hand-drawn sketches to vector",
        "Upscale low-res client logos",
        "Clean, editable anchor points"
      ],
      willingnessToPay: "Medium"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Print-on-Demand",
      subtitle: "Automated scaling for large-format apparel",
      needs: [
        "Prepare low-quality artwork for DTG",
        "Automated background removal",
        "Speed and batch processing"
      ],
      willingnessToPay: "High"
    },
    {
      icon: <Braces className="w-6 h-6" />,
      title: "Indie App Devs & B2B",
      subtitle: "Converting assets to dynamic components",
      needs: [
        "Reliable REST API integrations",
        "Robust documentation & Webhooks",
        "Predictable pricing per image"
      ],
      willingnessToPay: "Enterprise"
    },
    {
      icon: <Building2 className="w-6 h-6" />,
      title: "Marketing Agencies",
      subtitle: "Recreating lost vector brand assets",
      needs: [
        "Recreate lost vector brand assets",
        "Fast turnaround times",
        "Zero training required"
      ],
      willingnessToPay: "High"
    }
  ];

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-end border-b border-[#333] pb-6">
        <div className="flex flex-col">
          <span className="text-[#CCFF00] font-mono text-xs tracking-widest mb-2 uppercase">[ User Personas ]</span>
          <h2 className="text-4xl md:text-5xl font-black uppercase leading-none tracking-tighter italic">Market <span className="text-[#CCFF00]">Segments</span></h2>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {personas.map((p, i) => (
          <div key={i} className="p-6 bg-neutral-900 border border-[#333] flex flex-col justify-between hover:border-[#CCFF00] transition-colors group">
            <div className="flex items-start justify-between mb-6 border-b border-[#333] pb-6">
              <div className="flex gap-4 items-center">
                <span className="text-5xl font-black opacity-20 text-transparent transition-colors [-webkit-text-stroke:2px_#333] group-hover:[-webkit-text-stroke:2px_#CCFF00]">0{i + 1}</span>
                <div>
                  <p className="font-bold uppercase text-lg italic">{p.title}</p>
                  <p className="text-xs text-neutral-500 font-mono tracking-tighter uppercase">{p.subtitle}</p>
                </div>
              </div>
              <div className="w-10 h-10 border border-[#333] flex items-center justify-center text-[#CCFF00] bg-[#0A0A0A]">
                {p.icon}
              </div>
            </div>

            <div className="mb-4">
              <h4 className="bg-[#CCFF00] text-black inline-block px-2 py-0.5 text-[10px] font-black uppercase mb-3">Key Requirements</h4>
              <ul className="space-y-2">
                {p.needs.map((need, j) => (
                  <li key={j} className="text-sm text-neutral-400 flex items-start gap-2">
                    <span className="text-[#CCFF00] font-black italic">+</span> {need}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-auto pt-6 border-t border-[#333] flex justify-between items-center">
              <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-500">Willingness to Pay</span>
              <span className="text-[#CCFF00] font-black uppercase tracking-wider text-xs border border-[#CCFF00] px-3 py-1">
                {p.willingnessToPay}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
