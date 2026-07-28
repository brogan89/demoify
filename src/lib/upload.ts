"use client";

import { decodeToPeaks } from "@/lib/waveform";

export const ACCEPTED_AUDIO = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/wave"];
export const ACCEPT_ATTR = ".mp3,.wav,audio/mpeg,audio/wav";
export const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

export const ACCEPTED_IMAGE = ["image/png", "image/jpeg", "image/webp"];
export const IMAGE_ACCEPT_ATTR = ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export function isAcceptedAudio(file: File): boolean {
  if (ACCEPTED_AUDIO.includes(file.type)) return true;
  // Some browsers report empty type for .wav — fall back to extension.
  return /\.(mp3|wav)$/i.test(file.name);
}

export function isAcceptedImage(file: File): boolean {
  if (ACCEPTED_IMAGE.includes(file.type)) return true;
  return /\.(png|jpe?g|webp)$/i.test(file.name);
}

/**
 * Decode `file` client-side into waveform peaks + exact duration, for storing
 * on the version at upload (issue #6 — mobile can't decode, so peaks must be
 * computed once here and served). Best-effort: null when this browser can't
 * decode the file; callers then fall back to {@link readDuration} and the
 * version is stored without peaks.
 */
export async function readWaveform(
  file: File,
): Promise<{ peaks: number[]; duration: number } | null> {
  try {
    return await decodeToPeaks(await file.arrayBuffer());
  } catch {
    return null;
  }
}

/** Read audio duration (seconds) client-side via an <audio> element. */
export function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";
    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(audio.duration) ? audio.duration : null);
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    audio.src = url;
  });
}

/** PUT a file directly to a presigned R2 URL, reporting progress 0..1. */
export function putToPresigned(
  url: string,
  file: File,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload failed (network error)"));
    xhr.send(file);
  });
}
