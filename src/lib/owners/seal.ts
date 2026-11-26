/** データ印の上限（spec.md 6） */
export const SEAL_MAX_BYTES = 1024 * 1024;

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/** 先頭のシグネチャで PNG かを判定する */
export function isPng(data: Uint8Array) {
  return PNG_SIGNATURE.every((byte, i) => data[i] === byte);
}
