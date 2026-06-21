"use client";

import { useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type * as THREE from "three";
import type { VisemeWeights } from "./useLipSync";

export interface Avatar3DProps {
  modelUrl: string;
  weights: VisemeWeights;
  onContextLost?: () => void;
}

const BLENDSHAPE_URL_SUFFIX = "?morphTargets=ARKit,Oculus%20Visemes&textureAtlas=1024";

function applyMorphTargets(
  scene: THREE.Group,
  weights: VisemeWeights,
  previousWeights: React.MutableRefObject<VisemeWeights>,
) {
  const targets = Object.keys(weights) as Array<keyof VisemeWeights>;
  let changed = false;

  targets.forEach((name) => {
    if (previousWeights.current[name] !== weights[name]) {
      changed = true;
    }
  });

  if (!changed) return;
  previousWeights.current = { ...weights };

  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    const dictionary = mesh.morphTargetDictionary;
    const influences = mesh.morphTargetInfluences;
    if (!dictionary || !influences) return;

    targets.forEach((name) => {
      const index = dictionary[name];
      if (typeof index === "number") {
        influences[index] = weights[name];
      }
    });
  });
}

function AvatarModel({ modelUrl, weights }: { modelUrl: string; weights: VisemeWeights }) {
  const url = modelUrl.includes("?") ? modelUrl : `${modelUrl}${BLENDSHAPE_URL_SUFFIX}`;
  const { scene } = useGLTF(url);
  const previousWeights = useRef<VisemeWeights>(weights);

  useFrame(() => {
    applyMorphTargets(scene, weights, previousWeights);
  });

  useEffect(() => {
    return () => {
      useGLTF.clear(url);
    };
  }, [url]);

  return <primitive object={scene} scale={1.5} position={[0, -1.6, 0]} />;
}

export function Avatar3D({ modelUrl, weights, onContextLost }: Avatar3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 3], fov: 35 }}
      gl={{ antialias: true, alpha: true }}
      onCreated={({ gl }) => {
        const canvas = gl.domElement;
        const handler = () => {
          onContextLost?.();
        };
        canvas.addEventListener("webglcontextlost", handler);
        return () => canvas.removeEventListener("webglcontextlost", handler);
      }}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[2, 2, 2]} intensity={1.5} />
      <AvatarModel modelUrl={modelUrl} weights={weights} />
    </Canvas>
  );
}
