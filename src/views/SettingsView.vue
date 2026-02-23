<template>
  <div class="settings-view">
    <header class="view-header">
      <h2 class="view-title">Настройки</h2>
    </header>
    
    <div class="settings-content">
      <section class="settings-section">
        <h3 class="section-title">Внешний вид</h3>
        
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Тема оформления</span>
            <span class="setting-description">Выберите тему оформления</span>
          </div>
          <div class="setting-control">
            <button
              class="theme-btn"
              :class="{ active: settings.theme === 'light' }"
              @click="setTheme('light')"
            >
              Светлая
            </button>
            <button
              class="theme-btn"
              :class="{ active: settings.theme === 'dark' }"
              @click="setTheme('dark')"
            >
              Тёмная
            </button>
            <button
              class="theme-btn"
              :class="{ active: settings.theme === 'mononoke' }"
              @click="setTheme('mononoke')"
            >
              Mononoke
            </button>
          </div>
        </div>
      </section>
      
      <section class="settings-section">
        <h3 class="section-title">Уведомления</h3>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Напоминания</span>
            <span class="setting-description">Получать уведомления о записях</span>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input
                type="checkbox"
                :checked="settings.notificationsEnabled"
                @change="toggleNotifications"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </section>

      <section class="settings-section">
        <h3 class="section-title">Telegram уведомления</h3>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Включить уведомления</span>
            <span class="setting-description">Отправлять напоминания о записях в Telegram</span>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input
                type="checkbox"
                :checked="settings.telegram.enabled"
                @change="toggleTelegramEnabled"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Bot Token</span>
            <span class="setting-description">Токен бота от @BotFather</span>
          </div>
          <div class="setting-control">
            <input
              type="password"
              class="input-field"
              :value="settings.telegram.botToken"
              @input="updateBotToken"
              placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
            />
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Chat ID</span>
            <span class="setting-description">ID чата для уведомлений</span>
          </div>
          <div class="setting-control">
            <input
              type="text"
              class="input-field"
              :value="settings.telegram.chatId"
              @input="updateChatId"
              placeholder="123456789"
            />
            <button 
              class="btn btn-secondary btn-icon" 
              @click="getChatId" 
              :disabled="!settings.telegram.botToken || getChatIdLoading"
              title="Получить Chat ID автоматически"
            >
              {{ getChatIdLoading ? '...' : '🔍' }}
            </button>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Время уведомлений</span>
            <span class="setting-description">Ежедневное напоминание в указанное время</span>
          </div>
          <div class="setting-control">
            <input
              type="time"
              class="input-field time-input"
              :value="settings.telegram.notifyTime"
              @input="updateNotifyTime"
            />
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Проверка подключения</span>
            <span class="setting-description">Отправить тестовое сообщение</span>
          </div>
          <div class="setting-control">
            <button class="btn btn-secondary" @click="testConnection" :disabled="!canTestConnection">
              Проверить
            </button>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Как получить Chat ID</span>
            <span class="setting-description">
              1. Создайте бота в @BotFather<br>
              2. Напишите боту любое сообщение (например, /start)<br>
              3. Нажмите кнопку 🔍 справа от поля Chat ID<br>
              4. Chat ID будет получен автоматически
            </span>
          </div>
        </div>
      </section>
      
      <section class="settings-section">
        <h3 class="section-title">Данные</h3>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Резервное копирование</span>
            <span class="setting-description">Автоматическое создание резервных копий</span>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input
                type="checkbox"
                :checked="settings.backupEnabled"
                @change="toggleBackup"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Сворачивать при закрытии</span>
            <span class="setting-description">Приложение будет сворачиваться в трей вместо закрытия</span>
          </div>
          <div class="setting-control">
            <label class="toggle">
              <input
                type="checkbox"
                :checked="settings.minimizeOnClose"
                @change="toggleMinimizeOnClose"
              />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Экспорт данных</span>
            <span class="setting-description">Сохранить все записи в JSON файл</span>
          </div>
          <div class="setting-control">
            <button class="btn" @click="exportData">Экспорт</button>
          </div>
        </div>
        
        <div class="setting-item">
          <div class="setting-info">
            <span class="setting-label">Импорт данных</span>
            <span class="setting-description">Загрузить записи из JSON файла</span>
          </div>
          <div class="setting-control">
            <button class="btn" @click="importData">Импорт</button>
          </div>
        </div>
      </section>
      
      <section class="settings-section">
        <h3 class="section-title">О приложении</h3>
        
        <div class="about-info">
          <p><strong>Ежедневник</strong> v0.1.0</p>
          <p>Приложение для ведения личных записей</p>
          <p class="copyright">© 2026</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useSettingsStore, useDiaryStore } from '@/stores'
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
  await invoke('set_minimize_on_close', { minimizeOnClose: enabled })
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
  await invoke('set_minimize_on_close', { minimizeOnClose: settingsStore.settings.minimizeOnClose })
})

onUnmounted(() => {
  if (notificationInterval) {
    clearInterval(notificationInterval)
  }
})
</script>

<style lang="scss">
.settings-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.view-header {
  padding: 0 10px;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.view-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text);
  padding-left: 12px;
}

.settings-content {
  flex: 1;
  padding: 8px 12px 8px 8px;
  overflow: auto;
  margin: 0 auto;
  width: 100%;
}

.settings-section {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin-bottom: 8px;
  box-shadow: var(--shadow-sm);
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 20px;
  color: var(--color-text);
  padding-bottom: 12px;
  border-bottom: 1px solid var(--color-border);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  
  &:not(:last-child) {
    border-bottom: 1px solid var(--color-border);
  }
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-weight: 500;
  color: var(--color-text);
}

.setting-description {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.setting-control {
  display: flex;
  gap: 12px;
}

.theme-btn {
  padding: 10px 20px;
  border-radius: var(--radius-md);
  background-color: var(--color-bg);
  color: var(--color-text);
  font-weight: 500;
  transition: all var(--transition-fast);
  
  &:hover {
    background-color: var(--color-border);
  }
  
  &.active {
    background-color: var(--color-primary);
    color: white;
  }
}

.btn {
  width: 160px;
  height: 60px;
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  font-weight: 500;
  background-color: var(--color-primary);
  color: white;

  &:hover {
    background-color: var(--color-primary-hover);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-secondary {
  background-color: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);

  &:hover:not(:disabled) {
    background-color: var(--color-border);
  }
}

.btn-icon {
  padding: 10px 16px;
  font-size: 1.25rem;
}

.input-field {
  padding: 10px 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background-color: var(--color-bg);
  color: var(--color-text);
  font-size: 0.95rem;
  min-width: 250px;

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  &::placeholder {
    color: var(--color-text-secondary);
  }

  &.time-input {
    min-width: 150px;
    cursor: pointer;
  }
}

.toggle {
  position: relative;
  display: inline-block;
  width: 52px;
  height: 28px;
  
  input {
    opacity: 0;
    width: 0;
    height: 0;
    
    &:checked + .toggle-slider {
      background-color: var(--color-primary);
    }
    
    &:checked + .toggle-slider:before {
      transform: translateX(24px);
    }
  }
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-border);
  transition: var(--transition-fast);
  border-radius: 28px;
  
  &:before {
    position: absolute;
    content: "";
    height: 22px;
    width: 22px;
    left: 3px;
    bottom: 3px;
    background-color: white;
    transition: var(--transition-fast);
    border-radius: 50%;
  }
}

.about-info {
  color: var(--color-text-secondary);
  line-height: 1.8;
  
  p {
    margin: 0;
  }
  
  .copyright {
    margin-top: 16px;
    font-size: 0.9rem;
  }
}
</style>
