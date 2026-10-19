import { logoObjectPath } from "./logo-path";

type LogoStorage = {
  storage: { from: (bucket: string) => { download: (path: string) => Promise<{ data: Blob | null; error: unknown }> } };
};

/** Storage download applies the caller's policies and never fetches a supplied URL. */
export async function reportLogoDataUrl(client: LogoStorage, value?: string | null): Promise<string | null> {
  if (!value) return null;
  const origins = [process.env.SUPABASE_URL, import.meta.env.VITE_SUPABASE_URL].flatMap((value) => {
    try { return value ? [new URL(value).origin] : []; } catch { return []; }
  });
  const path = logoObjectPath(value, origins);
  if (!path) return null;
  try {
    const { data, error } = await client.storage.from("portal-logos").download(path);
    if (error || !data || data.size > 5 * 1024 * 1024) return null;
    const type = data.type.split(";")[0].toLowerCase();
    if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(type)) return null;
    const bytes = new Uint8Array(await data.arrayBuffer());
    const chunks: string[] = [];
    for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
    return `data:${type};base64,${btoa(chunks.join(""))}`;
  } catch { return null; }
}