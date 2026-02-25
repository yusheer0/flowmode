export type Priority = 'high' | 'medium' | 'low'

export type MoodLevel = 1 | 2 | 3 | 4 | 5

export type HabitFrequency = 'daily' | 'weekly' | 'custom'

export interface DiaryEntry {
  id: string
  date: string
  title: string
  content: string
  categoryId?: string
  tags: string[]
  createdAt: string
  updatedAt: string
  completed?: boolean
  priority?: Priority
  audioPath?: string  // Путь к аудиофайлу (для голосовых сообщений)
}

export interface Category {
  id: string
  name: string
  color: string
  icon?: string
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface Habit {
  id: string
  name: string
  icon: string
  color: string
  frequency: HabitFrequency
  targetDays?: number[]  // [0, 1, 2, 3, 4, 5, 6] - дни недели (0 = воскресенье)
  createdAt: string
  completedDates: string[]  // Даты выполнения в формате YYYY-MM-DD
}

export interface MoodEntry {
  id: string
  date: string
  mood: MoodLevel
  note?: string
  activities: string[]
  createdAt: string
}

export interface TelegramSettings {
  botToken: string
  chatId: string
  enabled: boolean
  notifyTime: string
  createFromTelegram: boolean  // Создавать записи из сообщений боту
  saveVoice: boolean           // Сохранять голосовые сообщения
  lastUpdateId?: number        // ID последнего обработанного сообщения
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'mononoke'
  language: 'ru' | 'en'
  notificationsEnabled: boolean
  backupEnabled: boolean
  minimizeOnClose: boolean
  telegram: TelegramSettings
}

export interface ExportData {
  version: string
  exportedAt: string
  entries: DiaryEntry[]
  categories: Category[]
  tags: Tag[]
  habits: Habit[]
  moodEntries: MoodEntry[]
  settings: AppSettings
}
