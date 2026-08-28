import { useState, useRef, useEffect, MouseEvent as ReactMouseEvent, TouchEvent as ReactTouchEvent } from 'react';
import { MousePointer2 } from 'lucide-react';

interface SplitPreviewProps {
  originalImage: string;
  processedImage: string;
}

export function SplitPreview({ originalImage, processedImage }: SplitPreviewProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percentage = (x / rect.width) * 100;
    setSliderPosition(percentage);
  };

  const onMouseMove = (e: MouseEvent) => {
    if (isDragging) handleMove(e.clientX);
  };

  const onTouchMove = (e: TouchEvent) => {
    if (isDragging && e.touches[0]) handleMove(e.touches[0].clientX);
  };

  const stopDragging = () => setIsDragging(false);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', stopDragging);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', stopDragging);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopDragging);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', stopDragging);
    };
  }, [isDragging]);

  return (
    <div className="flex flex-col h-full bg-[#0A0A0A] border border-[#333]">
      <div className="flex justify-between items-center p-4 border-b border-[#333] bg-neutral-900/50">
        <div className="flex gap-4">
           <span className="text-xs font-mono uppercase bg-[#333] px-2 py-1">Original (Raster)</span>
           <span className="text-xs font-mono uppercase bg-[#CCFF00] text-black px-2 py-1 font-bold">Vectorized (SVG)</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
           <MousePointer2 className="w-3 h-3" />
           <span>Drag center to compare</span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden cursor-ew-resize min-h-[400px] select-none"
        onMouseDown={(e) => { setIsDragging(true); handleMove(e.clientX); }}
        onTouchStart={(e) => { setIsDragging(true); handleMove(e.touches[0].clientX); }}
      >
        <div className="absolute inset-0 bg-[#111] flex items-center justify-center bg-[radial-gradient(#222_1px,transparent_1px)] [background-size:20px_20px]">
           {/* Vector Image Container (Bottom Layer) */}
           <div className="absolute inset-4 object-contain">
             <div className="w-full h-full" style={{ backgroundImage: `url(${processedImage})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }} />
           </div>
        </div>

        {/* Original Image Container (Clipped Top Layer) */}
        <div
          className="absolute inset-0 z-10 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
           <div className="absolute inset-4 w-[calc(100%-2rem)] h-[calc(100%-2rem)]">
              <div className="w-full h-full" style={{ backgroundImage: `url(${originalImage})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', filter: 'blur(2px) grayscale(50%)' }} />
           </div>
        </div>

        {/* Slider Handle */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-[#CCFF00] z-20 transform -translate-x-1/2 flex items-center justify-center shadow-[0_0_15px_rgba(204,255,0,0.5)] cursor-col-resize hover:bg-[#D4FF33]"
          style={{ left: `${sliderPosition}%` }}
        >
          <div className="w-6 h-12 bg-[#0A0A0A] border-2 border-[#CCFF00] rounded-sm flex flex-col items-center justify-center gap-1">
             <div className="w-0.5 h-6 bg-[#CCFF00]" />
          </div>
        </div>
      </div>
    </div>
  );
}
