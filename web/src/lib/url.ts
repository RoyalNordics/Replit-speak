export function normalizePreviewUrl(u?: string | null): string | null {
  try {
    if (!u || typeof u !== 'string') return null
    const s = u.trim()
    if (!s) return null

    // absolut http/https eller protokolløs //host:port
    if (/^(https?:)?\/\//i.test(s)) {
      // hvis protokolløs, tilføj https:
      return s.startsWith('//') ? `https:${s}` : s
    }

    // root-relativ sti "/path"
    if (s.startsWith('/')) {
      const origin = window.location.origin || (window.location.protocol + '//' + window.location.host)
      return origin + s
    }

    // host:port eller host:port/path (uden protokol)
    if (/^[a-z0-9.-]+:\d+(\/.*)?$/i.test(s)) {
      return `https://${s}`
    }

    return null
  } catch {
    return null
  }
}

export function isValidHttpUrl(u?: string | null): boolean {
  const n = normalizePreviewUrl(u)
  return !!n && /^https?:\/\//i.test(n)
}