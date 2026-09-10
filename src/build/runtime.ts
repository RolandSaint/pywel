export const CANONICAL_RELEASE_NODE_VERSION = "24.18.0";

export interface BuildRuntimeFingerprint {
  node: string;
}

export const CANONICAL_RELEASE_RUNTIME: Readonly<BuildRuntimeFingerprint> = Object.freeze({
  node: CANONICAL_RELEASE_NODE_VERSION,
});

export function currentBuildRuntime(): BuildRuntimeFingerprint {
  return { node: process.versions.node };
}

export function isCanonicalReleaseRuntime(runtime: BuildRuntimeFingerprint): boolean {
  return runtime.node === CANONICAL_RELEASE_NODE_VERSION;
}

export function assertCanonicalReleaseRuntime(runtime = currentBuildRuntime()): void {
  if (!isCanonicalReleaseRuntime(runtime)) {
    throw new Error(`Reproducible builds require Node ${CANONICAL_RELEASE_NODE_VERSION}; current Node is ${runtime.node}`);
  }
}
