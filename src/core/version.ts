export function comparePatchVersions(left: string, right: string): number {
  const leftParts = left.split(".").map(Number);
  const rightParts = right.split(".").map(Number);
  const width = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < width; index += 1) {
    const difference = (leftParts[index] ?? 0) - (rightParts[index] ?? 0);
    if (difference !== 0) return difference < 0 ? -1 : 1;
  }
  return 0;
}

export function patchInRange(
  patch: string,
  fromPatch: string | null,
  throughPatch: string | null,
): boolean {
  if (fromPatch !== null && comparePatchVersions(patch, fromPatch) < 0) return false;
  if (throughPatch !== null && comparePatchVersions(patch, throughPatch) > 0) return false;
  return true;
}

export function latestPatch(versions: readonly string[]): string | null {
  return versions.length === 0
    ? null
    : [...versions].sort(comparePatchVersions).at(-1) ?? null;
}
