export function normalizeMultipartBody(
  body: Record<string, string | string[] | undefined>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(body ?? {})) {
    if (v === undefined || v === null) continue;
    out[k] = Array.isArray(v) ? String(v[v.length - 1]) : String(v);
  }
  return out;
}

export function parseSkills(raw: string | undefined): string[] {
  if (raw == null || raw.trim() === "") return [];
  const s = raw.trim();
  if (s.startsWith("[")) {
    try {
      const j = JSON.parse(s) as unknown;
      if (Array.isArray(j)) {
        return j.map(String).map((x) => x.trim()).filter(Boolean);
      }
    } catch {
      /* fall through */
    }
  }
  return s
    .split(/[,，]/)
    .map((x) => x.trim())
    .filter(Boolean);
}

export function parseOptionalDate(
  raw: string | undefined,
): Date | undefined {
  if (raw == null || raw.trim() === "") return undefined;
  const d = new Date(raw.trim());
  return Number.isNaN(d.getTime()) ? undefined : d;
}
