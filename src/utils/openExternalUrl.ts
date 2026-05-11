/**
 * Opens a URL in the system browser. In Tauri, plain `<a target="_blank">` and
 * `window.open` often do nothing; shell `open()` delegates to the OS handler.
 */
export async function openExternalUrl(url: string): Promise<void> {
  const trimmed = url.trim()
  if (!trimmed) return

  if ('__TAURI_INTERNALS__' in window) {
    const { open } = await import('@tauri-apps/plugin-shell')
    await open(trimmed)
    return
  }

  window.open(trimmed, '_blank', 'noopener,noreferrer')
}
