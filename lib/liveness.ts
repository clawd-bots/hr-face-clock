/**
 * Multi-frame parallax liveness check.
 *
 * Theory: a real 3D face produces non-rigid 2D landmark changes between
 * frames (parallax — nose/chin move differently than ears/jaw under
 * head motion). A flat photo, after we remove rigid 2D similarity
 * transform (translation + scale + rotation), has near-zero landmark
 * variance no matter how it's moved or tilted in front of the camera.
 *
 * We capture N frames (~1-2s window), normalize each frame's 68
 * landmarks to be translation-, scale-, and rotation-invariant, then
 * measure the variance across frames. Real faces produce score >>
 * threshold; photos do not.
 */

export type LandmarkPoint = { x: number; y: number };
export type LandmarkFrame = {
  points: LandmarkPoint[]; // 68 points from face-api landmarks68
  timestamp: number;
};

export type LivenessResult = {
  pass: boolean;
  score: number; // higher = more 3D-like
  /** Per-landmark variance after normalization, summed across all 68. */
  totalVariance: number;
  /** Variance of per-landmark variances — captures non-uniformity of motion. */
  nonUniformity: number;
  reason?: string;
};

const REQUIRED_FRAMES = 4;
// Empirically tuned: still real faces produce ~1e-4 to 1e-3, photos << 1e-5.
const MIN_TOTAL_VARIANCE = 6e-5;
const MIN_NON_UNIFORMITY = 1e-7;

/**
 * Normalize 68-point landmarks: center at face midpoint, scale by inter-eye
 * distance, rotate so the eyes are horizontal.
 *
 * After this transform, any rigid 2D motion (camera moving relative to a
 * flat photo) is removed, so only true 3D-induced changes remain.
 *
 * face-api 68-landmark indices (Multi-PIE-style, 0-indexed):
 *   left eye outer  = 36
 *   right eye outer = 45
 *   nose tip        = 30
 */
export function normalizeLandmarks(points: LandmarkPoint[]): LandmarkPoint[] {
  if (points.length < 46) return [];

  const leftEye = points[36]!;
  const rightEye = points[45]!;

  // Eye midpoint anchors the face
  const cx = (leftEye.x + rightEye.x) / 2;
  const cy = (leftEye.y + rightEye.y) / 2;

  // Scale = inter-eye distance
  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  const scale = Math.hypot(dx, dy);
  if (scale < 1) return [];

  // Rotation = eye-line angle (so horizontal eye line maps to x-axis)
  const angle = Math.atan2(dy, dx);
  const cos = Math.cos(-angle);
  const sin = Math.sin(-angle);

  return points.map((p) => {
    const tx = (p.x - cx) / scale;
    const ty = (p.y - cy) / scale;
    return {
      x: tx * cos - ty * sin,
      y: tx * sin + ty * cos,
    };
  });
}

/**
 * Run liveness analysis on a sequence of landmark frames.
 */
export function analyzeLiveness(frames: LandmarkFrame[]): LivenessResult {
  if (frames.length < REQUIRED_FRAMES) {
    return {
      pass: false,
      score: 0,
      totalVariance: 0,
      nonUniformity: 0,
      reason: "Need more frames",
    };
  }

  const normalized = frames.map((f) => normalizeLandmarks(f.points));
  if (normalized.some((n) => n.length === 0)) {
    return {
      pass: false,
      score: 0,
      totalVariance: 0,
      nonUniformity: 0,
      reason: "Couldn't normalize landmarks",
    };
  }

  const N = normalized[0]!.length;
  const F = normalized.length;

  // Mean position per landmark across frames
  const means: LandmarkPoint[] = Array.from({ length: N }, () => ({ x: 0, y: 0 }));
  for (const frame of normalized) {
    for (let i = 0; i < N; i++) {
      means[i]!.x += frame[i]!.x;
      means[i]!.y += frame[i]!.y;
    }
  }
  for (let i = 0; i < N; i++) {
    means[i]!.x /= F;
    means[i]!.y /= F;
  }

  // Per-landmark variance (sum of x and y variance)
  const perLandmark: number[] = new Array(N).fill(0);
  for (const frame of normalized) {
    for (let i = 0; i < N; i++) {
      const ddx = frame[i]!.x - means[i]!.x;
      const ddy = frame[i]!.y - means[i]!.y;
      perLandmark[i]! += ddx * ddx + ddy * ddy;
    }
  }
  for (let i = 0; i < N; i++) {
    perLandmark[i]! /= F;
  }

  const totalVariance = perLandmark.reduce((s, v) => s + v, 0) / N;

  // Non-uniformity: how much do landmark variances differ from each other?
  // A flat photo with affine perspective change has uniform variance. A real
  // face has non-uniform variance because depth differs across the face.
  const nonUniformity =
    perLandmark.reduce((s, v) => s + (v - totalVariance) ** 2, 0) / N;

  const score = totalVariance + nonUniformity * 10;

  if (totalVariance < MIN_TOTAL_VARIANCE) {
    return {
      pass: false,
      score,
      totalVariance,
      nonUniformity,
      reason: "No movement detected — try a slight head turn",
    };
  }

  if (nonUniformity < MIN_NON_UNIFORMITY) {
    return {
      pass: false,
      score,
      totalVariance,
      nonUniformity,
      reason: "Movement looks flat — please try again",
    };
  }

  return { pass: true, score, totalVariance, nonUniformity };
}

export const LIVENESS_REQUIRED_FRAMES = REQUIRED_FRAMES;
