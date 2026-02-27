<template>
  <div :class="$style.settingsView">
    <div :class="$style.settingsContent">
      <!-- Внешний вид -->
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
          </div>
        </div>
      </section>

      <!-- Telegram (все настройки в одном блоке) -->
      <section :class="$style.settingsSection">
        <h3 :class="$style.sectionTitle">Telegram</h3>

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

        <div :class="$style.settingsDivider"></div>

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
              <code>/note Ваша заметка</code> или <code>/заметка Ваша заметка</code><br><br>
              Например:<br>
              <code>/note Купить молоко</code><br>
              <code>/заметка Позвонить врачу завтра в 15:00</code>
            </span>
          </div>
        </div>
      </section>

      <!-- Мастер-пароль -->
      <section :class="$style.settingsSection">
        <h3 :class="$style.sectionTitle">Безопасность</h3>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Мастер-пароль</span>
            <span :class="$style.settingDescription">Изменить пароль для доступа к данным</span>
          </div>
          <div :class="$style.settingControl">
            <a-button size="large" @click="showChangePassword = true">
              Изменить пароль
            </a-button>
          </div>
        </div>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Заблокировать приложение</span>
            <span :class="$style.settingDescription">Требуется пароль для доступа</span>
          </div>
          <div :class="$style.settingControl">
            <a-button danger size="large" @click="lockApp">
              🔒 Заблокировать
            </a-button>
          </div>
        </div>
      </section>

      <!-- Уведомления -->
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

      <!-- Данные -->
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

        <div :class="$style.settingsDivider"></div>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Экспорт данных</span>
            <span :class="$style.settingDescription">Сохранить все данные в JSON файл</span>
          </div>
          <div :class="$style.settingControl">
            <button :class="$style.btn" @click="exportData">Экспорт в файл</button>
          </div>
        </div>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Экспорт в Telegram</span>
            <span :class="$style.settingDescription">Отправить резервную копию в личные сообщения Telegram</span>
          </div>
          <div :class="$style.settingControl">
            <button :class="$style.btn" @click="exportToTelegram" :disabled="!settingsStore.settings.telegram.enabled">
              Отправить в Telegram
            </button>
          </div>
        </div>

        <div :class="$style.settingItem">
          <div :class="$style.settingInfo">
            <span :class="$style.settingLabel">Импорт данных</span>
            <span :class="$style.settingDescription">Загрузить данные из JSON файла</span>
          </div>
          <div :class="$style.settingControl">
            <button :class="$style.btn" @click="importData">Импорт</button>
          </div>
        </div>
      </section>

      <!-- О приложении -->
      <section :class="$style.settingsSection">
        <h3 :class="$style.sectionTitle">О приложении</h3>

        <div :class="$style.aboutInfo">
          <p><strong>Ежедневник</strong> v{{ appVersion }}</p>
          <p>Приложение для ведения личных записей</p>
          <p :class="$style.copyright">© 2026</p>
        </div>
      </section>
    </div>

    <!-- Модальное окно смены пароля -->
    <a-modal
      v-model:open="showChangePassword"
      title="Изменить мастер-пароль"
      :footer="null"
      width="500px"
    >
      <a-form layout="vertical" size="large" @finish="handleChangePassword">
        <a-form-item
          label="Текущий пароль"
          name="oldPassword"
          :rules="[{ required: true, message: 'Введите текущий пароль' }]"
        >
          <a-input-password
            v-model:value="passwordForm.oldPassword"
            placeholder="Текущий пароль"
            size="large"
          />
        </a-form-item>

        <a-form-item
          label="Новый пароль"
          name="newPassword"
          :rules="[
            { required: true, message: 'Введите новый пароль' },
            { min: 6, message: 'Минимум 6 символов' }
          ]"
        >
          <a-input-password
            v-model:value="passwordForm.newPassword"
            placeholder="Новый пароль"
            size="large"
          />
        </a-form-item>

        <a-form-item
          label="Подтверждение нового пароля"
          name="confirmPassword"
          :rules="[
            { required: true, message: 'Подтвердите новый пароль' },
            { validator: validateConfirmPassword }
          ]"
        >
          <a-input-password
            v-model:value="passwordForm.confirmPassword"
            placeholder="Повторите новый пароль"
            size="large"
          />
        </a-form-item>

        <a-form-item>
          <div style="display: flex; gap: 12px; justify-content: flex-end;">
            <a-button size="large" @click="showChangePassword = false">
              Отмена
            </a-button>
            <a-button type="primary" html-type="submit" size="large" :loading="passwordLoading">
              Изменить пароль
            </a-button>
          </div>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSettingsStore, useDiaryStore, useNotesStore, useMasterPasswordStore, exportAllData, importAllData } from '@/stores'
import type { DiaryEntry, ExportData } from '@/types'
import type { Rule } from 'ant-design-vue/es/form'
import { save, open } from '@tauri-apps/plugin-dialog'
import { writeTextFile, readTextFile } from '@tauri-apps/plugin-fs'
import { invoke } from '@tauri-apps/api/core'
import { sendNotification } from '@tauri-apps/plugin-notification'
import { getVersion } from '@tauri-apps/api/app'

const router = useRouter()
const settingsStore = useSettingsStore()
const diaryStore = useDiaryStore()
const masterPasswordStore = useMasterPasswordStore()

const settings = computed(() => settingsStore.settings)
const testStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const testMessage = ref('')
const getChatIdLoading = ref(false)
const appVersion = ref('0.1.0')
let notificationInterval: ReturnType<typeof setInterval> | null = null
let telegramPollingInterval: ReturnType<typeof setInterval> | null = null

// Мастер-пароль
const showChangePassword = ref(false)
const passwordLoading = ref(false)
const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

// Валидация подтверждения пароля
function validateConfirmPassword({ getFieldValue }: { getFieldValue: (field: string) => string }) {
  return {
    validator(_: Rule, value: string) {
      if (!value || getFieldValue('newPassword') === value) {
        return Promise.resolve()
      }
      return Promise.reject(new Error('Пароли не совпадают'))
    },
  }
}

// Изменение пароля
async function handleChangePassword() {
  passwordLoading.value = true
  try {
    const success = await masterPasswordStore.changePassword(passwordForm.value.oldPassword, passwordForm.value.newPassword)
    if (success) {
      alert('Пароль успешно изменён')
      showChangePassword.value = false
      passwordForm.value = { oldPassword: '', newPassword: '', confirmPassword: '' }
    } else {
      alert('Неверный текущий пароль')
    }
  } catch (error) {
    console.error('Ошибка смены пароля:', error)
    alert('Ошибка смены пароля')
  } finally {
    passwordLoading.value = false
  }
}

// Блокировка приложения
function lockApp(): void {
  masterPasswordStore.lock()
  router.push('/master-password')
}

const getChatIdInstructions = computed(() => 
  '1. Создайте бота в @BotFather<br>2. Напишите боту любое сообщение (например, /start)<br>3. Нажмите кнопку 🔍 справа от поля Chat ID<br>4. Chat ID будет получен автоматически'
)

function setTheme(theme: 'light' | 'dark'): void {
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
    startTelegramPolling()
  }
}

async function toggleSaveVoice(event: Event): Promise<void> {
  const enabled = (event.target as HTMLInputElement).checked
  settingsStore.updateTelegramSettings({ saveVoice: enabled })
}

async function exportData(): Promise<void> {
  try {
    const data = exportAllData()
    const jsonString = JSON.stringify(data, null, 2)

    const fileName = `flowmode-backup-${new Date().toISOString().split('T')[0]}.json`
    const filePath = await save({
      title: 'Экспорт данных',
      defaultPath: fileName,
      filters: [{
        name: 'JSON',
        extensions: ['json'],
      }],
    })

    if (filePath) {
      await writeTextFile(filePath, jsonString)
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
      title: 'Импорт данных',
      multiple: false,
      filters: [{
        name: 'JSON',
        extensions: ['json'],
      }],
    })

    if (filePath) {
      const content = await readTextFile(filePath)
      const data = JSON.parse(content) as ExportData

      const entriesCount = data.entries?.length || 0
      const habitsCount = data.habits?.length || 0
      const moodCount = data.moodEntries?.length || 0

      const confirmMsg = `Загрузить данные из файла?\n\n` +
        `Записи: ${entriesCount}\n` +
        `Привычки: ${habitsCount}\n` +
        `Настроение: ${moodCount}\n\n` +
        `Внимание: Текущие данные будут заменены!`

      if (confirm(confirmMsg)) {
        importAllData(data)
        alert('Данные успешно импортированы!')
        window.location.reload()
      }
    }
  } catch (error) {
    console.error('Ошибка импорта:', error)
    alert('Ошибка при импорте данных: ' + (error instanceof Error ? error.message : error))
  }
}

async function exportToTelegram(): Promise<void> {
  if (!settingsStore.settings.telegram.enabled || !settingsStore.settings.telegram.botToken || !settingsStore.settings.telegram.chatId) {
    alert('Сначала настройте Telegram в настройках приложения')
    return
  }

  try {
    const data = exportAllData()
    const jsonString = JSON.stringify(data, null, 2)
    const fileName = `flowmode-backup-${new Date().toISOString().split('T')[0]}.json`

    // Отправляем файл в Telegram
    const success = await invoke<boolean>('send_telegram_file', {
      botToken: settingsStore.settings.telegram.botToken,
      chatId: settingsStore.settings.telegram.chatId,
      content: jsonString,
      fileName: fileName,
    })

    if (success) {
      alert('Резервная копия отправлена в Telegram!')
    } else {
      alert('Ошибка при отправке файла')
    }
  } catch (error) {
    console.error('Ошибка экспорта в Telegram:', error)
    alert('Ошибка при экспорте в Telegram: ' + (error instanceof Error ? error.message : error))
  }
}

onMounted(async () => {
  try {
    appVersion.value = await getVersion()
  } catch {
    appVersion.value = '0.1.0'
  }

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
  const notesStore = useNotesStore()
  
  if (!settings.telegram.enabled || !settings.telegram.botToken) return

  try {
    const updates = await invoke<TelegramUpdate[]>('get_telegram_updates', {
      botToken: settings.telegram.botToken,
      offset: (settings.telegram.lastUpdateId || 0) + 1,
    })

    let maxUpdateId = settings.telegram.lastUpdateId || 0

    for (const update of updates) {
      if (update.message) {
        // Обработка текстовых сообщений с командой /note или /заметка
        if (update.message.text) {
          const text = update.message.text.trim()

          // Проверяем команду /note или /заметка
          const noteCommandMatch = text.match(/^\/(note|заметка)\s+(.+)/i)
          
          if (noteCommandMatch) {
            const content = noteCommandMatch[2].trim()

            if (content) {
              // Создаем заметку из сообщения
              notesStore.addNote(content)

              // Отправляем подтверждение в Telegram
              try {
                await invoke<boolean>('send_telegram_notification', {
                  botToken: settings.telegram.botToken,
                  chatId: settings.telegram.chatId,
                  message: '✅ Заметка сохранена!',
                })
              } catch (error) {
                console.error('Ошибка отправки подтверждения:', error)
              }
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
