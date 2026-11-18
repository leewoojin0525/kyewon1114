import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import {
  readLocalPackedMedia,
  validatePackedMedia,
} from "../src/lib/packed-media";
test("packed reads isolate one immutable photograph and reject damaged ranges", async () => {
  const dir = await mkdtemp(join(tmpdir(), "wovn-packed-"));
  try {
    const photo = Buffer.from("selected-photo"),
      pack = Buffer.concat([
        Buffer.from("private-before"),
        photo,
        Buffer.from("private-after"),
      ]);
    const file = join(dir, "pack.bin");
    await writeFile(file, pack);
    const p = {
      key: `packs/${createHash("sha256").update(pack).digest("hex")}.bin`,
      offset: 14,
      bytes: photo.length,
      sha256: createHash("sha256").update(photo).digest("hex"),
    };
    assert.deepEqual(await readLocalPackedMedia(file, p), photo);
    await assert.rejects(
      readLocalPackedMedia(file, { ...p, offset: 15 }),
      /checksum/,
    );
    await assert.rejects(
      readLocalPackedMedia(file, { ...p, offset: pack.length }),
      /bounds/,
    );
    assert.throws(
      () => validatePackedMedia({ ...p, key: "packs/../../secret" }),
      /Invalid/,
    );
    assert.throws(() => validatePackedMedia({ ...p, offset: -1 }), /Invalid/);
    assert.throws(
      () => validatePackedMedia({ ...p, bytes: 9 * 1024 * 1024 }),
      /Invalid/,
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
