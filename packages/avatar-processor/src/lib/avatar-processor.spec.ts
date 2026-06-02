import { describe, it, expect } from 'vitest';
import { convertGlbToVrm } from './avatar-processor';
import { mapLandmarksToVrm, Landmark } from './avatar-tracking';


describe('convertGlbToVrm', () => {
  // Helper to create a valid mock GLB file structure
  function createMockGlb(jsonContent: string, binContent: Uint8Array): Uint8Array {
    const jsonBytes = new TextEncoder().encode(jsonContent);
    const jsonPadding = (4 - (jsonBytes.length % 4)) % 4;
    const jsonChunkLength = jsonBytes.length + jsonPadding;
    const paddedJsonBytes = new Uint8Array(jsonChunkLength);
    paddedJsonBytes.set(jsonBytes);
    if (jsonPadding > 0) {
      paddedJsonBytes.fill(0x20, jsonBytes.length); // pad with spaces
    }

    const binPadding = (4 - (binContent.length % 4)) % 4;
    const binChunkLength = binContent.length + binPadding;
    const paddedBinBytes = new Uint8Array(binChunkLength);
    paddedBinBytes.set(binContent);
    if (binPadding > 0) {
      paddedBinBytes.fill(0x00, binContent.length); // pad with zeros
    }

    const totalLength = 12 + 8 + jsonChunkLength + 8 + binChunkLength;
    const buffer = new Uint8Array(totalLength);
    const view = new DataView(buffer.buffer);

    // GLB Header
    view.setUint32(0, 0x46546C67, true); // Magic
    view.setUint32(4, 2, true);          // Version
    view.setUint32(8, totalLength, true); // Total Length

    // JSON Chunk Header
    view.setUint32(12, jsonChunkLength, true);
    view.setUint32(16, 0x4E4F534A, true);
    buffer.set(paddedJsonBytes, 20);

    // BIN Chunk Header
    const binHeaderOffset = 20 + jsonChunkLength;
    view.setUint32(binHeaderOffset, binChunkLength, true);
    view.setUint32(binHeaderOffset + 4, 0x004E4942, true);
    buffer.set(paddedBinBytes, binHeaderOffset + 8);

    return buffer;
  }

  it('should successfully parse GLB and inject VRMC_vrm metadata and humanoid nodes', () => {
    const mockJson = JSON.stringify({
      asset: { version: '2.0' },
      nodes: [
        { name: 'Root' },
        { name: 'Hips' },
        { name: 'Spine' },
        { name: 'Chest' },
        { name: 'Neck_Joint' },
        { name: 'Head_Mesh' }
      ]
    });

    const mockBin = new Uint8Array([0, 1, 2, 3, 4, 5]);
    const mockGlb = createMockGlb(mockJson, mockBin);

    // Convert mock GLB to VRM
    const vrmBuffer = convertGlbToVrm(mockGlb, {
      title: 'Test Avatar',
      version: '1.2.3',
      authors: ['AI System Tester']
    });

    // Validate overall header structure
    expect(vrmBuffer.length).toBeGreaterThan(12);
    const view = new DataView(vrmBuffer.buffer, vrmBuffer.byteOffset, vrmBuffer.byteLength);
    expect(view.getUint32(0, true)).toBe(0x46546C67); // Magic
    expect(view.getUint32(4, true)).toBe(2);          // Version
    expect(view.getUint32(8, true)).toBe(vrmBuffer.length); // Re-calculated total length

    // Read updated JSON chunk
    const jsonChunkLength = view.getUint32(12, true);
    expect(jsonChunkLength % 4).toBe(0); // Multiple of 4 alignment

    const jsonBytes = new Uint8Array(vrmBuffer.buffer, vrmBuffer.byteOffset + 20, jsonChunkLength);
    const jsonText = new TextDecoder('utf-8').decode(jsonBytes);
    const parsedJson = JSON.parse(jsonText.trim());

    // Validate VRMC_vrm injection
    expect(parsedJson.extensionsUsed).toContain('VRMC_vrm');
    expect(parsedJson.extensions).toHaveProperty('VRMC_vrm');
    
    const vrmExtension = parsedJson.extensions.VRMC_vrm;
    expect(vrmExtension.specVersion).toBe('1.0');
    expect(vrmExtension.meta.name).toBe('Test Avatar');
    expect(vrmExtension.meta.version).toBe('1.2.3');
    expect(vrmExtension.meta.authors).toContain('AI System Tester');

    // Humanoid mapping should successfully match joint names
    expect(vrmExtension.humanoid.humanBones.hips.node).toBe(1);
    expect(vrmExtension.humanoid.humanBones.spine.node).toBe(2);
    expect(vrmExtension.humanoid.humanBones.neck.node).toBe(4);
    expect(vrmExtension.humanoid.humanBones.head.node).toBe(5);

    // Expression/blendshape maps should be present
    expect(vrmExtension.expressions.preset).toHaveProperty('aa');
    expect(vrmExtension.expressions.preset.aa.morphTargetBinds[0].weight).toBe(1.0);
    expect(vrmExtension.expressions.preset).toHaveProperty('blink');
  });

  it('should throw error when passing invalid or empty buffer', () => {
    expect(() => convertGlbToVrm(new Uint8Array(0))).toThrow();
    expect(() => convertGlbToVrm(new Uint8Array([1, 2, 3, 4]))).toThrow();
  });
});

describe('mapLandmarksToVrm', () => {
  // Helper to create a flat list of 478 mock landmarks
  function createMockLandmarks(): Landmark[] {
    const list: Landmark[] = [];
    for (let i = 0; i < 478; i++) {
      list.push({ x: 0.5, y: 0.5, z: 0.0 });
    }
    return list;
  }

  it('should return default zero values for empty or incomplete landmark arrays', () => {
    // @ts-expect-error - testing invalid args
    const resultEmpty = mapLandmarksToVrm(null);
    expect(resultEmpty.blinkLeft).toBe(0);

    const resultIncomplete = mapLandmarksToVrm([{ x: 0, y: 0, z: 0 }]);
    expect(resultIncomplete.blinkLeft).toBe(0);
  });

  it('should calculate facial morphs and rotations from coordinates', () => {
    const landmarks = createMockLandmarks();

    // Set specific values to trigger calculations
    // Forehead (10) vs Chin (152) -> vertical distance
    landmarks[10] = { x: 0.5, y: 0.2, z: 0.0 };
    landmarks[152] = { x: 0.5, y: 0.8, z: 0.0 }; // faceHeight = 0.6
    
    // Left side (234) vs Right side (454) -> horizontal distance
    landmarks[234] = { x: 0.2, y: 0.5, z: 0.0 };
    landmarks[454] = { x: 0.8, y: 0.5, z: 0.0 }; // faceWidth = 0.6

    // Left eye (159 and 145)
    landmarks[159] = { x: 0.35, y: 0.44, z: 0.0 };
    landmarks[145] = { x: 0.35, y: 0.46, z: 0.0 }; // height = 0.02
    landmarks[33] = { x: 0.31, y: 0.45, z: 0.0 };
    landmarks[133] = { x: 0.39, y: 0.45, z: 0.0 }; // width = 0.08, ratio = 0.25

    // Right eye (386 and 374)
    landmarks[386] = { x: 0.65, y: 0.44, z: 0.0 };
    landmarks[374] = { x: 0.65, y: 0.46, z: 0.0 }; // height = 0.02
    landmarks[362] = { x: 0.61, y: 0.45, z: 0.0 };
    landmarks[263] = { x: 0.69, y: 0.45, z: 0.0 }; // width = 0.08, ratio = 0.25

    // Mouth Open (13 and 14)
    landmarks[13] = { x: 0.5, y: 0.60, z: 0.0 };
    landmarks[14] = { x: 0.5, y: 0.66, z: 0.0 }; // height = 0.06

    // Mouth corners (61 and 291)
    landmarks[61] = { x: 0.41, y: 0.62, z: 0.0 };
    landmarks[291] = { x: 0.59, y: 0.62, z: 0.0 }; // width = 0.18, ratio = 0.3

    // Nose tip (1)
    landmarks[1] = { x: 0.5, y: 0.5, z: 0.0 };

    const tracking = mapLandmarksToVrm(landmarks);
    
    // We expect some valid outputs
    expect(tracking.blinkLeft).toBeLessThan(1.0);
    expect(tracking.blinkRight).toBeLessThan(1.0);
    expect(tracking.mouthOpen).toBeGreaterThan(0.0);
    expect(tracking.yaw).toBeCloseTo(0, 5);
    expect(tracking.pitch).toBeCloseTo(0, 5);
  });
});

