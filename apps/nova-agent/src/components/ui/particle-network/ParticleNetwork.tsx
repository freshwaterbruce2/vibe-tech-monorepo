import { useMemo } from "react";
import * as THREE from "three";
import ConnectionLine from "./ConnectionLine";
import Particle from "./Particle";
import type { ParticleNetworkProps } from "./types";

const deterministicNoise = (seed: number): number => {
	const raw = Math.sin(seed * 12.9898) * 43758.5453;
	return raw - Math.floor(raw);
};

const ParticleNetwork = ({
	count = 15,
	connectionThreshold = 2,
}: ParticleNetworkProps) => {
	const particleRefs = useMemo(
		() =>
			Array.from({ length: count }, () => ({ current: null as THREE.Mesh | null })),
		[count],
	);

	// Generate a more visually pleasing color palette
	const generateColor = (index: number) => {
		const colors = [
			"#28f0ff", // cyan
			"#9c57ff", // purple
			"#00ffcc", // teal
			"#ff68f9", // pink
			"#4d9aff", // blue
		] as const;
		return colors[index % colors.length] ?? colors[0];
	};

	// Generate particle positions with more intentional distribution
	const particleData = Array.from({ length: count }, (_, i) => {
		// Create a more organized distribution but with some randomness
		const angle = (i / count) * Math.PI * 2;
		const radius = 2 + deterministicNoise(i + 1) * 3;
		const x = Math.cos(angle) * radius * (0.8 + deterministicNoise(i + 2) * 0.4);
		const y = (deterministicNoise(i + 3) - 0.5) * 10;
		const z = Math.sin(angle) * radius * (0.8 + deterministicNoise(i + 4) * 0.4);

		return {
			position: [x, y, z] as [number, number, number],
			color: generateColor(i),
			speed: (deterministicNoise(i + 5) + 0.1) * 0.007, // Slightly faster movement
		};
	});

	return (
		<>
			{/* Render particles */}
			{particleData.map((data, i) => (
				(() => {
					const particleRef = particleRefs[i];
					if (!particleRef) return null;

					return (
						<Particle
							key={`particle-${i}`}
							position={data.position}
							color={data.color}
							speed={data.speed}
							x={0}
							y={0}
							radius={0}
							directionX={0}
							directionY={0}
							ref={(el) => {
								particleRef.current = el;
							}}
						/>
					);
				})()
			))}

			{/* Render connection lines with improved connection logic */}
			{particleData.map((_, i) =>
				particleData.slice(i + 1).map((_, j) => {
					const index1 = i;
					const index2 = i + j + 1;

					const data1 = particleData[index1];
					const data2 = particleData[index2];
					const startPos = particleRefs[index1];
					const endPos = particleRefs[index2];
					if (!data1 || !data2 || !startPos || !endPos) return null;

					// Only create connections between nearby particles to reduce clutter
					const distance = new THREE.Vector3(
						data1.position[0],
						data1.position[1],
						data1.position[2],
					).distanceTo(
						new THREE.Vector3(
							data2.position[0],
							data2.position[1],
							data2.position[2],
						),
					);

					if (distance < connectionThreshold * 1.2) {
						return (
							<ConnectionLine
								key={`connection-${index1}-${index2}`}
								startPos={startPos}
								endPos={endPos}
								color="#28f0ff"
								threshold={connectionThreshold}
								startX={0}
								startY={0}
								endX={0}
								endY={0}
								opacity={0}
							/>
						);
					}
					return null;
				}),
			)}
		</>
	);
};

export default ParticleNetwork;
