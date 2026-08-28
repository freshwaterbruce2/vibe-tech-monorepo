
import * as THREE from 'three';

export interface ParticleProps {
  x: number;
  y: number;
  radius: number;
  directionX: number;
  directionY: number;
  color: string;
  position: [number, number, number];
  speed: number;
}

export interface ConnectionLineProps {
  color: string;
  particlesRef: { current: Array<THREE.Mesh | undefined> };
  startIndex: number;
  endIndex: number;
  threshold: number;
}

export interface ParticleNetworkProps {
  width?: number;
  height?: number;
  particleCount?: number;
  connectDistance?: number;
  speed?: number;
  opacity?: number;
  className?: string;
  darkMode?: boolean;
  count?: number;
  connectionThreshold?: number;
}

export interface ParticleNetworkCanvasProps {
  className?: string;
  particleCount?: number;
  opacity?: number;
  connectionThreshold?: number;
}
