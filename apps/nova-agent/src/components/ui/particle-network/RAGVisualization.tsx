// @ts-nocheck — R3F types unavailable until @react-three/fiber is added
import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Text } from "@react-three/drei";

interface RAGVisualizationProps {
  results: Array<{ 
    id: string;
    distance: number; // 0 to 1, where 0 is identical
    metadata: {
      file_path?: string;
      [key: string]: unknown;
    };
  }>;
  query?: string;
}

const RAGVisualization = ({ results, query = "Query" }: RAGVisualizationProps) => {
  const groupRef = useRef<THREE.Group>(null);

  // Rotation animation
  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.1;
    }
  });

  // Calculate node positions based on relevance
  // Center is (0,0,0)
  // Results are satellites at distance based on their 'distance' score
  const nodes = useMemo(() => {
    return results.map((result, i) => {
      // Relevance score (inverted distance: 1.0 = perfect match, 0.0 = no match)
      // Assuming distance is cosine distance (0-1 usually, can be 0-2)
      // Let's normalize visually: closer = better
      const visualDistance = 2 + (result.distance * 5); // 2 units min, up to 7 units away

      // Distribute in a sphere
      const phi = Math.acos(-1 + (2 * i) / results.length);
      const theta = Math.sqrt(results.length * Math.PI) * phi;

      const x = visualDistance * Math.cos(theta) * Math.sin(phi);
      const y = visualDistance * Math.sin(theta) * Math.sin(phi);
      const z = visualDistance * Math.cos(phi);

      return {
        ...result,
        position: new THREE.Vector3(x, y, z),
        relevance: (1 - result.distance).toFixed(2)
      };
    });
  }, [results]);

  return (
    <group ref={groupRef}>
      {/* Central Query Node */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color="#9c57ff" emissive="#9c57ff" emissiveIntensity={0.5} />
      </mesh>
      <Text
        position={[0, 1.2, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {query}
      </Text>

      {/* Result Nodes */}
      {nodes.map((node, i) => (
        <group key={node.id} position={node.position}>
          {/* Node Sphere */}
          <mesh>
            <sphereGeometry args={[0.4, 32, 32]} />
            <meshStandardMaterial 
              color={node.distance < 0.3 ? "#28f0ff" : "#4d9aff"} 
              emissive={node.distance < 0.3 ? "#28f0ff" : "#4d9aff"}
              emissiveIntensity={0.5}
            />
          </mesh>

          {/* Connection Line to Center */}
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[new Float32Array([0, 0, 0, -node.position.x, -node.position.y, -node.position.z]), 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ffffff" transparent opacity={0.2} />
          </line>

          {/* Label */}
          <Text
            position={[0, 0.6, 0]}
            fontSize={0.3}
            color="#a0a0a0"
            anchorX="center"
            anchorY="middle"
          >
            {node.metadata.file_path?.split(/[\\/]/).pop() || "Unknown"}
            {`\n(${node.relevance})`}
          </Text>
        </group>
      ))}
      
      {/* Ambient light for the scene */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
    </group>
  );
};

export default RAGVisualization;
