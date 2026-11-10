export const startupLogoBucket = "startup-draft-logos";
export const startupLogoSize = 384;
export const startupLogoMaxBytes = 800 * 1024;

export function startupLogoPath(owner: string, id: string) {
  return `${owner}/${id}.png`;
}

export function importedLogoUrl(value?: string | null) {
  if (!value || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const host = url.hostname;
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (host === "appatar.io" || host === "www.appatar.io" || host.endsWith(".mzstatic.com")) return url.href;
  } catch {
    return null;
  }
  return null;
}

export async function isLogoImage(value: FormDataEntryValue | null): Promise<boolean> {
  if (!(value instanceof File) || value.type !== "image/png" || value.size < 33 || value.size > startupLogoMaxBytes) return false;
  const header = new DataView(await value.slice(0, 24).arrayBuffer());
  return header.getUint32(0) === 0x89504e47 && header.getUint32(4) === 0x0d0a1a0a && header.getUint32(12) === 0x49484452 &&
    [header.getUint32(16), header.getUint32(20)].every(size => size > 0 && size <= startupLogoSize);
}
