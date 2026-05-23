import { describe, expect, it } from "vitest";
import {
  buildZip,
  entriesToPhotoZip,
  photoFilename,
  type ZipFile,
} from "./photoExport";
import type { Entry } from "./types";

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: "id",
    person: "Naman",
    timestamp: new Date(2024, 0, 15, 18, 30, 45).getTime(),
    ...overrides,
  };
}

function bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function readUint16LE(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8);
}

function readUint32LE(buf: Uint8Array, offset: number): number {
  return (
    (buf[offset] |
      (buf[offset + 1] << 8) |
      (buf[offset + 2] << 16) |
      (buf[offset + 3] << 24)) >>>
    0
  );
}

describe("photoFilename", () => {
  it("includes timestamp, person, and drink name", () => {
    const name = photoFilename(entry({ name: "Guinness" }), "jpg");
    expect(name).toBe("2024-01-15_183045_Naman_Guinness.jpg");
  });

  it("omits drink name when empty", () => {
    expect(photoFilename(entry(), "jpg")).toBe("2024-01-15_183045_Naman.jpg");
  });

  it("sanitizes unsafe characters in drink name", () => {
    const name = photoFilename(entry({ name: "Bad/Name?<>" }), "jpg");
    expect(name).not.toMatch(/[/\\?<>:"|*]/);
    expect(name).toContain("Naman");
  });
});

describe("buildZip", () => {
  it("produces a file starting with the local-header signature", async () => {
    const blob = buildZip([
      { name: "hello.txt", data: bytes("hello world"), date: new Date(2024, 0, 1) },
    ]);
    const buf = new Uint8Array(await blob.arrayBuffer());
    expect(readUint32LE(buf, 0)).toBe(0x04034b50);
  });

  it("ends with an end-of-central-directory record", async () => {
    const files: ZipFile[] = [
      { name: "a.txt", data: bytes("a"), date: new Date(2024, 0, 1) },
      { name: "b.txt", data: bytes("bb"), date: new Date(2024, 0, 1) },
      { name: "c.txt", data: bytes("ccc"), date: new Date(2024, 0, 1) },
    ];
    const blob = buildZip(files);
    const buf = new Uint8Array(await blob.arrayBuffer());
    const eocdOffset = buf.length - 22;
    expect(readUint32LE(buf, eocdOffset)).toBe(0x06054b50);
    expect(readUint16LE(buf, eocdOffset + 10)).toBe(3);
  });

  it("stores each file's bytes verbatim after its local header", async () => {
    const data = bytes("payload");
    const blob = buildZip([{ name: "x.bin", data, date: new Date(2024, 0, 1) }]);
    const buf = new Uint8Array(await blob.arrayBuffer());
    const nameLen = readUint16LE(buf, 26);
    const start = 30 + nameLen;
    const stored = buf.slice(start, start + data.length);
    expect(Array.from(stored)).toEqual(Array.from(data));
  });

  it("declares the correct sizes and offsets in the central directory", async () => {
    const blob = buildZip([
      { name: "a", data: bytes("AAA"), date: new Date(2024, 0, 1) },
      { name: "bb", data: bytes("BBBB"), date: new Date(2024, 0, 1) },
    ]);
    const buf = new Uint8Array(await blob.arrayBuffer());
    const eocdOffset = buf.length - 22;
    const centralSize = readUint32LE(buf, eocdOffset + 12);
    const centralOffset = readUint32LE(buf, eocdOffset + 16);
    expect(centralOffset + centralSize + 22).toBe(buf.length);
    expect(readUint32LE(buf, centralOffset)).toBe(0x02014b50);
  });
});

describe("entriesToPhotoZip", () => {
  it("returns null when no entries have photos", async () => {
    expect(await entriesToPhotoZip([entry(), entry({ id: "b" })])).toBeNull();
  });

  it("packs photo blobs into a zip", async () => {
    const photo = new Blob([bytes("FAKEJPEG") as BlobPart], { type: "image/jpeg" });
    const blob = await entriesToPhotoZip([entry({ photo, name: "Stout" })]);
    expect(blob).not.toBeNull();
    const buf = new Uint8Array(await blob!.arrayBuffer());
    expect(readUint32LE(buf, 0)).toBe(0x04034b50);
    const eocdOffset = buf.length - 22;
    expect(readUint16LE(buf, eocdOffset + 10)).toBe(1);
  });

  it("disambiguates entries that would collide on filename", async () => {
    const photo = new Blob([bytes("X") as BlobPart], { type: "image/jpeg" });
    const ts = new Date(2024, 0, 15, 18, 30, 45).getTime();
    const blob = await entriesToPhotoZip([
      entry({ id: "1", timestamp: ts, photo }),
      entry({ id: "2", timestamp: ts, photo }),
      entry({ id: "3", timestamp: ts, photo }),
    ]);
    const buf = new Uint8Array(await blob!.arrayBuffer());
    const decoder = new TextDecoder();
    const names: string[] = [];
    let offset = 0;
    for (let i = 0; i < 3; i++) {
      expect(readUint32LE(buf, offset)).toBe(0x04034b50);
      const nameLen = readUint16LE(buf, offset + 26);
      const size = readUint32LE(buf, offset + 22);
      names.push(decoder.decode(buf.slice(offset + 30, offset + 30 + nameLen)));
      offset += 30 + nameLen + size;
    }
    expect(new Set(names).size).toBe(3);
  });
});
