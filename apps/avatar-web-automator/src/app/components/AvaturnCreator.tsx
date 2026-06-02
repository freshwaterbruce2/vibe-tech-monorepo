import React, { useEffect, useRef } from 'react';

interface AvaturnCreatorProps {
  onAvatarCreated: (url: string) => void;
  onClose: () => void;
}

export const AvaturnCreator = ({ onAvatarCreated, onClose }: AvaturnCreatorProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Allow any origin for demo purposes, since Avaturn runs on demo.avaturn.dev or avaturn.me
      try {
        let payload: Record<string, unknown> | null = null;
        if (typeof event.data === 'string') {
          payload = JSON.parse(event.data) as Record<string, unknown>;
        } else if (event.data && typeof event.data === 'object') {
          payload = event.data as Record<string, unknown>;
        }

        if (!payload) return;

        console.log('[AvaturnCreator] Received message:', payload);

        // Check for export events
        const type = typeof payload.type === 'string' ? payload.type : '';
        const eventName = typeof payload.event === 'string' ? payload.event : '';
        
        if (type === 'export' || type === 'avatar.exported' || eventName === 'export' || type === 'avaturn.export') {
          const data = (payload.data && typeof payload.data === 'object') ? (payload.data as Record<string, unknown>) : {};
          const rawUrl = data.url ?? payload.url;
          const url = typeof rawUrl === 'string' ? rawUrl : '';
          if (url?.includes('.glb')) {
            console.log('[AvaturnCreator] Successfully matched exported avatar URL:', url);
            onAvatarCreated(url);
          }
        } else {
          // Recursive check for any glb url in payload
          const findGlb = (obj: unknown): string | null => {
            if (!obj) return null;
            if (typeof obj === 'string' && obj.includes('.glb') && !obj.includes('demo.avaturn.dev') && !obj.includes('demo.avaturn.me')) {
              return obj;
            }
            if (typeof obj === 'object') {
              const record = obj as Record<string, unknown>;
              for (const key in record) {
                try {
                  const found = findGlb(record[key]);
                  if (found) return found;
                } catch {
                  // Ignore access errors on forbidden keys
                }
              }
            }
            return null;
          };

          const glbUrl = findGlb(payload);
          if (glbUrl) {
            console.log('[AvaturnCreator] Found GLB URL in nested payload:', glbUrl);
            onAvatarCreated(glbUrl);
          }
        }
      } catch {
        // Ignored JSON parse issues
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onAvatarCreated]);

  return (
    <div className="w-full h-full flex flex-col bg-space-slate">
      <div className="flex justify-between items-center p-4 bg-nebula-dark-card border-b border-white/5">
        <h3 className="font-bold text-white text-base">Avaturn 3D Creator</h3>
        <button
          onClick={onClose}
          className="text-soft-gray hover:text-white transition-colors p-1"
        >
          ✕ Close
        </button>
      </div>
      <div className="flex-1 bg-black relative">
        <iframe
          ref={iframeRef}
          src="https://demo.avaturn.dev"
          className="w-full h-full border-none"
          allow="camera; microphone; clipboard-write"
          title="Avaturn 3D Avatar Editor"
        />
        {/* Quick simulation helper badge for developer / manual URL entry in web browser */}
        <div className="absolute top-4 left-4 bg-nebula-dark-card/90 border border-pulsar-aqua/30 p-3 rounded-lg max-w-xs text-xs text-soft-gray shadow-lg pointer-events-auto">
          <p className="font-semibold text-pulsar-aqua mb-1">Web Simulator Controls</p>
          <p className="mb-2">If Avaturn does not run or camera permissions are missing in this environment, you can trigger a mock completion:</p>
          <button
            onClick={() => {
              const mockUrl = 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';
              console.log('[WebSimulator] Simulating RPM/Avaturn export URL:', mockUrl);
              onAvatarCreated(mockUrl);
            }}
            className="w-full bg-pulsar-aqua text-black font-bold py-1 px-2 rounded hover:bg-white transition-colors"
          >
            Simulate Avatar Export (.glb)
          </button>
        </div>
      </div>
    </div>
  );
};

export default AvaturnCreator;
