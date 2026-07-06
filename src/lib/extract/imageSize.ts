export interface ImageDimensions {
  width: number;
  height: number;
}

function pngSize(data: Buffer): ImageDimensions | null {
  if (data.length < 24) return null;
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
}

function gifSize(data: Buffer): ImageDimensions | null {
  if (data.length < 10) return null;
  return { width: data.readUInt16LE(6), height: data.readUInt16LE(8) };
}

function jpegSize(data: Buffer): ImageDimensions | null {
  let offset = 2;
  while (offset + 9 < data.length) {
    if (data[offset] !== 0xff) return null;
    const marker = data[offset + 1];
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) };
    }
    offset += 2 + data.readUInt16BE(offset + 2);
  }
  return null;
}

function webpSize(data: Buffer): ImageDimensions | null {
  if (data.length < 30 || data.toString("ascii", 12, 16) === "") return null;
  const chunk = data.toString("ascii", 12, 16);
  if (chunk === "VP8 ") {
    return { width: data.readUInt16LE(26) & 0x3fff, height: data.readUInt16LE(28) & 0x3fff };
  }
  if (chunk === "VP8L") {
    const b0 = data[21];
    const b1 = data[22];
    const b2 = data[23];
    const b3 = data[24];
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    };
  }
  if (chunk === "VP8X") {
    return {
      width: 1 + data.readUIntLE(24, 3),
      height: 1 + data.readUIntLE(27, 3),
    };
  }
  return null;
}

export function probeImageSize(data: Buffer, mime: string): ImageDimensions | null {
  try {
    if (mime.includes("png")) return pngSize(data);
    if (mime.includes("gif")) return gifSize(data);
    if (mime.includes("jpeg") || mime.includes("jpg")) return jpegSize(data);
    if (mime.includes("webp")) return webpSize(data);
  } catch {
    return null;
  }
  return null;
}
