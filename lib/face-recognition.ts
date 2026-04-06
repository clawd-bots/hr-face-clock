import * as faceapi from "face-api.js";

let modelsLoaded = false;

export async function loadModels() {
  if (modelsLoaded) return;
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri("/models"),
    faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
    faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
  ]);
  modelsLoaded = true;
}

export async function detectFace(
  video: HTMLVideoElement
): Promise<faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>> | null> {
  const detection = await faceapi
    .detectSingleFace(video)
    .withFaceLandmarks()
    .withFaceDescriptor();
  return detection || null;
}

export function matchFace(
  queryDescriptor: Float32Array,
  storedDescriptors: number[][],
  threshold = 0.5
): { matched: boolean; distance: number } {
  let bestDistance = Infinity;
  for (const stored of storedDescriptors) {
    const distance = faceapi.euclideanDistance(
      queryDescriptor,
      new Float32Array(stored)
    );
    if (distance < bestDistance) {
      bestDistance = distance;
    }
  }
  return { matched: bestDistance < threshold, distance: bestDistance };
}

export function findBestMatch(
  queryDescriptor: Float32Array,
  employees: { id: string; name: string; face_descriptors: number[][] }[],
  threshold = 0.5
): { employee: { id: string; name: string } | null; distance: number } {
  let bestMatch: { id: string; name: string } | null = null;
  let bestDistance = Infinity;

  for (const emp of employees) {
    if (!emp.face_descriptors || emp.face_descriptors.length === 0) continue;
    const { distance } = matchFace(queryDescriptor, emp.face_descriptors, threshold);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = { id: emp.id, name: emp.name };
    }
  }

  return {
    employee: bestDistance < threshold ? bestMatch : null,
    distance: bestDistance,
  };
}
