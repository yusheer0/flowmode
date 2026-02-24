<template>
  <div :class="$style.settingsView">
    <div :class="$style.settingsContent">
      <section :class="$style.settingsSection">
        <h3 :class="$style.sectionTitle">Внешний вид</h3>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Тема оформления</span>
            <span :class="$style.settingDescription">Выберите тему оформления</span>
          </div>
          <div :class="$style.settingControl">
            <button
              :class="[$style.themeBtn, { [$style.active]: settings.theme === 'light' }]"
              @click="setTheme('light')"
            >
              Светлая
            </button>
            <button
              :class="[$style.themeBtn, { [$style.active]: settings.theme === 'dark' }]"
              @click="setTheme('dark')"
            >
              Тёмная
            </button>
            <button
              :class="[$style.themeBtn, { [$style.active]: settings.theme === 'mononoke' }]"
              @click="setTheme('mononoke')"
            >
              Mononoke
            </button>
          </div>
        </div>
      </section>

      <section :class="$style.settingsSection">
        <h3 :class="$style.sectionTitle">Уведомления</h3>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Напоминания</span>
            <span :class="$style.settingDescription">Получать уведомления о записях</span>
          </div>
          <div :class="$style.settingControl">
            <label :class="$style.toggle">
              <input
                type="checkbox"
                :checked="settings.notificationsEnabled"
                @change="toggleNotifications"
              />
              <span :class="$style.toggleSlider"></span>
            </label>
          </div>
        </div>
      </section>

      <section :class="$style.settingsSection">
        <h3 :class="$style.sectionTitle">Telegram уведомления</h3>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Включить уведомления</span>
            <span :class="$style.settingDescription">Отправлять напоминания о записях в Telegram</span>
          </div>
          <div :class="$style.settingControl">
            <label :class="$style.toggle">
              <input
                type="checkbox"
                :checked="settings.telegram.enabled"
                @change="toggleTelegramEnabled"
              />
              <span :class="$style.toggleSlider"></span>
            </label>
          </div>
        </div>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Bot Token</span>
            <span :class="$style.settingDescription">Токен бота от @BotFather</span>
          </div>
          <div :class="$style.settingControl">
            <input
              type="password"
              :class="$style.inputField"
              :value="settings.telegram.botToken"
              @input="updateBotToken"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
            />
          </div>
        </div>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Chat ID</span>
            <span :class="$style.settingDescription">ID чата для уведомлений</span>
          </div>
          <div :class="$style.settingControl">
            <input
              type="text"
              :class="$style.inputField"
              :value="settings.telegram.chatId"
              @input="updateChatId"
              placeholder="123456789"
            />
            <button
              :class="[$style.btn, $style.btnSecondary, $style.btnIcon]"
              @click="getChatId"
              :disabled="!settings.telegram.botToken || getChatIdLoading"
              title="Получить Chat ID автоматически"
            >
              {{ getChatIdLoading ? '...' : '🔍' }}
            </button>
          </div>
        </div>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Время уведомлений</span>
            <span :class="$style.settingDescription">Ежедневное напоминание в указанное время</span>
          </div>
          <div :class="$style.settingControl">
            <input
              type="time"
              :class="[$style.inputField, $style.timeInput]"
              :value="settings.telegram.notifyTime"
              @input="updateNotifyTime"
            />
          </div>
        </div>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Проверка подключения</span>
            <span :class="$style.settingDescription">Отправить тестовое сообщение</span>
          </div>
          <div :class="$style.settingControl">
            <button :class="$style.btn" @click="testConnection" :disabled="!canTestConnection">
              Проверить
            </button>
          </div>
        </div>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Как получить Chat ID</span>
            <span :class="$style.settingDescription" v-html="getChatIdInstructions"></span>
          </div>
        </div>
      </section>

      <section :class="$style.settingsSection">
        <h3 :class="$style.sectionTitle">Данные</h3>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Резервное копирование</span>
            <span :class="$style.settingDescription">Автоматическое создание резервных копий</span>
          </div>
          <div :class="$style.settingControl">
            <label :class="$style.toggle">
              <input
                type="checkbox"
                :checked="settings.backupEnabled"
                @change="toggleBackup"
              />
              <span :class="$style.toggleSlider"></span>
            </label>
          </div>
        </div>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Сворачивать при закрытии</span>
            <span :class="$style.settingDescription">Приложение будет сворачиваться в трей вместо закрытия</span>
          </div>
          <div :class="$style.settingControl">
            <label :class="$style.toggle">
              <input
                type="checkbox"
                :checked="settings.minimizeOnClose"
                @change="toggleMinimizeOnClose"
              />
              <span :class="$style.toggleSlider"></span>
            </label>
          </div>
        </div>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Записи из Telegram</span>
            <span :class="$style.settingDescription">Создавать записи из сообщений боту с командой /note</span>
          </div>
          <div :class="$style.settingControl">
            <label :class="$style.toggle">
              <input
                type="checkbox"
                :checked="settings.telegram.createFromTelegram"
                @change="toggleCreateFromTelegram"
              />
              <span :class="$style.toggleSlider"></span>
            </label>
          </div>
        </div>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Сохранять голосовые</span>
            <span :class="$style.settingDescription">Сохранять голосовые сообщения для прослушивания</span>
          </div>
          <div :class="$style.settingControl">
            <label :class="$style.toggle">
              <input
                type="checkbox"
                :checked="settings.telegram.saveVoice"
                @change="toggleSaveVoice"
              />
              <span :class="$style.toggleSlider"></span>
            </label>
          </div>
        </div>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Как использовать</span>
            <span :class="$style.settingDescription">
              Отправьте боту сообщение:<br>
              <code>/note Ваша задача</code><br><br>
              Например:<br>
              <code>/note Купить молоко</code><br>
              <code>/note Позвонить врачу завтра в 15:00</code>
            </span>
          </div>
        </div>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Экспорт данных</span>
            <span :class="$style.settingDescription">Сохранить все записи в JSON файл</span>
          </div>
          <div :class="$style.settingControl">
            <button :class="$style.btn" @click="exportData">Экспорт</button>
          </div>
        </div>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Импорт данных</span>
            <span :class="$style.settingDescription">Загрузить записи из JSON файла</span>
          </div>
          <div :class="$style.settingControl">
            <button :class="$style.btn" @click="importData">Импорт</button>
          </div>
        </div>
      </section>

      <section :class="$style.settingsSection">
        <h3 :class="$style.sectionTitle">О приложении</h3>

        <div :class="$style.aboutInfo">
          <p><strong>Ежедневник</strong> v0.1.0</p>
          <p>Приложение для ведения личных записей</p>
          <p :class="$style.copyright">© 2026</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useSettingsStore, useDiaryStore } from '@/stores'
import type { DiaryEntry } from '@/types'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'
import { sendNotification } from '@tauri-apps/plugin-notification'

const settingsStore = useSettingsStore()
const diaryStore = useDiaryStore()

const settings = computed(() => settingsStore.settings)
const testStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const testMessage = ref('')
const getChatIdLoading = ref(false)
let notificationInterval: ReturnType<typeof setInterval> | null = null
let telegramPollingInterval: ReturnType<typeof setInterval> | null = null

const getChatIdInstructions = computed(() => 
  '1. Создайте бота в @BotFather<br>2. Напишите боту любое сообщение (например, /start)<br>3. Нажмите кнопку 🔍 справа от поля Chat ID<br>4. Chat ID будет получен автоматически'
)

function setTheme(theme: 'light' | 'dark' | 'mononoke'): void {
  settingsStore.updateSettings({ theme })
}

function toggleNotifications(event: Event): void {
  const enabled = (event.target as HTMLInputElement).checked
  settingsStore.updateSettings({ notificationsEnabled: enabled })
}

function toggleTelegramEnabled(event: Event): void {
  const enabled = (event.target as HTMLInputElement).checked
  settingsStore.updateTelegramSettings({ enabled })
}

function updateBotToken(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  settingsStore.updateTelegramSettings({ botToken: value })
}

function updateChatId(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  settingsStore.updateTelegramSettings({ chatId: value })
}

function updateNotifyTime(event: Event): void {
  const value = (event.target as HTMLInputElement).value
  settingsStore.updateTelegramSettings({ notifyTime: value })
}

const canTestConnection = computed(() => {
  return settings.value.telegram.botToken.length > 0 &&
         settings.value.telegram.chatId.length > 0 &&
         testStatus.value !== 'loading'
})

async function testConnection(): Promise<void> {
  if (!canTestConnection.value) return

  testStatus.value = 'loading'
  testMessage.value = ''

  try {
    const result = await invoke<boolean>('test_telegram_connection', {
      botToken: settings.value.telegram.botToken,
      chatId: settings.value.telegram.chatId,
    })

    if (result) {
      testStatus.value = 'success'
      testMessage.value = '✅ Подключение успешно!'
    } else {
      testStatus.value = 'error'
      testMessage.value = '❌ Ошибка подключения'
    }
  } catch (error) {
    testStatus.value = 'error'
    testMessage.value = `❌ Ошибка: ${error}`
  }

  setTimeout(() => {
    testStatus.value = 'idle'
    testMessage.value = ''
  }, 5000)
}

async function getChatId(): Promise<void> {
  if (!settings.value.telegram.botToken) return

  getChatIdLoading.value = true
  try {
    const chatId = await invoke<string>('get_telegram_chat_id', {
      botToken: settings.value.telegram.botToken,
    })
    settingsStore.updateTelegramSettings({ chatId })
    testMessage.value = `✅ Chat ID получен: ${chatId}`
    setTimeout(() => {
      testMessage.value = ''
    }, 5000)
  } catch (error) {
    testMessage.value = `❌ Ошибка: ${error}`
    setTimeout(() => {
      testMessage.value = ''
    }, 5000)
  } finally {
    getChatIdLoading.value = false
  }
}

function checkScheduledNotifications(): void {
  const now = new Date()
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

  if (
    settings.value.telegram.enabled &&
    settings.value.telegram.notifyTime === currentTime &&
    now.getSeconds() === 0
  ) {
    sendDailyReminder()
  }
}

async function sendDailyReminder(): Promise<void> {
  if (!settings.value.telegram.enabled ||
      !settings.value.telegram.botToken ||
      !settings.value.telegram.chatId) {
    return
  }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dateStr = tomorrow.toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const message = `📅 <b>Ежедневник</b>\n\nЗавтра: ${dateStr}\n\nНе забудьте сделать запись! ✍️`

  try {
    await invoke<boolean>('send_telegram_notification', {
      botToken: settings.value.telegram.botToken,
      chatId: settings.value.telegram.chatId,
      message,
    })

    if (settings.value.notificationsEnabled) {
      await sendNotification({
        title: 'Ежедневник',
        body: 'Напоминание отправлено в Telegram',
      })
    }
  } catch (error) {
    console.error('Ошибка отправки уведомления:', error)
  }
}

function toggleBackup(event: Event): void {
  const enabled = (event.target as HTMLInputElement).checked
  settingsStore.updateSettings({ backupEnabled: enabled })
}

async function toggleMinimizeOnClose(event: Event): Promise<void> {
  const enabled = (event.target as HTMLInputElement).checked
  settingsStore.updateSettings({ minimizeOnClose: enabled })
  try {
    await invoke('set_minimize_on_close', { minimizeOnClose: enabled })
  } catch (error) {
    console.error('Ошибка при установке minimizeOnClose:', error)
  }
}

async function toggleCreateFromTelegram(event: Event): Promise<void> {
  const enabled = (event.target as HTMLInputElement).checked
  settingsStore.updateTelegramSettings({ createFromTelegram: enabled })
  if (enabled) {
    // Запускаем polling при включении
    startTelegramPolling()
  }
}

async function toggleSaveVoice(event: Event): Promise<void> {
  const enabled = (event.target as HTMLInputElement).checked
  settingsStore.updateTelegramSettings({ saveVoice: enabled })
}

async function exportData(): Promise<void> {
  try {
    const data = JSON.stringify(diaryStore.entries, null, 2)
    
    const filePath = await save({
      title: 'Экспорт записей',
      defaultPath: 'daily-diary-backup.json',
      filters: [{
        name: 'JSON',
        extensions: ['json'],
      }],
    })
    
    if (filePath) {
      await writeTextFile(filePath, data)
      alert('Данные успешно экспортированы!')
    }
  } catch (error) {
    console.error('Ошибка экспорта:', error)
    alert('Ошибка при экспорте данных')
  }
}

async function importData(): Promise<void> {
  try {
    const filePath = await open({
      title: 'Импорт записей',
      multiple: false,
      filters: [{
        name: 'JSON',
        extensions: ['json'],
      }],
    })

    if (filePath) {
      const content = await readTextFile(filePath)
      const entries = JSON.parse(content)

      if (confirm(`Загрузить ${entries.length} записей? Текущие записи будут дополнены.`)) {
        for (const entry of entries) {
          const exists = diaryStore.entries.find((e: any) => e.id === entry.id)
          if (!exists) {
            diaryStore.addEntry(entry)
          }
        }
        alert('Данные успешно импортированы!')
      }
    }
  } catch (error) {
    console.error('Ошибка импорта:', error)
    alert('Ошибка при импорте данных')
  }
}

onMounted(async () => {
  notificationInterval = setInterval(checkScheduledNotifications, 1000)
  // Отправляем текущее значение настройки minimizeOnClose в Tauri
  try {
    await invoke('set_minimize_on_close', { minimizeOnClose: settingsStore.settings.minimizeOnClose })
  } catch (error) {
    console.error('Ошибка при установке minimizeOnClose в onMounted:', error)
  }
  
  // Запускаем polling если включено
  if (settingsStore.settings.telegram.createFromTelegram || settingsStore.settings.telegram.saveVoice) {
    startTelegramPolling()
    // Синхронизируем сообщения при запуске
    await syncTelegramMessages()
  }
})

onUnmounted(() => {
  if (notificationInterval) {
    clearInterval(notificationInterval)
  }
  if (telegramPollingInterval) {
    clearInterval(telegramPollingInterval)
  }
})

// Polling Telegram для новых сообщений
async function startTelegramPolling(): Promise<void> {
  if (telegramPollingInterval) {
    clearInterval(telegramPollingInterval)
  }

  telegramPollingInterval = setInterval(async () => {
    await checkTelegramForUpdates()
  }, 3000) // Проверка каждые 3 секунды
}

// Синхронизация сообщений при запуске
async function syncTelegramMessages(): Promise<void> {
  await checkTelegramForUpdates()
}

// Проверка Telegram на новые сообщения (используется в polling и при синхронизации)
async function checkTelegramForUpdates(): Promise<void> {
  const settings = settingsStore.settings
  if (!settings.telegram.enabled || !settings.telegram.botToken) return

  try {
    const updates = await invoke<TelegramUpdate[]>('get_telegram_updates', {
      botToken: settings.telegram.botToken,
      offset: (settings.telegram.lastUpdateId || 0) + 1,
    })

    let maxUpdateId = settings.telegram.lastUpdateId || 0

    for (const update of updates) {
      if (update.message) {
        // Обработка текстовых сообщений с командой /note
        if (update.message.text) {
          const text = update.message.text.trim()

          // Проверяем команду /note
          if (text.startsWith('/note')) {
            const content = text.substring(5).trim() // Всё после /note

            if (content) {
              // Создаем запись из сообщения
              const now = new Date().toISOString()
              const today = now.split('T')[0]

              const newEntry: DiaryEntry = {
                id: crypto.randomUUID(),
                date: today,
                title: content.length > 50 ? content.substring(0, 50) + '...' : content,
                content: content,
                categoryId: undefined,
                tags: ['telegram'],
                priority: 'medium',
                createdAt: now,
                updatedAt: now,
              }

              diaryStore.addEntry(newEntry)
            }
          }
        }

        // Обработка голосовых сообщений
        if (settings.telegram.saveVoice && update.message.voice) {
          const voice = update.message.voice
          const now = new Date().toISOString()
          const today = now.split('T')[0]
          const entryId = crypto.randomUUID()

          try {
            // Сохраняем голосовое сообщение
            const audioPath = await invoke<string>('save_telegram_voice', {
              botToken: settings.telegram.botToken,
              fileId: voice.file_id,
              entryId: entryId,
            })

            // Создаем запись с аудио
            const newEntry: DiaryEntry = {
              id: entryId,
              date: today,
              title: `Голосовое от ${new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`,
              content: '',
              categoryId: undefined,
              tags: ['telegram', 'voice'],
              priority: 'medium',
              createdAt: now,
              updatedAt: now,
              audioPath: audioPath,
            }

            diaryStore.addEntry(newEntry)
          } catch (error) {
            console.error('Ошибка сохранения голосового:', error)
          }
        }

        // Обновляем maxUpdateId для всех сообщений
        if (update.update_id > maxUpdateId) {
          maxUpdateId = update.update_id
        }
      }
    }

    // Обновляем lastUpdateId один раз после обработки всех сообщений
    if (maxUpdateId !== settings.telegram.lastUpdateId) {
      settingsStore.updateTelegramSettings({ lastUpdateId: maxUpdateId })
    }
  } catch (error) {
    // Тихая ошибка при синхронизации (может не быть интернета)
    console.log('Синхронизация Telegram:', error instanceof Error ? error.message : error)
  }
}

interface TelegramUpdate {
  update_id: number
  message?: {
    text?: string
    voice?: {
      file_id: string
      duration?: number
    }
  }
}
</script>

<style lang="scss" module src="./SettingsView.module.scss"></style>
