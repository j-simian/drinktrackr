import type { Entry } from "./types";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    c = (CRC_TABLE[(c ^ data[i]) & 0xff] ^ (c >>> 8)) >>> 0;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { dosDate: number; dosTime: number } {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    ((date.getHours() & 0x1f) << 11) |
    ((date.getMinutes() & 0x3f) << 5) |
    ((date.getSeconds() >> 1) & 0x1f);
  const dosDate =
    (((year - 1980) & 0x7f) << 9) |
    (((date.getMonth() + 1) & 0xf) << 5) |
    (date.getDate() & 0x1f);
  return { dosDate, dosTime };
}

export interface ZipFile {
  name: string;
  data: Uint8Array;
  date: Date;
}

export function buildZip(files: ZipFile[]): Blob {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.data);
    const size = file.data.length;
    const { dosDate, dosTime } = dosDateTime(file.date);

    const lfh = new Uint8Array(30 + nameBytes.length);
    const lfhView = new DataView(lfh.buffer);
    lfhView.setUint32(0, 0x04034b50, true);
    lfhView.setUint16(4, 20, true);
    lfhView.setUint16(6, 0, true);
    lfhView.setUint16(8, 0, true);
    lfhView.setUint16(10, dosTime, true);
    lfhView.setUint16(12, dosDate, true);
    lfhView.setUint32(14, crc, true);
    lfhView.setUint32(18, size, true);
    lfhView.setUint32(22, size, true);
    lfhView.setUint16(26, nameBytes.length, true);
    lfhView.setUint16(28, 0, true);
    lfh.set(nameBytes, 30);

    parts.push(lfh);
    parts.push(file.data);

    const cdh = new Uint8Array(46 + nameBytes.length);
    const cdhView = new DataView(cdh.buffer);
    cdhView.setUint32(0, 0x02014b50, true);
    cdhView.setUint16(4, 20, true);
    cdhView.setUint16(6, 20, true);
    cdhView.setUint16(8, 0, true);
    cdhView.setUint16(10, 0, true);
    cdhView.setUint16(12, dosTime, true);
    cdhView.setUint16(14, dosDate, true);
    cdhView.setUint32(16, crc, true);
    cdhView.setUint32(20, size, true);
    cdhView.setUint32(24, size, true);
    cdhView.setUint16(28, nameBytes.length, true);
    cdhView.setUint16(30, 0, true);
    cdhView.setUint16(32, 0, true);
    cdhView.setUint16(34, 0, true);
    cdhView.setUint16(36, 0, true);
    cdhView.setUint32(38, 0, true);
    cdhView.setUint32(42, offset, true);
    cdh.set(nameBytes, 46);

    centralParts.push(cdh);
    offset += lfh.length + file.data.length;
  }

  const centralSize = centralParts.reduce((s, p) => s + p.length, 0);
  const centralOffset = offset;

  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, files.length, true);
  eocdView.setUint16(10, files.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, centralOffset, true);
  eocdView.setUint16(20, 0, true);

  return new Blob([...parts, ...centralParts, eocd] as BlobPart[], {
    type: "application/zip",
  });
}

function sanitize(s: string): string {
  return s.replace(/[<>:"/\\|?*\x00-\x1f]+/g, "_").replace(/_+/g, "_").trim();
}

function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

function timestampSlug(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}_${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`;
}

function extFromMime(mime: string | undefined): string {
  if (!mime) return "jpg";
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/heic") return "heic";
  if (mime === "image/heif") return "heif";
  if (mime === "image/gif") return "gif";
  const match = mime.match(/^image\/([a-z0-9.+-]+)/i);
  return match ? match[1].toLowerCase().replace(/[^a-z0-9]/g, "") : "jpg";
}

export function photoFilename(entry: Entry, ext: string): string {
  const parts = [timestampSlug(entry.timestamp), sanitize(entry.person)];
  if (entry.name) {
    const safeName = sanitize(entry.name);
    if (safeName) parts.push(safeName);
  }
  return `${parts.join("_")}.${ext}`;
}

export async function entriesToPhotoZip(entries: Entry[]): Promise<Blob | null> {
  const withPhotos = entries.filter(
    (e): e is Entry & { photo: Blob } => e.photo instanceof Blob,
  );
  if (withPhotos.length === 0) return null;

  const used = new Set<string>();
  const files: ZipFile[] = [];
  for (const entry of withPhotos) {
    const ext = extFromMime(entry.photo.type);
    let name = photoFilename(entry, ext);
    if (used.has(name)) {
      const dot = name.lastIndexOf(".");
      const base = dot >= 0 ? name.slice(0, dot) : name;
      const tail = dot >= 0 ? name.slice(dot) : "";
      let i = 2;
      while (used.has(`${base}_${i}${tail}`)) i++;
      name = `${base}_${i}${tail}`;
    }
    used.add(name);
    const buffer = await entry.photo.arrayBuffer();
    files.push({
      name,
      data: new Uint8Array(buffer),
      date: new Date(entry.timestamp),
    });
  }
  return buildZip(files);
}

export async function downloadPhotos(entries: Entry[]): Promise<boolean> {
  const blob = await entriesToPhotoZip(entries);
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `bevlog-photos-${stamp}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return true;
}
