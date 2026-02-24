export type Priority = 'high' | 'medium' | 'low'

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
