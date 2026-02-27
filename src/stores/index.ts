import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Category, Tag, AppSettings, DiaryEntry, TelegramSettings, Habit, MoodEntry, ExportData, Note, MasterPasswordSettings, NoteSortOption, WeatherSettings } from '@/types'
import CryptoJS from 'crypto-js'
import bcrypt from 'bcryptjs'

const APP_VERSION = '0.1.0'

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

  // Задачи на сегодня
  function getTasksForToday(): DiaryEntry[] {
    const today = new Date().toISOString().split('T')[0]
    return entries.value.filter(entry => entry.date === today)
  }

  // Задачи на вчера
  function getTasksForYesterday(): DiaryEntry[] {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStr = yesterday.toISOString().split('T')[0]
    return entries.value.filter(entry => entry.date === yesterdayStr)
  }

  // Задачи на завтра
  function getTasksForTomorrow(): DiaryEntry[] {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    return entries.value.filter(entry => entry.date === tomorrowStr)
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
    getTasksForToday,
    getTasksForYesterday,
    getTasksForTomorrow,
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

export const useHabitsStore = defineStore('habits', () => {
  const habits = ref<Habit[]>([
    {
      id: '1',
      name: 'Спорт',
      icon: '🏃',
      color: '#e74c3c',
      frequency: 'daily',
      completedDates: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Чтение',
      icon: '📚',
      color: '#4a90d9',
      frequency: 'daily',
      completedDates: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Вода (8 стаканов)',
      icon: '💧',
      color: '#27ae60',
      frequency: 'daily',
      completedDates: [],
      createdAt: new Date().toISOString(),
    },
  ])

  function addHabit(habit: Habit): void {
    habits.value.push(habit)
  }

  function updateHabit(id: string, updates: Partial<Habit>): void {
    const index = habits.value.findIndex(h => h.id === id)
    if (index !== -1) {
      habits.value[index] = { ...habits.value[index], ...updates }
    }
  }

  function deleteHabit(id: string): void {
    habits.value = habits.value.filter(h => h.id !== id)
  }

  function toggleComplete(habitId: string, date: string): void {
    const habit = habits.value.find(h => h.id === habitId)
    if (habit) {
      const dateIndex = habit.completedDates.indexOf(date)
      if (dateIndex === -1) {
        habit.completedDates.push(date)
      } else {
        habit.completedDates.splice(dateIndex, 1)
      }
    }
  }

  function isCompleted(habitId: string, date: string): boolean {
    const habit = habits.value.find(h => h.id === habitId)
    return habit?.completedDates.includes(date) ?? false
  }

  function getHabitStreak(habitId: string): number {
    const habit = habits.value.find(h => h.id === habitId)
    if (!habit || habit.completedDates.length === 0) return 0

    const sortedDates = [...habit.completedDates].sort((a, b) => new Date(b).getTime() - new Date(a).getTime())
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]

    let streak = 0
    let currentDate: string = sortedDates[0] === today || sortedDates[0] === yesterday
      ? (sortedDates[0] === today ? today : yesterday)
      : sortedDates[0]

    const dateSet = new Set(sortedDates)
    while (dateSet.has(currentDate)) {
      streak++
      const prevDate = new Date(new Date(currentDate).getTime() - 86400000)
      currentDate = prevDate.toISOString().split('T')[0]
    }

    return streak
  }

  function getCompletionRate(habitId: string, days: number = 30): number {
    const habit = habits.value.find(h => h.id === habitId)
    if (!habit) return 0

    const today = new Date()
    let completed = 0
    let total = 0

    for (let i = 0; i < days; i++) {
      const date = new Date(today.getTime() - i * 86400000).toISOString().split('T')[0]
      total++
      if (habit.completedDates.includes(date)) {
        completed++
      }
    }

    return Math.round((completed / total) * 100)
  }

  function getWeeklyStats(): Array<{ habitId: string; habitName: string; completed: number; target: number }> {
    const today = new Date()
    const weekStart = new Date(today)
    weekStart.setDate(today.getDate() - today.getDay())

    return habits.value.map(habit => {
      let completed = 0
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart.getTime() + i * 86400000).toISOString().split('T')[0]
        if (habit.completedDates.includes(date)) {
          completed++
        }
      }
      return {
        habitId: habit.id,
        habitName: habit.name,
        completed,
        target: habit.frequency === 'daily' ? 7 : (habit.targetDays?.length ?? 1),
      }
    })
  }

  return {
    habits,
    addHabit,
    updateHabit,
    deleteHabit,
    toggleComplete,
    isCompleted,
    getHabitStreak,
    getCompletionRate,
    getWeeklyStats,
  }
})

export const useMoodStore = defineStore('mood', () => {
  const moodEntries = ref<MoodEntry[]>([])

  const moodEmojis = {
    1: '😫',
    2: '😕',
    3: '😐',
    4: '🙂',
    5: '😁',
  }

  const moodLabels = {
    1: 'Ужасно',
    2: 'Плохо',
    3: 'Нормально',
    4: 'Хорошо',
    5: 'Отлично',
  }

  const defaultActivities = [
    'Спорт', 'Чтение', 'Прогулка', 'Работа', 'Учеба',
    'Встреча с друзьями', 'Семья', 'Хобби', 'Медитация', 'Музыка',
  ]

  function addMoodEntry(entry: MoodEntry): void {
    const existingIndex = moodEntries.value.findIndex(e => e.date === entry.date)
    if (existingIndex !== -1) {
      moodEntries.value[existingIndex] = entry
    } else {
      moodEntries.value.push(entry)
    }
  }

  function getMoodEntry(date: string): MoodEntry | undefined {
    return moodEntries.value.find(e => e.date === date)
  }

  function updateMoodEntry(id: string, updates: Partial<MoodEntry>): void {
    const index = moodEntries.value.findIndex(e => e.id === id)
    if (index !== -1) {
      moodEntries.value[index] = { ...moodEntries.value[index], ...updates }
    }
  }

  function deleteMoodEntry(id: string): void {
    moodEntries.value = moodEntries.value.filter(e => e.id !== id)
  }

  function getAverageMood(days: number = 30): number {
    if (moodEntries.value.length === 0) return 0

    const today = new Date()
    const cutoff = new Date(today.getTime() - days * 86400000)

    const recentEntries = moodEntries.value.filter(e => new Date(e.date) >= cutoff)
    if (recentEntries.length === 0) return 0

    const sum = recentEntries.reduce((acc, e) => acc + e.mood, 0)
    return Math.round((sum / recentEntries.length) * 10) / 10
  }

  function getMoodTrend(): 'up' | 'down' | 'stable' {
    if (moodEntries.value.length < 2) return 'stable'

    const sorted = [...moodEntries.value].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    const firstHalf = sorted.slice(0, Math.floor(sorted.length / 2))
    const secondHalf = sorted.slice(Math.floor(sorted.length / 2))

    const firstAvg = firstHalf.reduce((acc, e) => acc + e.mood, 0) / firstHalf.length
    const secondAvg = secondHalf.reduce((acc, e) => acc + e.mood, 0) / secondHalf.length

    if (secondAvg > firstAvg + 0.3) return 'up'
    if (secondAvg < firstAvg - 0.3) return 'down'
    return 'stable'
  }

  function getMoodByActivity(activity: string): { mood: number; date: string }[] {
    return moodEntries.value
      .filter(e => e.activities.includes(activity))
      .map(e => ({ mood: e.mood, date: e.date }))
  }

  function getMostFrequentActivities(): Array<{ activity: string; count: number }> {
    const activityMap = new Map<string, number>()

    moodEntries.value.forEach(entry => {
      entry.activities.forEach(activity => {
        activityMap.set(activity, (activityMap.get(activity) || 0) + 1)
      })
    })

    return Array.from(activityMap.entries())
      .map(([activity, count]) => ({ activity, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  function getMoodCorrelations(): Array<{ activity: string; correlation: number }> {
    const activityMoods = new Map<string, number[]>()

    moodEntries.value.forEach(entry => {
      entry.activities.forEach(activity => {
        if (!activityMoods.has(activity)) {
          activityMoods.set(activity, [])
        }
        activityMoods.get(activity)!.push(entry.mood)
      })
    })

    return Array.from(activityMoods.entries())
      .map(([activity, moods]) => ({
        activity,
        correlation: moods.reduce((a, b) => a + b, 0) / moods.length,
      }))
      .sort((a, b) => b.correlation - a.correlation)
  }

  return {
    moodEntries,
    moodEmojis,
    moodLabels,
    defaultActivities,
    addMoodEntry,
    getMoodEntry,
    updateMoodEntry,
    deleteMoodEntry,
    getAverageMood,
    getMoodTrend,
    getMoodByActivity,
    getMostFrequentActivities,
    getMoodCorrelations,
  }
})

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const autoSaveTimers = ref<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Инициализация - загрузка из localStorage
  function init(): void {
    const stored = localStorage.getItem('notes')
    if (stored) {
      try {
        notes.value = JSON.parse(stored)
      } catch (e) {
        console.error('Ошибка загрузки заметок:', e)
      }
    }
  }

  // Сохранение в localStorage
  function saveToStorage(): void {
    localStorage.setItem('notes', JSON.stringify(notes.value))
  }

  function addNote(content: string): void {
    const now = new Date().toISOString()
    const newNote: Note = {
      id: crypto.randomUUID(),
      content,
      createdAt: now,
      updatedAt: now,
      isImportant: false,
    }
    notes.value.unshift(newNote)
    saveToStorage()
  }

  function updateNote(id: string, content: string): void {
    const index = notes.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notes.value[index] = { ...notes.value[index], content, updatedAt: new Date().toISOString() }
      saveToStorage()
    }
  }

  // Автосохранение (откладывает сохранение на 1 секунду)
  function autoSaveNote(id: string, content: string): void {
    // Очищаем предыдущий таймер
    const existingTimer = autoSaveTimers.value.get(id)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Устанавливаем новый таймер
    const timer = setTimeout(() => {
      updateNote(id, content)
      autoSaveTimers.value.delete(id)
    }, 1000)

    autoSaveTimers.value.set(id, timer)
  }

  function deleteNote(id: string): void {
    const index = notes.value.findIndex(n => n.id === id)
    if (index !== -1) {
      // Перемещаем в корзину вместо удаления
      const note = notes.value[index]
      note.deletedAt = new Date().toISOString()
      notes.value.splice(index, 1)
      notes.value.push(note)
      saveToStorage()
    }
  }

  function permanentDeleteNote(id: string): void {
    notes.value = notes.value.filter(n => n.id !== id)
    saveToStorage()
  }

  function restoreNote(id: string): void {
    const index = notes.value.findIndex(n => n.id === id)
    if (index !== -1) {
      const note = notes.value[index]
      note.deletedAt = undefined
      note.updatedAt = new Date().toISOString()
      // Перемещаем в начало
      notes.value.splice(index, 1)
      notes.value.unshift(note)
      saveToStorage()
    }
  }

  function toggleImportant(id: string): void {
    const index = notes.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notes.value[index].isImportant = !notes.value[index].isImportant
      notes.value[index].updatedAt = new Date().toISOString()
      saveToStorage()
    }
  }

  function getNote(id: string): Note | undefined {
    return notes.value.find(n => n.id === id)
  }

  function getActiveNotes(): Note[] {
    return notes.value.filter(n => !n.deletedAt)
  }

  function getTrashedNotes(): Note[] {
    return notes.value.filter(n => n.deletedAt)
  }

  function clearTrash(): void {
    notes.value = notes.value.filter(n => !n.deletedAt)
    saveToStorage()
  }

  function sortNotes(notesToSort: Note[], option: NoteSortOption): Note[] {
    const sorted = [...notesToSort]
    switch (option) {
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      case 'important':
        return sorted.sort((a, b) => {
          if (a.isImportant && !b.isImportant) return -1
          if (!a.isImportant && b.isImportant) return 1
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
      case 'newest':
      default:
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
  }

  return {
    notes,
    init,
    addNote,
    updateNote,
    autoSaveNote,
    deleteNote,
    permanentDeleteNote,
    restoreNote,
    toggleImportant,
    getNote,
    getActiveNotes,
    getTrashedNotes,
    clearTrash,
    sortNotes,
    saveToStorage,
  }
})

// Настройки погоды
export const useWeatherStore = defineStore('weather', () => {
  const weatherSettings = ref<WeatherSettings>({
    city: 'Moscow',
    unit: 'celsius',
  })

  // Инициализация - загрузка из localStorage
  function init(): void {
    const storedWeather = localStorage.getItem('weatherSettings')
    if (storedWeather) {
      try {
        weatherSettings.value = JSON.parse(storedWeather)
      } catch (e) {
        console.error('Ошибка загрузки настроек погоды:', e)
      }
    }
  }

  // Сохранение настроек погоды
  function saveWeatherSettings(): void {
    localStorage.setItem('weatherSettings', JSON.stringify(weatherSettings.value))
  }

  // Обновление настроек погоды
  function updateWeatherSettings(updates: Partial<WeatherSettings>): void {
    weatherSettings.value = { ...weatherSettings.value, ...updates }
    saveWeatherSettings()
  }

  return {
    weatherSettings,
    init,
    updateWeatherSettings,
    saveWeatherSettings,
  }
})

// Мастер-пароль store
export const useMasterPasswordStore = defineStore('masterPassword', () => {
  const masterPasswordSettings = ref<MasterPasswordSettings>({
    isSet: false,
  })
  const isUnlocked = ref(false)
  const encryptionKey = ref<string | null>(null)

  // Инициализация - загрузка из localStorage
  function init(): void {
    const stored = localStorage.getItem('masterPasswordSettings')
    if (stored) {
      try {
        masterPasswordSettings.value = JSON.parse(stored)
      } catch (e) {
        console.error('Ошибка загрузки настроек мастер-пароля:', e)
      }
    }
  }

  // Сохранение настроек
  function saveSettings(): void {
    localStorage.setItem('masterPasswordSettings', JSON.stringify(masterPasswordSettings.value))
  }

  // Установка мастер-пароля
  async function setMasterPassword(password: string, hint?: string): Promise<boolean> {
    try {
      const hash = await bcrypt.hash(password, 10)
      masterPasswordSettings.value = {
        isSet: true,
        hash,
        hint: hint || '',
        createdAt: new Date().toISOString(),
      }
      saveSettings()
      return true
    } catch (error) {
      console.error('Ошибка установки мастер-пароля:', error)
      return false
    }
  }

  // Проверка пароля
  async function verifyPassword(password: string): Promise<boolean> {
    if (!masterPasswordSettings.value.hash) return false

    try {
      const isValid = await bcrypt.compare(password, masterPasswordSettings.value.hash)
      if (isValid) {
        isUnlocked.value = true
        encryptionKey.value = password
      }
      return isValid
    } catch (error) {
      console.error('Ошибка проверки пароля:', error)
      return false
    }
  }

  // Разблокировка
  async function unlock(password: string): Promise<boolean> {
    const isValid = await verifyPassword(password)
    return isValid
  }

  // Блокировка
  function lock(): void {
    isUnlocked.value = false
    encryptionKey.value = null
  }

  // Изменение пароля
  async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    const isValid = await verifyPassword(oldPassword)
    if (!isValid) return false

    try {
      const hash = await bcrypt.hash(newPassword, 10)
      masterPasswordSettings.value.hash = hash
      masterPasswordSettings.value.hint = ''
      saveSettings()
      encryptionKey.value = newPassword
      return true
    } catch (error) {
      console.error('Ошибка изменения пароля:', error)
      return false
    }
  }

  // Сброс пароля (удаляет все данные!)
  function resetPassword(): void {
    masterPasswordSettings.value = { isSet: false }
    isUnlocked.value = false
    encryptionKey.value = null
    saveSettings()
    // Очищаем все данные
    localStorage.clear()
  }

  // Шифрование данных
  function encrypt(data: string): string {
    if (!encryptionKey.value) {
      throw new Error('Приложение заблокировано')
    }
    return CryptoJS.AES.encrypt(data, encryptionKey.value).toString()
  }

  // Расшифровка данных
  function decrypt(encrypted: string): string {
    if (!encryptionKey.value) {
      throw new Error('Приложение заблокировано')
    }
    const bytes = CryptoJS.AES.decrypt(encrypted, encryptionKey.value)
    return bytes.toString(CryptoJS.enc.Utf8)
  }

  // Проверка установлен ли пароль
  function isPasswordSet(): boolean {
    return masterPasswordSettings.value.isSet
  }

  // Получение подсказки
  function getHint(): string | undefined {
    return masterPasswordSettings.value.hint
  }

  return {
    masterPasswordSettings,
    isUnlocked,
    encryptionKey,
    init,
    setMasterPassword,
    verifyPassword,
    unlock,
    lock,
    changePassword,
    resetPassword,
    encrypt,
    decrypt,
    isPasswordSet,
    getHint,
  }
})

// Экспорт и импорт данных
export function exportAllData(): ExportData {
  const diaryStore = useDiaryStore()
  const categoriesStore = useCategoriesStore()
  const tagsStore = useTagsStore()
  const habitsStore = useHabitsStore()
  const moodStore = useMoodStore()
  const settingsStore = useSettingsStore()
  const notesStore = useNotesStore()

  return {
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    entries: diaryStore.entries,
    categories: categoriesStore.categories,
    tags: tagsStore.tags,
    habits: habitsStore.habits,
    moodEntries: moodStore.moodEntries,
    settings: settingsStore.settings,
    notes: notesStore.notes,
  }
}

export function importAllData(data: ExportData): void {
  const diaryStore = useDiaryStore()
  const categoriesStore = useCategoriesStore()
  const tagsStore = useTagsStore()
  const habitsStore = useHabitsStore()
  const moodStore = useMoodStore()
  const settingsStore = useSettingsStore()
  const notesStore = useNotesStore()

  // Очищаем текущие данные
  diaryStore.entries.splice(0, diaryStore.entries.length)
  categoriesStore.categories.splice(0, categoriesStore.categories.length)
  tagsStore.tags.splice(0, tagsStore.tags.length)
  habitsStore.habits.splice(0, habitsStore.habits.length)
  moodStore.moodEntries.splice(0, moodStore.moodEntries.length)
  notesStore.notes.splice(0, notesStore.notes.length)

  // Импортируем новые данные
  data.entries.forEach(entry => diaryStore.addEntry(entry))
  data.categories.forEach(category => categoriesStore.addCategory(category))
  data.tags.forEach(tag => tagsStore.addTag(tag))
  data.habits.forEach(habit => habitsStore.addHabit(habit))
  data.moodEntries.forEach(entry => moodStore.addMoodEntry(entry))
  data.notes?.forEach(note => {
    notesStore.notes.push({
      ...note,
      isImportant: note.isImportant || false,
    })
  })

  settingsStore.updateSettings(data.settings)
}

// Шифрованный экспорт
export function exportEncryptedData(masterPasswordStore: ReturnType<typeof useMasterPasswordStore>): string {
  const data = exportAllData()
  const jsonString = JSON.stringify(data)
  return masterPasswordStore.encrypt(jsonString)
}

// Шифрованный импорт
export function importEncryptedData(encrypted: string, masterPasswordStore: ReturnType<typeof useMasterPasswordStore>): void {
  const decrypted = masterPasswordStore.decrypt(encrypted)
  const data = JSON.parse(decrypted) as ExportData
  importAllData(data)
}
