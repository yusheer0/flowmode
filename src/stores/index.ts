import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Category, Tag, AppSettings, DiaryEntry, TelegramSettings } from '@/types'

export const useDiaryStore = defineStore('diary', () => {
  const entries = ref<DiaryEntry[]>([])
  const selectedDate = ref<string>(new Date().toISOString().split('T')[0])

  function getEntriesByDate(date: string): DiaryEntry[] {
    return entries.value.filter(entry => entry.date === date)
  }

  function getEntriesByDateRange(start: string, end: string): DiaryEntry[] {
    return entries.value.filter(entry => entry.date >= start && entry.date <= end)
  }

  function addEntry(entry: DiaryEntry): void {
    entries.value.push(entry)
  }

  function updateEntry(id: string, updates: Partial<DiaryEntry>): void {
    const index = entries.value.findIndex(e => e.id === id)
    if (index !== -1) {
      entries.value[index] = { ...entries.value[index], ...updates, updatedAt: new Date().toISOString() }
    }
  }

  function toggleComplete(id: string): void {
    const entry = entries.value.find(e => e.id === id)
    if (entry) {
      updateEntry(id, { completed: !entry.completed })
    }
  }

  function deleteEntry(id: string): void {
    entries.value = entries.value.filter(e => e.id !== id)
  }

  // Методы для статистики
  function getTotalEntries(): number {
    return entries.value.length
  }

  function getCompletedEntries(): number {
    return entries.value.filter(e => e.completed).length
  }

  function getPendingEntries(): number {
    return entries.value.filter(e => !e.completed).length
  }

  function getCompletionRate(): number {
    const total = entries.value.length
    if (total === 0) return 0
    return Math.round((getCompletedEntries() / total) * 100)
  }

  function getEntriesByCategory(): Array<{ name: string; count: number; color: string }> {
    const categoryMap = new Map<string, { name: string; count: number; color: string }>()
    const categoriesStore = useCategoriesStore()

    entries.value.forEach(entry => {
      if (entry.categoryId) {
        const category = categoriesStore.categories.find(c => c.id === entry.categoryId)
        if (category) {
          const existing = categoryMap.get(entry.categoryId) || { name: category.name, count: 0, color: category.color }
          existing.count++
          categoryMap.set(entry.categoryId, existing)
        }
      }
    })

    return Array.from(categoryMap.values()).sort((a, b) => b.count - a.count)
  }

  function getMonthlyStats(): Array<{ month: string; year: number; monthNum: number; total: number; completed: number }> {
    const stats = new Map<string, { month: string; year: number; monthNum: number; total: number; completed: number }>()

    entries.value.forEach(entry => {
      const date = new Date(entry.date)
      const key = `${date.getFullYear()}-${date.getMonth()}`
      const monthName = date.toLocaleDateString('ru-RU', { month: 'long' })

      if (!stats.has(key)) {
        stats.set(key, {
          month: monthName,
          year: date.getFullYear(),
          monthNum: date.getMonth(),
          total: 0,
          completed: 0,
        })
      }

      const stat = stats.get(key)!
      stat.total++
      if (entry.completed) stat.completed++
    })

    return Array.from(stats.values())
      .sort((a, b) => b.year - a.year || b.monthNum - a.monthNum)
      .slice(0, 12)
  }

  function getStreak(): number {
    if (entries.value.length === 0) return 0

    const today = new Date()
    let streak = 0
    let currentDate = new Date(today)

    // Проверяем, была ли запись сегодня
    const todayStr = today.toISOString().split('T')[0]
    const hasTodayEntry = entries.value.some(e => e.date === todayStr)

    if (!hasTodayEntry) {
      // Если сегодня не было записи, проверяем вчерашний день
      currentDate.setDate(currentDate.getDate() - 1)
    }

    while (true) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const hasEntry = entries.value.some(e => e.date === dateStr)

      if (!hasEntry) break

      streak++
      currentDate.setDate(currentDate.getDate() - 1)
    }

    return streak
  }

  return {
    entries,
    selectedDate,
    getEntriesByDate,
    getEntriesByDateRange,
    addEntry,
    updateEntry,
    toggleComplete,
    deleteEntry,
    getTotalEntries,
    getCompletedEntries,
    getPendingEntries,
    getCompletionRate,
    getEntriesByCategory,
    getMonthlyStats,
    getStreak,
  }
})

export const useCategoriesStore = defineStore('categories', () => {
  const categories = ref<Category[]>([
    { id: '1', name: 'Личное', color: '#4a90d9' },
    { id: '2', name: 'Работа', color: '#27ae60' },
    { id: '3', name: 'Здоровье', color: '#e74c3c' },
    { id: '4', name: 'Учеба', color: '#f39c12' },
  ])

  function addCategory(category: Category): void {
    categories.value.push(category)
  }

  function updateCategory(id: string, updates: Partial<Category>): void {
    const index = categories.value.findIndex(c => c.id === id)
    if (index !== -1) {
      categories.value[index] = { ...categories.value[index], ...updates }
    }
  }

  function deleteCategory(id: string): void {
    categories.value = categories.value.filter(c => c.id !== id)
  }

  return {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
  }
})

export const useTagsStore = defineStore('tags', () => {
  const tags = ref<Tag[]>([])

  function addTag(tag: Tag): void {
    tags.value.push(tag)
  }

  function updateTag(id: string, updates: Partial<Tag>): void {
    const index = tags.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tags.value[index] = { ...tags.value[index], ...updates }
    }
  }

  function deleteTag(id: string): void {
    tags.value = tags.value.filter(t => t.id !== id)
  }

  return {
    tags,
    addTag,
    updateTag,
    deleteTag,
  }
})

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({
    theme: 'light',
    language: 'ru',
    notificationsEnabled: false,
    backupEnabled: false,
    minimizeOnClose: false,
    telegram: {
      botToken: '',
      chatId: '',
      enabled: false,
      notifyTime: '08:00',
      createFromTelegram: false,
      saveVoice: false,
      lastUpdateId: 0,
    },
  })

  function updateSettings(updates: Partial<AppSettings>): void {
    settings.value = { ...settings.value, ...updates }

    if (updates.theme) {
      document.documentElement.setAttribute('data-theme', updates.theme)
    }
  }

  function updateTelegramSettings(updates: Partial<TelegramSettings>): void {
    settings.value.telegram = { ...settings.value.telegram, ...updates }
  }

  return {
    settings,
    updateSettings,
    updateTelegramSettings,
  }
})
