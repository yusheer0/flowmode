import { useCssModule } from 'vue'
import shell from '@/styles/viewShell.module.scss'

/** viewShell + this SFC’s <style module> (same merge as useViewPageStyles). */
export function useMergedShellStyles(): Record<string, string> {
  const local = useCssModule()
  return { ...(shell as Record<string, string>), ...local }
}
