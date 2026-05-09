import type { InjectionKey } from 'vue'
import { useHabitsTracker } from '@/composables/useHabitsTracker'

/** Shared habits state for HabitsWorkspace + HabitsDialogs. */
export type HabitsTracker = ReturnType<typeof useHabitsTracker>

export const HABITS_TRACKER_KEY: InjectionKey<HabitsTracker> = Symbol('habitsTracker')
