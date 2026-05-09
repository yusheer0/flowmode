import { computed, useCssModule } from 'vue'
import shell from '@/styles/viewShell.module.scss'

/**
 * Merges shared view shell styles (dock, sheets, modals) with the calling
 * component’s CSS module so tokens and layout stay in one place.
 */
export function useViewPageStyles() {
  const page = useCssModule()
  return computed(() => ({ ...shell, ...page }))
}
