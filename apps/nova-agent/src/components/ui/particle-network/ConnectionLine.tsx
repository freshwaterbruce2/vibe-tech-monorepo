// @ts-nocheck — R3F types unavailable until @react-three/fiber is added
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";
import type { ConnectionLineProps } from "./types";

const ConnectionLine = ({
	startPos,
	endPos,
	color,
	threshold,
}: ConnectionLineProps) => {
	const lineRef = useRef<THREE.Line>(null);
	const lineColor = useMemo(() => new THREE.Color(color), [color]);

	useFrame(({ clock }) => {
		if (lineRef.current && startPos.current && endPos.current) {
			const positionAttribute = lineRef.current.geometry.attributes
				.position as THREE.BufferAttribute;
			const positionArray = positionAttribute.array as Float32Array;

			// Update line vertices based on particle positions
			positionArray[0] = startPos.current.position.x;
			positionArray[1] = startPos.current.position.y;
			positionArray[2] = startPos.current.position.z;

			positionArray[3] = endPos.current.position.x;
			positionArray[4] = endPos.current.position.y;
			positionArray[5] = endPos.current.position.z;
			positionAttribute.needsUpdate = true;

			// Calculate distance between particles
			const distance = new THREE.Vector3(
				startPos.current.position.x,
				startPos.current.position.y,
				startPos.current.position.z,
			).distanceTo(
				new THREE.Vector3(
					endPos.current.position.x,
					endPos.current.position.y,
					endPos.current.position.z,
				),
			);

			// Pulse effect for line opacity
			const pulseFactor = (Math.sin(clock.elapsedTime * 2) + 1) * 0.2 + 0.1; // 0.1 to 0.5 range

			// Only show lines for particles within threshold distance
			if (distance < threshold) {
				lineRef.current.visible = true;

				// Adjust opacity based on distance and pulse
				const opacity = (1 - distance / threshold) * pulseFactor;
				if (lineRef.current.material instanceof THREE.LineBasicMaterial) {
					lineRef.current.material.opacity = opacity;

					// Subtle color shift based on time
					const hueShift = Math.sin(clock.elapsedTime * 0.2) * 0.05;
					lineRef.current.material.color
						.copy(lineColor)
						.offsetHSL(hueShift, 0, 0);
				}
			} else {
				lineRef.current.visible = false;
			}
		}
	});

	return (
		<primitive object={new THREE.Line()} ref={lineRef}>
			<bufferGeometry>
				<bufferAttribute
					attach="attributes-position"
					args={[new Float32Array(6), 3]}
				/>
			</bufferGeometry>
			<lineBasicMaterial color={color} transparent opacity={0.2} />
		</primitive>
	);
};

export default ConnectionLine;
