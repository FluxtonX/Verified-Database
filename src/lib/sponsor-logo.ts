export const sponsorLogoBucket = "sponsor-logos";
export const sponsorLogoMaxBytes = 800 * 1024;

export function sponsorLogoPath(sponsorshipId: string, extension: string) {
  return `${sponsorshipId}/${randomUUID()}.${extension}`;
}

export async function sponsorLogoImage(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size < 32 || file.size > sponsorLogoMaxBytes) return null;
  const bytes = new Uint8Array(await file.slice(0, 24).arrayBuffer());
  const png = file.size >= 45 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a &&
    bytes[12] === 0x49 && bytes[13] === 0x48 && bytes[14] === 0x44 && bytes[15] === 0x52 &&
    new DataView(bytes.buffer).getUint32(16) > 0 && new DataView(bytes.buffer).getUint32(20) > 0;
  const jpeg = file.size >= 64 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp = file.size >= 32 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP" &&
    ["VP8 ", "VP8L", "VP8X"].includes(String.fromCharCode(...bytes.slice(12, 16))) &&
    new DataView(bytes.buffer).getUint32(4, true) === file.size - 8;
  const end = new Uint8Array(await file.slice(-12).arrayBuffer());
  const pngEnd = end.slice(4, 8).every((byte, index) => byte === [0x49, 0x45, 0x4e, 0x44][index]);
  const jpegEnd = end[10] === 0xff && end[11] === 0xd9;
  if (file.type === "image/png" && png && pngEnd) return "png";
  if (file.type === "image/jpeg" && jpeg && jpegEnd) return "jpg";
  if (file.type === "image/webp" && webp) return "webp";
  return null;
}

export function storedSponsorLogoPath(url: string | null, publicBaseUrl: string, sponsorshipId: string) {
  if (!url) return null;
  const prefix = `${publicBaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${sponsorLogoBucket}/${sponsorshipId}/`;
  if (!url.startsWith(prefix)) return null;
  const filename = url.slice(prefix.length);
  return /^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(filename) ? `${sponsorshipId}/${filename}` : null;
}
import { randomUUID } from "node:crypto";

