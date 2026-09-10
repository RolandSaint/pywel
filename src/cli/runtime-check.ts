import { canonicalJson } from "../core/canonical-json.js";
import {
  CANONICAL_RELEASE_NODE_VERSION,
  currentBuildRuntime,
  isCanonicalReleaseRuntime,
} from "../build/runtime.js";

const runtime = currentBuildRuntime();
const canonical = isCanonicalReleaseRuntime(runtime);
process.stdout.write(canonicalJson({
  schema_version: "pywel.build_runtime_check.v2",
  canonical_release_node: CANONICAL_RELEASE_NODE_VERSION,
  runtime,
  canonical_release_runtime_match: canonical,
}, true));
if (!canonical) process.exitCode = 1;
