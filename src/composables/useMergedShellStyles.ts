import { computed, useCssModule } from 'vue'
import shell from '@/styles/viewShell.module.scss'

/** viewShell + this SFC’s <style module> (same merge as useViewPageStyles). */
export function useMergedShellStyles() {
  const local = useCssModule()
  return computed(() => ({ ...(shell as Record<string, string>), ...local }))
}
