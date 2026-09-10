import { describe, expect, it } from "vitest";

import {
  inspectTrackedFile,
  MAX_TRACKED_FILE_BYTES,
} from "../src/cli/repository-policy.js";

describe("repository policy", () => {
  it("accepts compact UTF-8 source", () => {
    expect(inspectTrackedFile("data/example.json", Buffer.from('{"ok":true}\n'))).toEqual([]);
  });

  it("rejects media and the legacy design directory", () => {
    expect(inspectTrackedFile("design/example.png", Buffer.from("not really an image"))).toEqual(
      expect.arrayContaining([
        expect.stringContaining("design directory"),
        expect.stringContaining("binary extensions"),
      ]),
    );
  });

  it("rejects binary content even with a text extension", () => {
    expect(inspectTrackedFile("data/example.json", Buffer.from([123, 0, 125]))).toContain(
      "NUL byte indicates binary content",
    );
  });

  it("rejects credential-bearing filenames", () => {
    expect(inspectTrackedFile("config/credentials.json", Buffer.from("{}"))).toContain(
      "credential-bearing filenames are forbidden",
    );
    expect(inspectTrackedFile(".env.example", Buffer.from("EXAMPLE_VALUE=\n"))).toEqual([]);
  });

  it("rejects oversized tracked files", () => {
    const result = inspectTrackedFile("data/oversized.json", Buffer.alloc(MAX_TRACKED_FILE_BYTES + 1, 32));
    expect(result).toContain(
      `tracked file exceeds ${MAX_TRACKED_FILE_BYTES} bytes and must be sharded`,
    );
  });

  it("rejects representative secret patterns", () => {
    const fakeToken = "ghp_" + "A".repeat(40);
    expect(inspectTrackedFile("notes.txt", Buffer.from(fakeToken))).toContain(
      "GitHub token pattern detected",
    );

    const fakePrivateKey = "-----BEGIN " + "PRIVATE KEY-----";
    expect(inspectTrackedFile("notes.txt", Buffer.from(fakePrivateKey))).toContain(
      "private key pattern detected",
    );
  });
});
