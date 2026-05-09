import { computed } from 'vue'
import shell from '@/styles/viewShell.module.scss'

/** Shared bottom sheets / modals only (no page CSS module). */
export function useShellOnlyStyles() {
  return computed(() => ({ ...(shell as Record<string, string>) }))
}
