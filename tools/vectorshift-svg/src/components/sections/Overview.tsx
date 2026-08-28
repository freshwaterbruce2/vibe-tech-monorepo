export function Overview() {
  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-end border-b border-[#333] pb-6">
        <div className="flex flex-col">
          <span className="text-[#CCFF00] font-mono text-xs tracking-widest mb-2 uppercase">[ Product Overview ]</span>
          <h2 className="text-4xl md:text-5xl font-black uppercase leading-none tracking-tighter italic">Auto-Tracing <span className="text-[#CCFF00]">Platform</span></h2>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-neutral-900 p-6 border-l-2 border-[#CCFF00]">
          <h3 className="text-lg font-bold uppercase italic flex gap-4 items-center border-b border-[#333] pb-4 mb-4">
            <span className="text-4xl font-black opacity-20">01</span>
            The Problem
          </h3>
          <p className="text-sm text-neutral-400 leading-relaxed">
            Converting raster images (JPEGs, PNGs) into scalable vector graphics (SVGs, EPS) is traditionally a slow, manual process requiring expensive tools like Adobe Illustrator or settling for subpar, noisy results from standard algorithms like Potrace.
          </p>
        </div>

        <div className="bg-neutral-900 p-6 border-l-2 border-neutral-700">
          <h3 className="text-lg font-bold uppercase italic flex gap-4 items-center border-b border-[#333] pb-4 mb-4">
            <span className="text-4xl font-black opacity-20">02</span>
            The Solution
          </h3>
          <p className="text-sm text-neutral-400 leading-relaxed">
            An AI-powered, browser-based vectorization tool that uses Deep Learning to understand shapes, curves, and colors, producing clean, mathematically precise vector files in seconds without manual tracing.
          </p>
        </div>
      </div>

      <div className="border border-[#333] relative flex items-center justify-center bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:20px_20px] p-12">
        <div className="absolute inset-0 bg-gradient-to-br from-[#CCFF0015] to-transparent pointer-events-none"></div>
        <div className="relative z-10 w-full">
          <h2 className="bg-[#CCFF00] text-black inline-block px-3 py-1 text-xs font-black uppercase mb-6 underline">Vision Statement</h2>
          <div className="text-center">
             <div className="w-24 h-24 border-4 border-[#CCFF00] rounded-full mx-auto mb-6 flex items-center justify-center p-2 transform -rotate-12">
               <div className="w-full h-full border border-dashed border-[#CCFF00] rounded-full flex items-center justify-center">
                  <span className="text-2xl font-black italic">AI+</span>
               </div>
             </div>
             <p className="text-[#F0F0F0] text-lg max-w-2xl font-bold uppercase italic leading-relaxed mx-auto">
               "To be the default API and web utility for developers and designers to instantly bridges the gap between pixel and vector graphics, making resolution-independence universally accessible."
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
