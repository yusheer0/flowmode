export function normalizeSearchValue(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : ''
}

export function normalizeUrl(rawUrl: string): string {
  if (!rawUrl) return ''
  if (/^https?:\/\//i.test(rawUrl)) {
    return rawUrl
  }
  return `https://${rawUrl}`
}
