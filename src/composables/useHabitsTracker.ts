import { computed, ref } from 'vue'
import type { Habit } from '@/types'

export const HABITS_STORAGE_KEY = 'habitsTrackerItems'

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function useHabitsTracker() {
  const habits = ref<Habit[]>([])

  const today = computed(() => toDateKey(new Date()))

  function loadHabits(): void {
    const raw = localStorage.getItem(HABITS_STORAGE_KEY)
    if (!raw) {
      habits.value = []
      return
    }

    try {
      const parsed = JSON.parse(raw) as Habit[]
      habits.value = Array.isArray(parsed)
        ? parsed.filter((habit): habit is Habit =>
            typeof habit?.id === 'string' && typeof habit?.name === 'string')
        : []
    } catch {
      habits.value = []
    }
  }

  function saveHabits(): void {
    localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits.value))
  }

  function isHabitDoneToday(habit: Habit): boolean {
    return habit.completedDates.includes(today.value)
  }

  /** Returns true when a habit row was appended. Caller may close dialogs. */
  function tryCreateHabit(nameRaw: string): boolean {
    const name = nameRaw.trim()
    if (!name) return false

    const nextHabit: Habit = {
      id: crypto.randomUUID(),
      name,
      icon: 'check',
      color: '#64748b',
      frequency: 'daily',
      createdAt: new Date().toISOString(),
      completedDates: [],
    }

    habits.value = [nextHabit, ...habits.value]
    saveHabits()
    return true
  }

  function toggleHabitDone(habitId: string): void {
    const day = today.value
    habits.value = habits.value.map((habit) => {
      if (habit.id !== habitId) return habit
      const hasToday = habit.completedDates.includes(day)
      const nextCompletedDates = hasToday
        ? habit.completedDates.filter(date => date !== day)
        : [...habit.completedDates, day]

      return {
        ...habit,
        completedDates: nextCompletedDates,
      }
    })
    saveHabits()
  }

  function deleteHabit(habitId: string): void {
    habits.value = habits.value.filter(habit => habit.id !== habitId)
    saveHabits()
  }

  function reorderHabits(orderedIds: string[]): void {
    const idSet = new Set(habits.value.map(h => h.id))
    if (orderedIds.length !== idSet.size) return
    for (const id of orderedIds) {
      if (!idSet.has(id)) return
    }
    habits.value = orderedIds
      .map(id => habits.value.find(h => h.id === id))
      .filter((h): h is Habit => h !== undefined)
    saveHabits()
  }

  return {
    habits,
    today,
    loadHabits,
    saveHabits,
    isHabitDoneToday,
    tryCreateHabit,
    toggleHabitDone,
    deleteHabit,
    reorderHabits,
  }
}
