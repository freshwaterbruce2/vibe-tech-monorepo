
import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ConnectionLineProps } from './types';

const ConnectionLine: React.FC<ConnectionLineProps> = ({
  particlesRef,
  startIndex,
  endIndex,
  color,
  threshold,
}) => {
  const lineRef = useRef<THREE.Line>(null);
  const positionsRef = useRef(new Float32Array(6));
  const lineColorRef = useRef(new THREE.Color(color));

  // Attach positions buffer to geometry via effect (not during render)
  useEffect(() => {
    if (lineRef.current) {
      lineRef.current.geometry.setAttribute(
        'position',
        new THREE.BufferAttribute(positionsRef.current, 3)
      );
    }
  }, []);

  useFrame(({ clock }) => {
    const startParticle = particlesRef.current[startIndex];
    const endParticle = particlesRef.current[endIndex];

    if (!lineRef.current) {
      return;
    }

    if (!startParticle || !endParticle) {
      lineRef.current.visible = false;
      return;
    }

    const positions = positionsRef.current;
    positions[0] = startParticle.position.x;
    positions[1] = startParticle.position.y;
    positions[2] = startParticle.position.z;

    positions[3] = endParticle.position.x;
    positions[4] = endParticle.position.y;
    positions[5] = endParticle.position.z;

    let positionAttribute = lineRef.current.geometry.getAttribute(
      'position',
    ) as THREE.BufferAttribute | undefined;
    if (!positionAttribute) {
      positionAttribute = new THREE.BufferAttribute(positionsRef.current, 3);
      lineRef.current.geometry.setAttribute('position', positionAttribute);
    }
    positionAttribute.needsUpdate = true;

    const distance = startParticle.position.distanceTo(endParticle.position);
    const pulseFactor = (Math.sin(clock.elapsedTime * 2) + 1) * 0.2 + 0.1; // 0.1 to 0.5 range

    if (distance < threshold) {
      lineRef.current.visible = true;

      const opacity = (1 - (distance / threshold)) * pulseFactor;
      if (lineRef.current.material instanceof THREE.LineBasicMaterial) {
        lineRef.current.material.opacity = opacity;

        const hueShift = Math.sin(clock.elapsedTime * 0.2) * 0.05;
        lineRef.current.material.color.copy(lineColorRef.current).offsetHSL(hueShift, 0, 0);
      }
    } else {
      lineRef.current.visible = false;
    }
  });

  return (
    <primitive object={new THREE.Line()} ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial color={color} transparent opacity={0.2} />
    </primitive>
  );
};

export default ConnectionLine;
