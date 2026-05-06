/**
 * Face Recognition v2 — cluster-aware matcher.
 *
 * The v1 matcher (lib/face-recognition.ts) compares the query to each
 * employee's stored descriptors and picks the closest one in raw
 * Euclidean distance. That doesn't scale: as the employee count grows
 * the chance of an unrelated face landing closer to *some* enrolled
 * profile than to its true owner grows quadratically.
 *
 * v2 models each employee as a Gaussian cluster in 128-dimensional
 * descriptor space:
 *
 *   - centroid c_i = mean of their N enrolled descriptors
 *   - per-dimension variance σ²_i = how much that person's face varies
 *     across captures (lighting, expression, angle...)
 *
 * The query face's distance to person i is then a normalized squared
 * distance:
 *
 *   d²_i = (1/128) Σ_k ((q_k − c_i,k)² / (σ²_i,k + ε))
 *
 * Equivalent to a per-axis-rescaled Euclidean distance, which is what
 * Mahalanobis distance reduces to when the covariance is diagonal.
 * Smaller = the query falls inside that person's natural variance
 * envelope. The square root is the "score" we return — comparable to a
 * standard-deviation count.
 *
 * Why this scales:
 *  - Tightly-enrolled people get tight clusters → harder to falsely
 *    match into.
 *  - Loosely-enrolled people get loose clusters → match still works
 *    but with lower confidence (which the threshold catches).
 *  - The threshold is in std-dev units, which doesn't drift as the
 *    employee count grows — vs raw distance which does.
 *
 * Lives ALONGSIDE v1. The kiosk runs both, only acts on v1, logs the
 * comparison. Once we have data showing v2 is at least as accurate,
 * the kiosk flips over.
 */

// Empirical thresholds from the v1 audit:
// - Tight cluster owners (5 captures, well-lit) average ~1.0 std-dev to
//   their centroid for the same face on a different day.
// - Different-person scores typically land at 2.5+.
// - 1.8 is a conservative middle ground; we'll calibrate from shadow
//   log data after a few weeks.
export const V2_MAX_SCORE = 1.8;
export const V2_MIN_MARGIN = 0.3; // in std-dev units

const VARIANCE_FLOOR = 1e-4; // prevent divide-by-zero on perfectly identical descriptors

export type EmployeeCluster = {
  id: string;
  name: string;
  centroid: Float32Array;     // length 128
  varianceDiag: Float32Array; // length 128
  enrolledCount: number;
};

export type V2MatchResult = {
  employee: { id: string; name: string } | null;
  score: number;          // best score (smaller = better)
  runnerUpScore: number;
  margin: number;         // runnerUp - best
  reason?: "no_employees" | "no_descriptors" | "too_far" | "ambiguous";
};

/**
 * Build per-employee clusters from raw enrolled descriptors. Cheap;
 * intended to be called per-request from the client (the data is
 * already in memory after /api/employees is fetched).
 */
export function buildClusters(
  employees: { id: string; name: string; face_descriptors: number[][] }[]
): EmployeeCluster[] {
  const clusters: EmployeeCluster[] = [];

  for (const emp of employees) {
    const descs = emp.face_descriptors;
    if (!descs || descs.length === 0) continue;

    const dim = descs[0]!.length;
    const N = descs.length;

    const centroid = new Float32Array(dim);
    for (const d of descs) {
      for (let k = 0; k < dim; k++) {
        centroid[k]! += d[k]!;
      }
    }
    for (let k = 0; k < dim; k++) {
      centroid[k]! /= N;
    }

    const variance = new Float32Array(dim);
    if (N > 1) {
      for (const d of descs) {
        for (let k = 0; k < dim; k++) {
          const delta = d[k]! - centroid[k]!;
          variance[k]! += delta * delta;
        }
      }
      // Sample variance with Bessel's correction
      for (let k = 0; k < dim; k++) {
        variance[k]! /= N - 1;
      }
    } else {
      // Single descriptor: no variance estimate available, use a neutral
      // floor across all dimensions. Equivalent to plain Euclidean.
      for (let k = 0; k < dim; k++) {
        variance[k]! = VARIANCE_FLOOR;
      }
    }

    clusters.push({
      id: emp.id,
      name: emp.name,
      centroid,
      varianceDiag: variance,
      enrolledCount: N,
    });
  }

  return clusters;
}

/**
 * Distance from a query descriptor to a single cluster, in
 * standard-deviation units (square root of normalized squared distance).
 */
function clusterScore(query: Float32Array, cluster: EmployeeCluster): number {
  const c = cluster.centroid;
  const v = cluster.varianceDiag;
  const dim = c.length;

  let sum = 0;
  for (let k = 0; k < dim; k++) {
    const delta = query[k]! - c[k]!;
    sum += (delta * delta) / (v[k]! + VARIANCE_FLOOR);
  }
  return Math.sqrt(sum / dim);
}

/**
 * v2 entry point — same shape as v1's findBestMatch but score-based.
 */
export function findBestMatchV2(
  queryDescriptor: Float32Array,
  clusters: EmployeeCluster[],
  threshold = V2_MAX_SCORE,
  minMargin = V2_MIN_MARGIN
): V2MatchResult {
  if (clusters.length === 0) {
    return {
      employee: null,
      score: Infinity,
      runnerUpScore: Infinity,
      margin: 0,
      reason: "no_employees",
    };
  }

  let bestEmp: { id: string; name: string } | null = null;
  let bestScore = Infinity;
  let secondBestScore = Infinity;

  for (const c of clusters) {
    const s = clusterScore(queryDescriptor, c);
    if (s < bestScore) {
      secondBestScore = bestScore;
      bestScore = s;
      bestEmp = { id: c.id, name: c.name };
    } else if (s < secondBestScore) {
      secondBestScore = s;
    }
  }

  const margin = secondBestScore - bestScore;

  if (!bestEmp) {
    return {
      employee: null,
      score: bestScore,
      runnerUpScore: secondBestScore,
      margin,
      reason: "no_descriptors",
    };
  }
  if (bestScore >= threshold) {
    return {
      employee: null,
      score: bestScore,
      runnerUpScore: secondBestScore,
      margin,
      reason: "too_far",
    };
  }
  if (margin < minMargin) {
    return {
      employee: null,
      score: bestScore,
      runnerUpScore: secondBestScore,
      margin,
      reason: "ambiguous",
    };
  }

  return {
    employee: bestEmp,
    score: bestScore,
    runnerUpScore: secondBestScore,
    margin,
  };
}
