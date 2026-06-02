import React, { useEffect, useRef, useState } from 'react';
import AvatarCanvas from './AvatarCanvas';
import { mapLandmarksToVrm, TrackingValues } from '@vibetech/avatar-processor';

interface AvaturnViewerProps {
  modelId: string;
  visemeValue: number;
  micAmplitude: number;
}

interface FaceMeshInstance {
  setOptions: (options: Record<string, unknown>) => void;
  onResults: (callback: (results: { multiFaceLandmarks?: Array<Array<{ x: number; y: number; z: number }>> }) => void) => void;
  send: (input: { image: HTMLVideoElement }) => Promise<void>;
}

interface ModelViewerElement extends HTMLElement {
  loaded?: boolean;
}

interface SceneNode {
  isSkinnedMesh?: boolean;
  morphTargetInfluences?: number[];
  morphTargetDictionary?: Record<string, number>;
  isBone?: boolean;
  isObject3D?: boolean;
  name?: string;
  rotation: { x: number; y: number; z: number };
}

export const AvaturnViewer = ({
  modelId,
  visemeValue,
  micAmplitude,
}: AvaturnViewerProps) => {
  const viewerRef = useRef<ModelViewerElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<FaceMeshInstance | null>(null);
  const requestRef = useRef<number | null>(null);

  const [modelViewerLoaded, setModelViewerLoaded] = useState(() => {
    return typeof window !== 'undefined' && !!document.getElementById('model-viewer-script');
  });
  const [hasError, setHasError] = useState(false);

  // Tracking and view states
  const [isTracking, setIsTracking] = useState(false);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);
  const [isGreenScreen, setIsGreenScreen] = useState(false);

  // References for tracking results and smoothed values
  const trackingValuesRef = useRef<TrackingValues | null>(null);
  const currentValuesRef = useRef<TrackingValues>({
    blinkLeft: 0,
    blinkRight: 0,
    mouthOpen: 0,
    mouthStretch: 0,
    mouthPucker: 0,
    yaw: 0,
    pitch: 0,
    roll: 0,
  });

  // Determine the model URL
  const glbUrl =
    modelId && modelId.startsWith('http') && !modelId.includes('demo.avaturn')
      ? modelId
      : 'https://modelviewer.dev/shared-assets/models/Astronaut.glb';

  // Load the model-viewer script if not already present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const existingScript = document.getElementById('model-viewer-script');
      if (!existingScript) {
        const script = document.createElement('script');
        script.id = 'model-viewer-script';
        script.type = 'module';
        script.src = 'https://ajax.googleapis.com/ajax/libs/model-viewer/3.1.1/model-viewer.min.js';
        script.onload = () => setModelViewerLoaded(true);
        script.onerror = () => setHasError(true);
        document.head.appendChild(script);
      }
    }
  }, []);

  // Handle webcam capture and MediaPipe Face Mesh initialization
  useEffect(() => {
    let active = true;
    let localStream: MediaStream | null = null;
    let localFaceMesh: FaceMeshInstance | null = null;

    const startTracking = async () => {
      setIsLoadingTracking(true);
      try {
        // Dynamic loading of MediaPipe Face Mesh
        if (!(window as unknown as { FaceMesh?: unknown }).FaceMesh) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.id = 'mediapipe-face-mesh';
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js';
            script.crossOrigin = 'anonymous';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load FaceMesh library.'));
            document.head.appendChild(script);
          });
        }

        if (!active) return;

        // Initialize FaceMesh instance if not already initialized
        if (!faceMeshRef.current) {
          const FaceMeshClass = (window as unknown as {
            FaceMesh: new (config: { locateFile: (file: string) => string }) => FaceMeshInstance;
          }).FaceMesh;
          
          const fm = new FaceMeshClass({
            locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
          });

          fm.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });

          fm.onResults((results) => {
            if (!active) return;
            if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
              const rawLandmarks = results.multiFaceLandmarks[0];
              if (rawLandmarks) {
                const mapped = mapLandmarksToVrm(rawLandmarks);
                trackingValuesRef.current = mapped;
              }
            }
          });

          faceMeshRef.current = fm;
        }

        localFaceMesh = faceMeshRef.current;

        // Request webcam access
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: 'user' },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        localStream = stream;
        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Active processing loop
        const runDetection = () => {
          if (!active || !isTracking) return;
          const video = videoRef.current;
          if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
            localFaceMesh?.send({ image: video }).catch((err: unknown) => {
              console.error('[AvaturnViewer] FaceMesh detection error:', err);
            });
          }
          if (active && isTracking) {
            requestAnimationFrame(runDetection);
          }
        };

        runDetection();
      } catch (err) {
        console.error('[AvaturnViewer] Failed to initialize face tracking:', err);
        alert('Webcam access or Face Mesh model initialization failed. Please check permissions.');
        setIsTracking(false);
      } finally {
        if (active) {
          setIsLoadingTracking(false);
        }
      }
    };

    if (isTracking) {
      void startTracking();
    } else {
      // Stop webcam and clean references
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      trackingValuesRef.current = null;
    }

    return () => {
      active = false;
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [isTracking]);

  // Update morph targets & skeletal rotations in requestAnimationFrame loop
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    const lerp = (start: number, end: number, amt: number) => (1 - amt) * start + amt * end;

    // Traversal animation loop
    const animateModel = () => {
      try {
        const symbol = Symbol.for('3D-model-scene-graph');
        const scene = (viewer as unknown as Record<
          symbol,
          { traverse: (callback: (child: SceneNode) => void) => void }
        >)[symbol];


        if (scene) {
          // 1. Calculate values: either from Webcam tracking or Audio simulation fallback
          const targetValues = trackingValuesRef.current;
          const cur = currentValuesRef.current;

          if (targetValues) {
            // Apply smooth exponential moving average
            cur.blinkLeft = lerp(cur.blinkLeft, targetValues.blinkLeft, 0.25);
            cur.blinkRight = lerp(cur.blinkRight, targetValues.blinkRight, 0.25);
            cur.mouthOpen = lerp(cur.mouthOpen, targetValues.mouthOpen, 0.3);
            cur.mouthStretch = lerp(cur.mouthStretch, targetValues.mouthStretch, 0.3);
            cur.mouthPucker = lerp(cur.mouthPucker, targetValues.mouthPucker, 0.3);
            cur.yaw = lerp(cur.yaw, targetValues.yaw, 0.2);
            cur.pitch = lerp(cur.pitch, targetValues.pitch, 0.2);
            cur.roll = lerp(cur.roll, targetValues.roll, 0.2);
          } else {
            // Fallback audio / idle simulator calculations
            let targetAa = 0;
            let targetO = 0;
            let targetE = 0;

            switch (visemeValue) {
              case 1: // A
                targetAa = 0.8;
                break;
              case 3: // O
                targetO = 0.8;
                break;
              case 5: // E
                targetE = 0.8;
                break;
              case 4: // T
                targetAa = 0.3;
                break;
              case 6: // W
                targetO = 0.5;
                break;
              case 7: // F
                targetE = 0.4;
                break;
              default:
                break;
            }

            if (micAmplitude > 0) {
              targetAa = Math.max(targetAa, micAmplitude * 0.7);
            }

            const autoBlink = Math.sin(Date.now() * 0.0018) > 0.96 ? 1.0 : 0.0;

            cur.blinkLeft = lerp(cur.blinkLeft, autoBlink, 0.25);
            cur.blinkRight = lerp(cur.blinkRight, autoBlink, 0.25);
            cur.mouthOpen = lerp(cur.mouthOpen, targetAa, 0.3);
            cur.mouthStretch = lerp(cur.mouthStretch, targetE, 0.3);
            cur.mouthPucker = lerp(cur.mouthPucker, targetO, 0.3);
            
            // Smoothly center head rotation
            cur.yaw = lerp(cur.yaw, 0, 0.2);
            cur.pitch = lerp(cur.pitch, 0, 0.2);
            cur.roll = lerp(cur.roll, 0, 0.2);
          }

          // 2. Traverse scene objects and apply values
          scene.traverse((child) => {
            // A. Apply facial expressions (Morph Targets)
            if (child.isSkinnedMesh && child.morphTargetInfluences && child.morphTargetDictionary) {
              const dict = child.morphTargetDictionary;

              const apply = (name: string, val: number) => {
                const index = dict[name];
                if (index !== undefined) {
                  child.morphTargetInfluences[index] = Math.max(0.0, Math.min(val, 1.0));
                }
              };

              apply('viseme_aa', cur.mouthOpen);
              apply('viseme_O', cur.mouthPucker);
              apply('viseme_E', cur.mouthStretch);
              apply('viseme_U', cur.mouthPucker * 0.84);
              apply('viseme_I', cur.mouthStretch * 0.9);
              apply('jawOpen', cur.mouthOpen);
              apply('eyeBlinkLeft', cur.blinkLeft);
              apply('eyeBlinkRight', cur.blinkRight);
            }

            // B. Apply head and neck rotation bones
            if (child.isBone || child.isObject3D) {
              const name = (child.name ?? '').toLowerCase();
              if (name.includes('head')) {
                child.rotation.x = cur.pitch;
                child.rotation.y = cur.yaw;
                child.rotation.z = cur.roll;
              } else if (name.includes('neck')) {
                // Distribute neck rotation for realistic organic movement
                child.rotation.x = cur.pitch * 0.3;
                child.rotation.y = cur.yaw * 0.3;
                child.rotation.z = cur.roll * 0.3;
              }
            }
          });
        }
      } catch {
        // Suppress transient model traversal errors
      }

      requestRef.current = requestAnimationFrame(animateModel);
    };

    const handleLoad = () => {
      console.log('[AvaturnViewer] Model loaded successfully');
      requestRef.current = requestAnimationFrame(animateModel);
    };

    viewer.addEventListener('load', handleLoad);

    if (viewer.loaded) {
      requestRef.current = requestAnimationFrame(animateModel);
    }

    return () => {
      viewer.removeEventListener('load', handleLoad);
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [visemeValue, micAmplitude, modelId, modelViewerLoaded]);

  if (hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-nebula-dark-card border border-white/5 rounded-2xl">
        <p className="text-pulsar-aqua font-bold text-sm mb-1">WebGL 3D Viewer offline</p>
        <p className="text-soft-gray text-xs text-center mb-4">Fallback to 2D vector sync visualizer</p>
        <div className="w-24 h-24">
          <AvatarCanvas
            baseStyle="COSMIC_GAMER"
            primaryColorHex="#00E5FF"
            accentColorHex="#FF2A85"
            bgColorHex="#141929"
            frameStyle="NEON_RING"
            accessoryType="NONE"
            visemeValue={visemeValue}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full h-full relative rounded-xl overflow-hidden flex items-center justify-center transition-all duration-300 shadow-inner"
      style={{ backgroundColor: isGreenScreen ? '#00FF00' : '#0b1120' }}
    >
      {modelViewerLoaded ? (
        // @ts-expect-error - model-viewer is a third-party custom element not defined in standard React JSX elements
        <model-viewer
          ref={viewerRef}
          src={glbUrl}
          camera-controls
          disable-zoom
          interaction-prompt="none"
          shadow-intensity="1"
          style={{ width: '100%', height: '100%', background: 'transparent' }}
        />
      ) : (
        <div className="text-soft-gray text-xs flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-pulsar-aqua border-t-transparent rounded-full animate-spin"></div>
          Loading 3D Viewer...
        </div>
      )}

      {/* Dynamic Overlay Controls */}
      <div className="absolute top-2 left-2 flex gap-1.5 z-10">
        <button
          onClick={() => setIsTracking(!isTracking)}
          disabled={isLoadingTracking}
          className={`flex items-center gap-1 text-[8px] font-extrabold tracking-widest py-1.5 px-3 rounded-lg shadow-lg border border-white/10 transition-all select-none hover:scale-105 active:scale-95 ${
            isTracking
              ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
              : 'bg-[#1e293b]/90 text-pulsar-aqua hover:bg-[#334155]/90'
          } disabled:opacity-50`}
        >
          {isLoadingTracking ? (
            <>
              <span className="w-2 h-2 border border-white border-t-transparent rounded-full animate-spin" />
              LOADING...
            </>
          ) : isTracking ? (
            '⏹️ STOP TRACKING'
          ) : (
            '📷 FACE TRACKING'
          )}
        </button>

        <button
          onClick={() => setIsGreenScreen(!isGreenScreen)}
          className={`flex items-center gap-1 text-[8px] font-extrabold tracking-widest py-1.5 px-3 rounded-lg shadow-lg border border-white/10 transition-all select-none hover:scale-105 active:scale-95 ${
            isGreenScreen
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-[#1e293b]/90 text-soft-gray hover:bg-[#334155]/90 hover:text-white'
          }`}
        >
          {isGreenScreen ? '🟩 GREEN ON' : '🟩 CHROMA KEY'}
        </button>
      </div>

      {/* Floating Webcam Overlay Preview */}
      {isTracking && (
        <div className="absolute top-2 right-2 w-20 h-16 rounded-lg overflow-hidden border border-pulsar-aqua/40 shadow-lg bg-black/60 z-10 flex items-center justify-center">
          <video
            ref={videoRef}
            className="w-full h-full object-cover scale-x-[-1]"
            playsInline
            muted
          />
          <div className="absolute top-1 left-1 flex items-center gap-1 pointer-events-none select-none">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[6px] text-white font-extrabold tracking-wider bg-black/55 px-1 rounded-sm">TRACKING</span>
          </div>
        </div>
      )}

      {/* Status Overlay Info */}
      <div className="absolute bottom-2 left-2 bg-[#0f172a]/80 border border-pulsar-aqua/30 rounded px-2 py-1 text-[8px] font-bold text-white pointer-events-none select-none shadow">
        {isTracking ? '📷 Webcam Face Sync Active' : `🎙️ Audio Sync: ${micAmplitude > 0 ? 'Active' : 'Standby'}`}
      </div>
    </div>
  );
};

export default AvaturnViewer;
