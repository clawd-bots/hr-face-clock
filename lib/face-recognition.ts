import * as faceapi from "face-api.js";

let modelsLoaded = false;
let modelsLoading: Promise<void> | null = null;

/**
 * Loads face-api models. Safe to call multiple times — coalesces concurrent
 * calls and skips work after the first successful load.
 */
export async function loadModels(): Promise<void> {
  if (modelsLoaded) return;
  if (modelsLoading) return modelsLoading;

  modelsLoading = (async () => {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    ]);
    modelsLoaded = true;
  })();

  try {
    await modelsLoading;
  } finally {
    modelsLoading = null;
  }
}

// inputSize controls detector accuracy vs speed. 416 produces noticeably
// better landmark localization than 320, which feeds higher-quality
// descriptors into the recognition step. After the Paul/Ariyelle
// mis-match, we prioritize accuracy over the small speed gain.
const tinyFaceOptions = new faceapi.TinyFaceDetectorOptions({
  inputSize: 416,
  scoreThreshold: 0.5,
});

export async function detectFace(
  video: HTMLVideoElement
): Promise<faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>> | null> {
  const detection = await faceapi
    .detectSingleFace(video, tinyFaceOptions)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection || null;
}

// ----------------------------------------------------------------------
// Matching thresholds.
//
// MAX_DISTANCE: face-api Euclidean distance for a confident accept.
//   The library's usual default is 0.6, but at 0.6 you get visible false
//   positives on look-alikes. For an HR kiosk we want very few false
//   accepts even at the cost of a slightly higher rejection rate.
//
// MIN_MARGIN: how much closer the best match must be vs the second-best.
//   Guards against the "0.45 vs 0.46" ambiguous case (Paul/Ariyelle).
//
// WEAK_RUNNER_UP / STRICT_MIN_MARGIN: when both candidates are weak
//   (i.e. neither is a clean match), demand more separation before
//   committing. This catches the Justine/Avegail case:
//     best = 0.4348, runner-up = 0.4999
//   Both checks above passed (margin 0.065 > 0.06; best 0.43 < 0.45),
//   but the runner-up was unusually high — meaning the face wasn't a
//   clean match for ANYONE, the system was just picking the
//   less-bad of two mediocre candidates. Now we require margin > 0.10
//   in that situation.
// ----------------------------------------------------------------------
export const MAX_DISTANCE = 0.45;
export const MIN_MARGIN = 0.06;
export const WEAK_RUNNER_UP = 0.45;
export const STRICT_MIN_MARGIN = 0.10;

/** Per-employee distance: median over enrolled descriptors instead of
 *  bare minimum. Median is robust to a single bad/blurry enrollment
 *  frame whose descriptor happens to land near the wrong person. */
function employeeDistance(
  query: Float32Array,
  stored: number[][]
): number {
  if (stored.length === 0) return Infinity;
  const ds: number[] = [];
  for (const s of stored) {
    ds.push(faceapi.euclideanDistance(query, new Float32Array(s)));
  }
  ds.sort((a, b) => a - b);
  // Pick the lower-median: for 5 captures, that's the 3rd-best.
  // Less generous than min(), more tolerant than mean().
  return ds[Math.floor(ds.length / 2)] ?? Infinity;
}

export function matchFace(
  queryDescriptor: Float32Array,
  storedDescriptors: number[][],
  threshold = MAX_DISTANCE
): { matched: boolean; distance: number } {
  const distance = employeeDistance(queryDescriptor, storedDescriptors);
  return { matched: distance < threshold, distance };
}

export type MatchResult = {
  employee: { id: string; name: string } | null;
  /** distance to the chosen employee, or to the closest if none chosen */
  distance: number;
  /** distance to the runner-up, useful for audit logging */
  runnerUpDistance: number;
  /** runnerUp − best; small values => ambiguous match */
  margin: number;
  /** human-readable reason if employee is null */
  reason?: "no_employees" | "too_far" | "ambiguous";
};

export function findBestMatch(
  queryDescriptor: Float32Array,
  employees: { id: string; name: string; face_descriptors: number[][] }[],
  threshold = MAX_DISTANCE,
  minMargin = MIN_MARGIN
): MatchResult {
  let bestEmp: { id: string; name: string } | null = null;
  let bestDistance = Infinity;
  let secondBestDistance = Infinity;

  for (const emp of employees) {
    if (!emp.face_descriptors || emp.face_descriptors.length === 0) continue;
    const distance = employeeDistance(queryDescriptor, emp.face_descriptors);

    if (distance < bestDistance) {
      secondBestDistance = bestDistance;
      bestDistance = distance;
      bestEmp = { id: emp.id, name: emp.name };
    } else if (distance < secondBestDistance) {
      secondBestDistance = distance;
    }
  }

  const margin = secondBestDistance - bestDistance;

  if (!bestEmp) {
    return {
      employee: null,
      distance: bestDistance,
      runnerUpDistance: secondBestDistance,
      margin,
      reason: "no_employees",
    };
  }
  if (bestDistance >= threshold) {
    return {
      employee: null,
      distance: bestDistance,
      runnerUpDistance: secondBestDistance,
      margin,
      reason: "too_far",
    };
  }
  if (margin < minMargin) {
    // Best and runner-up are too close — reject to avoid mis-identification
    return {
      employee: null,
      distance: bestDistance,
      runnerUpDistance: secondBestDistance,
      margin,
      reason: "ambiguous",
    };
  }

  // Stricter margin when the runner-up itself is a weak match. If both
  // candidates are >= 0.45, the face wasn't a clean match for anyone;
  // demand a wider gap before committing.
  if (secondBestDistance >= WEAK_RUNNER_UP && margin < STRICT_MIN_MARGIN) {
    return {
      employee: null,
      distance: bestDistance,
      runnerUpDistance: secondBestDistance,
      margin,
      reason: "ambiguous",
    };
  }

  return {
    employee: bestEmp,
    distance: bestDistance,
    runnerUpDistance: secondBestDistance,
    margin,
  };
}
