import { createHash } from "node:crypto";

export function sortRecursively(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortRecursively);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nested]) => [key, sortRecursively(nested)]),
    );
  }
  return value;
}

export function canonicalJson(value: unknown, pretty = false): string {
  return `${JSON.stringify(sortRecursively(value), null, pretty ? 2 : undefined)}${pretty ? "\n" : ""}`;
}

export function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function stableRecordHash(records: readonly unknown[]): string {
  return sha256(records.map((record) => canonicalJson(record)).join("\n"));
}
