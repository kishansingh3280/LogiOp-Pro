// EXIF metadata stripping — re-encodes any picked photo through
// expo-image-manipulator which drops ALL of the original EXIF headers
// (GPS, camera model, timestamps, etc.). Also opportunistically resizes
// enormous photos so we don't stuff megabyte-scale base64 into the
// backend when the operator only needed a thumbnail.

import * as ImageManipulator from "expo-image-manipulator";

const MAX_DIMENSION = 1600;   // Longest edge in pixels — enough for A4 print
const OUTPUT_QUALITY = 0.82;  // Nice balance between size and clarity

/**
 * Strip EXIF from a photo URI. Returns a NEW URI whose bytes contain
 * only the pixel data — no GPS, no device info, no timestamps.
 * When width/height is over MAX_DIMENSION we also scale it down so
 * we don't waste ledger storage on 12-MP raw camera shots.
 */
export async function stripExifAsync(uri: string): Promise<{ uri: string; width: number; height: number }> {
  const actions: ImageManipulator.Action[] = [];
  // Get dimensions first via a no-op manipulate — cheaper than reading
  // the whole file and re-encoding twice.
  const probe = await ImageManipulator.manipulateAsync(uri, [], { compress: 1 });
  const longest = Math.max(probe.width, probe.height);
  if (longest > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / longest;
    actions.push({
      resize: {
        width: Math.round(probe.width * scale),
        height: Math.round(probe.height * scale),
      },
    });
  }
  const result = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: OUTPUT_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG, // JPEG drops EXIF unless we explicitly copy it
    base64: false,
  });
  return { uri: result.uri, width: result.width, height: result.height };
}

/**
 * Read a photo URI as a base64 JPEG data URL, guaranteed to be EXIF-free.
 * Convenience wrapper that combines stripExifAsync + base64 encode so
 * callers can pass the string straight to the backend `photo_url` field.
 */
export async function stripExifToBase64Async(uri: string): Promise<string> {
  const cleaned = await ImageManipulator.manipulateAsync(uri, [], {
    compress: OUTPUT_QUALITY,
    format: ImageManipulator.SaveFormat.JPEG,
    base64: true,
  });
  // Downsize if huge, mirroring stripExifAsync logic.
  if (Math.max(cleaned.width, cleaned.height) > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(cleaned.width, cleaned.height);
    const resized = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: Math.round(cleaned.width * scale), height: Math.round(cleaned.height * scale) } }],
      { compress: OUTPUT_QUALITY, format: ImageManipulator.SaveFormat.JPEG, base64: true },
    );
    return `data:image/jpeg;base64,${resized.base64}`;
  }
  return `data:image/jpeg;base64,${cleaned.base64}`;
}
