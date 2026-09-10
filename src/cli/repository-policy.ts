import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, extname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const MAX_TRACKED_FILE_BYTES = 2 * 1024 * 1024;

const forbiddenExtensions = new Set([
  ".7z",
  ".avi",
  ".avif",
  ".bmp",
  ".bz2",
  ".db",
  ".flac",
  ".gif",
  ".gz",
  ".heic",
  ".ico",
  ".jpeg",
  ".jpg",
  ".m4a",
  ".mkv",
  ".mov",
  ".mp3",
  ".mp4",
  ".pdf",
  ".png",
  ".rar",
  ".sqlite",
  ".tar",
  ".tgz",
  ".tif",
  ".tiff",
  ".wav",
  ".webm",
  ".webp",
  ".xz",
  ".zip",
]);

const forbiddenCredentialNames = [
  /^\.env(?:\..+)?$/i,
  /^credentials\.json$/i,
  /^id_(?:dsa|ecdsa|ed25519|rsa)$/i,
  /^service[-_.]?account.*\.json$/i,
  /\.(?:key|kdbx|p12|pfx|pem)$/i,
];

const secretPatterns: ReadonlyArray<readonly [string, RegExp]> = [
  ["private key", /-----BEGIN (?:DSA |EC |OPENSSH |RSA )?PRIVATE KEY-----/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],
  ["OpenAI key", /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/],
  ["AWS access key", /\b(?:A3T|AKIA|ASIA)[A-Z0-9]{16}\b/],
  ["Slack token", /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/],
];

function isCredentialFilename(relativePath: string): boolean {
  const name = basename(relativePath);
  if (name.toLowerCase() === ".env.example") return false;
  return forbiddenCredentialNames.some((pattern) => pattern.test(name));
}

export function inspectTrackedFile(relativePath: string, content: Buffer): string[] {
  const normalized = relativePath.replaceAll("\\", "/");
  const issues: string[] = [];

  if (normalized === "design" || normalized.startsWith("design/")) {
    issues.push("the design directory is excluded from the canonical source repository");
  }
  if (forbiddenExtensions.has(extname(normalized).toLowerCase())) {
    issues.push("media, archive, database, and other binary extensions are forbidden");
  }
  if (isCredentialFilename(normalized)) {
    issues.push("credential-bearing filenames are forbidden");
  }
  if (content.byteLength > MAX_TRACKED_FILE_BYTES) {
    issues.push(`tracked file exceeds ${MAX_TRACKED_FILE_BYTES} bytes and must be sharded`);
  }
  if (content.includes(0)) {
    issues.push("NUL byte indicates binary content");
  }

  let text: string | undefined;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(content);
  } catch {
    issues.push("tracked text is not valid UTF-8");
  }

  if (text !== undefined) {
    for (const [label, pattern] of secretPatterns) {
      if (pattern.test(text)) issues.push(`${label} pattern detected`);
    }
  }

  return issues;
}

export function checkRepository(root: string): { checked: number; issues: string[] } {
  const canonicalRoot = execFileSync("git", ["-C", root, "rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  }).trim();
  const tracked = execFileSync("git", ["-C", canonicalRoot, "ls-files", "-z"], {
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  })
    .split("\0")
    .filter(Boolean);

  const issues: string[] = [];
  for (const trackedPath of tracked) {
    const absolutePath = resolve(canonicalRoot, trackedPath);
    const containment = relative(canonicalRoot, absolutePath);
    if (containment.startsWith("..") || resolve(canonicalRoot, containment) !== absolutePath) {
      issues.push(`${trackedPath}: path escapes repository root`);
      continue;
    }
    for (const issue of inspectTrackedFile(trackedPath, readFileSync(absolutePath))) {
      issues.push(`${trackedPath}: ${issue}`);
    }
  }

  return { checked: tracked.length, issues };
}

function main(): void {
  const result = checkRepository(process.cwd());
  if (result.issues.length > 0) {
    console.error(result.issues.join("\n"));
    process.exitCode = 1;
    return;
  }
  console.log(
    `repository_policy=pass tracked_files=${result.checked} max_file_bytes=${MAX_TRACKED_FILE_BYTES}`,
  );
}

const entrypoint = process.argv[1];
if (entrypoint && import.meta.url === pathToFileURL(resolve(entrypoint)).href) main();
