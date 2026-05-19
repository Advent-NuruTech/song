const HASH_OFFSET = 2166136261;

export function updateHash(hash: number, input: string): number {
  let value = hash;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value +=
      (value << 1) +
      (value << 4) +
      (value << 7) +
      (value << 8) +
      (value << 24);
    value >>>= 0;
  }
  return value >>> 0;
}

export function hashString(input: string): string {
  return hashToHex(updateHash(HASH_OFFSET, input));
}

export function startHash(): number {
  return HASH_OFFSET;
}

export function hashToHex(hash: number): string {
  return hash.toString(16).padStart(8, "0");
}
