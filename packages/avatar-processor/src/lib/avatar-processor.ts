export interface VrmMetadata {
  title?: string;
  version?: string;
  authors?: string[];
  contactInformation?: string;
  reference?: string;
}

export interface VrmExpressionPreset {
  isBinary?: boolean;
  morphTargetBinds: Array<{
    node: number;
    index: number;
    weight: number;
  }>;
}

export interface VrmHumanBones {
  hips?: { node: number };
  spine?: { node: number };
  chest?: { node: number };
  neck?: { node: number };
  head?: { node: number };
  leftUpperLeg?: { node: number };
  rightUpperLeg?: { node: number };
  leftLowerLeg?: { node: number };
  rightLowerLeg?: { node: number };
  leftFoot?: { node: number };
  rightFoot?: { node: number };
  leftUpperArm?: { node: number };
  rightUpperArm?: { node: number };
  leftLowerArm?: { node: number };
  rightLowerArm?: { node: number };
  leftHand?: { node: number };
  rightHand?: { node: number };
}

// Re-usable interface for glTF structures representation
interface GltfRoot {
  extensions?: Record<string, unknown>;
  extensionsUsed?: string[];
  nodes?: Array<Record<string, unknown>>;
  meshes?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

/**
 * Parses a standard GLB container, injects VRMC_vrm extension structure, and compiles it back.
 * This drives Phase 2: GLB to VRM Conversion.
 */
export function convertGlbToVrm(glbBuffer: Uint8Array, metadata: VrmMetadata = {}): Uint8Array {
  if (glbBuffer.length < 12) {
    throw new Error('Invalid GLB file: buffer too short.');
  }

  // Read Header
  const view = new DataView(glbBuffer.buffer, glbBuffer.byteOffset, glbBuffer.byteLength);
  const magic = view.getUint32(0, true);
  const version = view.getUint32(4, true);
  
  if (magic !== 0x46546C67) {
    throw new Error(`Invalid GLB header magic: 0x${magic.toString(16)}. Expected 0x46546c67.`);
  }
  if (version !== 2) {
    throw new Error(`Unsupported GLB version: ${version}. Expected version 2.`);
  }

  // Iterate over chunks to extract JSON and BIN chunks
  let offset = 12;
  let jsonChunkData: Uint8Array | null = null;
  let binChunkData: Uint8Array | null = null;

  while (offset < glbBuffer.length) {
    if (offset + 8 > glbBuffer.length) {
      throw new Error('Truncated GLB chunk header.');
    }
    const chunkLength = view.getUint32(offset, true);
    const chunkType = view.getUint32(offset + 4, true);
    offset += 8;

    if (offset + chunkLength > glbBuffer.length) {
      throw new Error('Truncated GLB chunk body.');
    }

    const chunkData = new Uint8Array(glbBuffer.buffer, glbBuffer.byteOffset + offset, chunkLength);
    offset += chunkLength;

    if (chunkType === 0x4E4F534A) {
      jsonChunkData = chunkData;
    } else if (chunkType === 0x004E4942) {
      binChunkData = chunkData;
    }
  }

  if (!jsonChunkData) {
    throw new Error('Missing JSON chunk in GLB container.');
  }

  // Parse the glTF JSON data
  const jsonText = new TextDecoder('utf-8').decode(jsonChunkData);
  const gltf: GltfRoot = JSON.parse(jsonText) as GltfRoot;

  // Initialize extensions mapping
  gltf.extensions = gltf.extensions ?? {};
  gltf.extensionsUsed = gltf.extensionsUsed ?? [];

  if (!gltf.extensionsUsed.includes('VRMC_vrm')) {
    gltf.extensionsUsed.push('VRMC_vrm');
  }

  // Find head, neck, eyes nodes if they exist in glTF schema to build bone structures
  const nodes = gltf.nodes ?? [];
  const headNodeIndex = nodes.findIndex(n => typeof n['name'] === 'string' && (n['name'] as string).toLowerCase().includes('head')) ?? -1;
  const neckNodeIndex = nodes.findIndex(n => typeof n['name'] === 'string' && (n['name'] as string).toLowerCase().includes('neck')) ?? -1;
  const spineNodeIndex = nodes.findIndex(n => typeof n['name'] === 'string' && (n['name'] as string).toLowerCase().includes('spine')) ?? -1;
  const hipsNodeIndex = nodes.findIndex(n => typeof n['name'] === 'string' && (n['name'] as string).toLowerCase().includes('hips')) ?? -1;

  // Setup default humanoid bones structure configuration
  const humanBones: VrmHumanBones = {
    hips: { node: hipsNodeIndex !== -1 ? hipsNodeIndex : 1 },
    spine: { node: spineNodeIndex !== -1 ? spineNodeIndex : 2 },
    chest: { node: 3 },
    neck: { node: neckNodeIndex !== -1 ? neckNodeIndex : 4 },
    head: { node: headNodeIndex !== -1 ? headNodeIndex : 5 }
  };

  // Build Viseme morph Target Binds mapping A-I-U-E-O mapping presets
  const expressions: Record<string, VrmExpressionPreset> = {
    aa: {
      isBinary: false,
      morphTargetBinds: [{ node: 0, index: 0, weight: 1.0 }]
    },
    ih: {
      isBinary: false,
      morphTargetBinds: [{ node: 0, index: 1, weight: 1.0 }]
    },
    ou: {
      isBinary: false,
      morphTargetBinds: [{ node: 0, index: 2, weight: 1.0 }]
    },
    ee: {
      isBinary: false,
      morphTargetBinds: [{ node: 0, index: 3, weight: 1.0 }]
    },
    oh: {
      isBinary: false,
      morphTargetBinds: [{ node: 0, index: 4, weight: 1.0 }]
    },
    blink: {
      isBinary: true,
      morphTargetBinds: [
        { node: 0, index: 5, weight: 1.0 },
        { node: 0, index: 6, weight: 1.0 }
      ]
    }
  };

  // Inject VRMC_vrm extension structure
  gltf.extensions['VRMC_vrm'] = {
    specVersion: '1.0',
    meta: {
      name: metadata.title ?? 'Rigged AI Avatar',
      version: metadata.version ?? '1.0.0',
      authors: metadata.authors ?? ['AI Automator System'],
      contactInformation: metadata.contactInformation ?? 'support@vibetech.dev',
      reference: metadata.reference ?? '',
      avatarPermission: 'onlyAuthor',
      allowExcessiveViolations: false,
      allowRedistribution: false
    },
    humanoid: {
      humanBones
    },
    expressions: {
      preset: expressions
    }
  };

  // Serialize updated JSON text
  const updatedJsonText = JSON.stringify(gltf);
  const updatedJsonBytes = new TextEncoder().encode(updatedJsonText);

  // Align JSON chunk to 4-byte boundaries using spaces (0x20)
  const jsonPaddingLength = (4 - (updatedJsonBytes.length % 4)) % 4;
  const jsonChunkLength = updatedJsonBytes.length + jsonPaddingLength;
  const finalJsonBytes = new Uint8Array(jsonChunkLength);
  finalJsonBytes.set(updatedJsonBytes);
  if (jsonPaddingLength > 0) {
    finalJsonBytes.fill(0x20, updatedJsonBytes.length);
  }

  // Align BIN chunk to 4-byte boundaries using zeros (0x00) if it exists
  let binChunkLength = 0;
  let finalBinBytes: Uint8Array | null = null;
  if (binChunkData) {
    const binPaddingLength = (4 - (binChunkData.length % 4)) % 4;
    binChunkLength = binChunkData.length + binPaddingLength;
    finalBinBytes = new Uint8Array(binChunkLength);
    finalBinBytes.set(binChunkData);
    if (binPaddingLength > 0) {
      finalBinBytes.fill(0x00, binChunkData.length);
    }
  }

  // Re-calculate total GLB length
  const totalLength = 12 + 8 + jsonChunkLength + (finalBinBytes ? 8 + binChunkLength : 0);
  const newGlbBuffer = new Uint8Array(totalLength);
  const newView = new DataView(newGlbBuffer.buffer);

  // Write GLB Header
  newView.setUint32(0, 0x46546C67, true); // Magic
  newView.setUint32(4, 2, true);          // Version
  newView.setUint32(8, totalLength, true); // Total Length

  // Write JSON Chunk Header and data
  newView.setUint32(12, jsonChunkLength, true); // Chunk Length
  newView.setUint32(16, 0x4E4F534A, true);      // Chunk Type (JSON)
  newGlbBuffer.set(finalJsonBytes, 20);

  // Write BIN Chunk Header and data if exists
  if (finalBinBytes) {
    const binHeaderOffset = 20 + jsonChunkLength;
    newView.setUint32(binHeaderOffset, binChunkLength, true); // Chunk Length
    newView.setUint32(binHeaderOffset + 4, 0x004E4942, true);  // Chunk Type (BIN)
    newGlbBuffer.set(finalBinBytes, binHeaderOffset + 8);
  }

  return newGlbBuffer;
}
