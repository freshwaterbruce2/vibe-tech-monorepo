export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface TrackingValues {
  blinkLeft: number;
  blinkRight: number;
  mouthOpen: number;     // viseme_aa / jawOpen
  mouthStretch: number;  // viseme_ee
  mouthPucker: number;   // viseme_oo / viseme_ou
  yaw: number;           // head rotation Y (left/right)
  pitch: number;         // head rotation X (up/down)
  roll: number;          // head rotation Z (tilt)
}

function getDistance(p1: Landmark, p2: Landmark): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  const dz = p1.z - p2.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(val, max));
}

/**
 * Converts raw MediaPipe Face Mesh landmarks (array of 468 or 478 objects)
 * into standardized facial morph weights and skeletal rotations.
 */
export function mapLandmarksToVrm(landmarks: Landmark[]): TrackingValues {
  // Ensure we have enough landmarks to avoid out-of-bounds access
  if (!landmarks || landmarks.length < 455) {
    return {
      blinkLeft: 0,
      blinkRight: 0,
      mouthOpen: 0,
      mouthStretch: 0,
      mouthPucker: 0,
      yaw: 0,
      pitch: 0,
      roll: 0,
    };
  }

  // Define index positions based on MediaPipe Face Mesh canonical model
  // Reference face scales
  const p10 = landmarks[10];   // Forehead top
  const p152 = landmarks[152]; // Chin bottom
  const p234 = landmarks[234]; // Face left side
  const p454 = landmarks[454]; // Face right side
  
  if (!p10 || !p152 || !p234 || !p454) {
    return {
      blinkLeft: 0,
      blinkRight: 0,
      mouthOpen: 0,
      mouthStretch: 0,
      mouthPucker: 0,
      yaw: 0,
      pitch: 0,
      roll: 0,
    };
  }

  const faceHeight = getDistance(p10, p152);
  const faceWidth = getDistance(p234, p454);

  // 1. Left Eye Blink
  const p159 = landmarks[159]; // Upper eyelid
  const p145 = landmarks[145]; // Lower eyelid
  const p33 = landmarks[33];   // Inner corner
  const p133 = landmarks[133]; // Outer corner
  let blinkLeft = 0;
  if (p159 && p145 && p33 && p133) {
    const leftEyeHeight = getDistance(p159, p145);
    const leftEyeWidth = getDistance(p33, p133);
    const leftEyeRatio = leftEyeWidth > 0 ? leftEyeHeight / leftEyeWidth : 0.28;
    // Map eye ratio [0.1, 0.28] to [1, 0]
    blinkLeft = clamp((0.28 - leftEyeRatio) / 0.18, 0, 1);
  }

  // 2. Right Eye Blink
  const p386 = landmarks[386]; // Upper eyelid
  const p374 = landmarks[374]; // Lower eyelid
  const p362 = landmarks[362]; // Outer corner
  const p263 = landmarks[263]; // Inner corner
  let blinkRight = 0;
  if (p386 && p374 && p362 && p263) {
    const rightEyeHeight = getDistance(p386, p374);
    const rightEyeWidth = getDistance(p362, p263);
    const rightEyeRatio = rightEyeWidth > 0 ? rightEyeHeight / rightEyeWidth : 0.28;
    // Map eye ratio [0.1, 0.28] to [1, 0]
    blinkRight = clamp((0.28 - rightEyeRatio) / 0.18, 0, 1);
  }

  // 3. Mouth Open (AA / jawOpen)
  const p13 = landmarks[13]; // Inner upper lip
  const p14 = landmarks[14]; // Inner lower lip
  let mouthOpen = 0;
  if (p13 && p14) {
    const mouthHeight = getDistance(p13, p14);
    // Scale-invariant normalization using faceHeight
    const mouthOpenRatio = faceHeight > 0 ? mouthHeight / faceHeight : 0;
    // Map [0.01, 0.12] to [0, 1]
    mouthOpen = clamp((mouthOpenRatio - 0.015) / 0.1, 0, 1);
  }

  // 4. Mouth Stretch (EE / smile) & Mouth Pucker (OU / OO)
  const p61 = landmarks[61];   // Left mouth corner
  const p291 = landmarks[291]; // Right mouth corner
  let mouthStretch = 0;
  let mouthPucker = 0;
  if (p61 && p291) {
    const mouthWidth = getDistance(p61, p291);
    const mouthWidthRatio = faceWidth > 0 ? mouthWidth / faceWidth : 0.3;
    // Standard mouth width ratio is around 0.3
    // Map [0.3, 0.38] to [0, 1] for stretch
    mouthStretch = clamp((mouthWidthRatio - 0.3) / 0.08, 0, 1);
    // Map [0.22, 0.29] to [1, 0] for pucker
    mouthPucker = clamp((0.29 - mouthWidthRatio) / 0.07, 0, 1);
  }

  // 5. Head Rotation: Yaw (Y-axis), Pitch (X-axis), Roll (Z-axis)
  const p1 = landmarks[1]; // Nose tip
  let yaw = 0;
  let pitch = 0;
  let roll = 0;

  if (p1) {
    // Yaw: Nose horizontal offset from sides of face
    const leftDist = getDistance(p1, p234);
    const rightDist = getDistance(p1, p454);
    const totalFaceWidth = leftDist + rightDist;
    if (totalFaceWidth > 0) {
      const yawRatio = (leftDist - rightDist) / totalFaceWidth;
      // Convert ratio to radian rotation (e.g. max ~45 degrees / 0.78 rad)
      yaw = clamp(yawRatio * 1.5, -0.8, 0.8);
    }

    // Pitch: Nose vertical offset from top and bottom of face
    const topDist = getDistance(p1, p10);
    const bottomDist = getDistance(p1, p152);
    const totalFaceHeight = topDist + bottomDist;
    if (totalFaceHeight > 0) {
      const pitchRatio = (topDist - bottomDist) / totalFaceHeight;
      // Dynamic scaling for pitch (looking up/down)
      pitch = clamp(-pitchRatio * 1.8, -0.6, 0.6);
    }

    // Roll: Eye corner slope
    const p33Inner = landmarks[133];
    const p362Inner = landmarks[362];
    if (p33Inner && p362Inner) {
      const dx = p362Inner.x - p33Inner.x;
      const dy = p362Inner.y - p33Inner.y;
      roll = clamp(Math.atan2(dy, dx), -0.5, 0.5);
    }
  }

  return {
    blinkLeft,
    blinkRight,
    mouthOpen,
    mouthStretch,
    mouthPucker,
    yaw,
    pitch,
    roll,
  };
}
