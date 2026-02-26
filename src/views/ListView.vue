<template>
  <div :class="$style.listView">
    <div :class="$style.listContent">
      <!-- Панель действий и фильтров -->
      <div :class="$style.actionsBar">
        <div :class="$style.actionsRow">
          <div :class="$style.headerActions">
            <button :class="[$style.btn, $style.btnSecondary]" @click="refreshEntries" title="Обновить записи из Telegram">
              Синхронизация
            </button>
            <div :class="$style.searchBox">
              <input
                v-model="searchQuery"
                type="text"
                :class="$style.searchInput"
                placeholder="Поиск записей..."
              />
            </div>
            <button :class="[$style.btn, $style.btnPrimary]" @click="openEntryModal">
              Новая запись
            </button>
          </div>
        </div>

        <!-- Расширенные фильтры -->
        <div :class="$style.filtersBar">
          <div :class="$style.filterGroup">
            <select v-model="filterCategory" :class="$style.filterSelect">
              <option value="">Все категории</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>

          <div :class="$style.filterGroup">
            <select v-model="sortBy" :class="$style.filterSelect">
              <option value="createdAt">По времени создания</option>
              <option value="priority">По приоритету</option>
              <option value="title">По названию</option>
            </select>
          </div>

          <div :class="$style.filterGroup">
            <div :class="$style.filterButtons">
              <button
                :class="[$style.filterBtn, { [$style.active]: filterStatus === 'all' }]"
                @click="filterStatus = 'all'"
              >
                Все
              </button>
              <button
                :class="[$style.filterBtn, { [$style.active]: filterStatus === 'pending' }]"
                @click="filterStatus = 'pending'"
              >
                В процессе
              </button>
              <button
                :class="[$style.filterBtn, { [$style.active]: filterStatus === 'completed' }]"
                @click="filterStatus = 'completed'"
              >
                Выполнено
              </button>
            </div>
          </div>

          <div :class="$style.filterGroup">
            <div :class="$style.filterButtons">
              <button
                :class="[$style.filterBtn, $style.priorityAll, { [$style.active]: filterPriority === 'all' }]"
                @click="filterPriority = 'all'"
              >
                Все
              </button>
              <button
                :class="[$style.filterBtn, $style.priorityHigh, { [$style.active]: filterPriority === 'high' }]"
                @click="filterPriority = 'high'"
              >
                Высокий
              </button>
              <button
                :class="[$style.filterBtn, $style.priorityMedium, { [$style.active]: filterPriority === 'medium' }]"
                @click="filterPriority = 'medium'"
              >
                Средний
              </button>
              <button
                :class="[$style.filterBtn, $style.priorityLow, { [$style.active]: filterPriority === 'low' }]"
                @click="filterPriority = 'low'"
              >
                Низкий
              </button>
            </div>
          </div>
        </div>
      </div>
      <div :class="$style.entriesList">
        <div v-if="filteredEntries.length === 0" :class="$style.emptyState">
          <p>Нет записей по выбранным фильтрам</p>
        </div>

        <div v-else :class="$style.entriesGrid">
          <div
            v-for="entry in filteredEntries"
            :key="entry.id"
            :class="[
              $style.entryCard,
              { [$style.entryCompleted]: entry.completed },
              $style['priority' + capitalize(entry.priority || 'medium')]
            ]"
            @contextmenu.prevent="openContextMenu($event, entry)"
          >
            <div :class="$style.entryCardHeader">
              <div :class="$style.taskCheckbox" @click.stop="toggleComplete(entry)">
                <input
                  type="checkbox"
                  :checked="!!entry.completed"
                  @click.stop="toggleComplete(entry)"
                />
              </div>
              <h3
                :class="$style.entryTitle"
                @click="editEntry(entry)"
              >
                {{ entry.audioPath && !entry.content ? '🎤 ' : '' }}{{ entry.title }}
              </h3>
              <div :class="$style.entryActions">
                <button
                  :class="$style.actionBtn"
                  @click.stop="deleteEntry(entry.id)"
                  title="Удалить запись"
                >
                  🗑
                </button>
              </div>
            </div>

            <p :class="$style.entryPreview">{{ entry.content }}</p>

            <!-- Аудиоплеер для голосовых сообщений -->
            <div v-if="entry.audioPath" :class="$style.audioPlayer">
              <audio :class="$style.audioElement" controls :src="convertFileSrc(entry.audioPath)"></audio>
            </div>

            <div :class="$style.entryMeta">
              <span v-if="entry.categoryId" :class="$style.entryCategory">
                {{ getCategoryName(entry.categoryId) }}
              </span>
              <span :class="$style.entryTime">{{ formatTime(entry.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Контекстное меню -->
    <div
      v-if="contextMenu.visible"
      :class="$style.contextMenu"
      :style="{ top: contextMenu.y + 'px', left: contextMenu.x + 'px' }"
      @click.stop
    >
      <div :class="$style.contextMenuItem" @click="contextMenu.entry && editEntry(contextMenu.entry)">
        ✏️ Редактировать
      </div>
      <div :class="$style.contextMenuItem" @click="contextMenu.entry && duplicateEntry(contextMenu.entry)">
        📋 Дублировать
      </div>
      <div :class="$style.contextMenuDivider"></div>
      <div :class="$style.contextMenuItem" @click="contextMenu.entry && setPriority(contextMenu.entry, 'high')">
        🔴 Высокий приоритет
      </div>
      <div :class="$style.contextMenuItem" @click="contextMenu.entry && setPriority(contextMenu.entry, 'medium')">
        🟡 Средний приоритет
      </div>
      <div :class="$style.contextMenuItem" @click="contextMenu.entry && setPriority(contextMenu.entry, 'low')">
        🟢 Низкий приоритет
      </div>
      <div :class="$style.contextMenuDivider"></div>
      <div :class="$style.contextMenuItemDanger" @click="contextMenu.entry && deleteEntry(contextMenu.entry.id)">
        🗑 Удалить
      </div>
    </div>
    <div v-if="contextMenu.visible" :class="$style.contextMenuOverlay" @click="closeContextMenu"></div>

    <!-- Модальное окно для создания/редактирования -->
    <div v-if="showModal" :class="$style.modalOverlay" @click="closeModal">
      <div :class="$style.modal" @click.stop>
        <div :class="$style.modalHeader">
          <h3>{{ isEditing ? 'Редактировать запись' : 'Новая запись' }}</h3>
          <button :class="$style.modalClose" @click="closeModal">×</button>
        </div>

        <div :class="$style.modalBody">
          <input
            v-model="formData.title"
            type="text"
            :class="$style.input"
            placeholder="Заголовок"
          />

          <textarea
            v-model="formData.content"
            :class="$style.textarea"
            placeholder="Содержимое записи..."
            rows="8"
          ></textarea>

          <div :class="$style.formRow">
            <select v-model="formData.categoryId" :class="$style.select">
              <option value="">Без категории</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>

            <select v-model="formData.priority" :class="$style.select">
              <option value="">Приоритет</option>
              <option value="high">🔴 Высокий</option>
              <option value="medium">🟡 Средний</option>
              <option value="low">🟢 Низкий</option>
            </select>
          </div>
        </div>

        <div :class="$style.modalFooter">
          <button :class="[$style.btn, $style.btnDanger]" v-if="isEditing" @click="deleteEntry(editingId!)">
            Удалить
          </button>
          <div :class="$style.modalActions">
            <button :class="$style.btn" @click="closeModal">Отмена</button>
            <button :class="[$style.btn, $style.btnPrimary]" @click="saveEntry">Сохранить</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDiaryStore, useCategoriesStore, useSettingsStore } from '@/stores'
import type { DiaryEntry, Priority } from '@/types'
import { invoke, convertFileSrc } from '@tauri-apps/api/core'

const diaryStore = useDiaryStore()
const categoriesStore = useCategoriesStore()
const settingsStore = useSettingsStore()

const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const searchQuery = ref('')

// Фильтры
const filterCategory = ref('')
const filterStatus = ref<'all' | 'pending' | 'completed'>('all')
const filterPriority = ref<'all' | Priority>('all')
const sortBy = ref('createdAt')

const formData = ref<Partial<DiaryEntry>>({
  title: '',
  content: '',
  categoryId: '',
  tags: [],
  priority: 'medium',
})

// Функция обновления записей из Telegram
async function refreshEntries(): Promise<void> {
  const settings = settingsStore.settings
  if (!settings.telegram.enabled || !settings.telegram.botToken) {
    alert('Сначала настройте Telegram в настройках приложения')
    return
  }
  
  try {
    // Вызываем функцию синхронизации из SettingsView через invoke
    // Или просто обновляем lastUpdateId чтобы получить все сообщения
    const updates = await invoke<TelegramUpdate[]>('get_telegram_updates', {
      botToken: settings.telegram.botToken,
      offset: (settings.telegram.lastUpdateId || 0) + 1,
    })
    
    if (updates.length > 0) {
      alert(`Получено ${updates.length} новых сообщений(ия)`)
    } else {
      alert('Нет новых сообщений')
    }
  } catch (error) {
    alert('Ошибка обновления: ' + (error instanceof Error ? error.message : error))
  }
}

// Контекстное меню
const contextMenu = ref<{
  visible: boolean
  x: number
  y: number
  entry: DiaryEntry | null
}>({
  visible: false,
  x: 0,
  y: 0,
  entry: null,
})

const currentEntries = computed(() => {
  const entries = diaryStore.getEntriesByDate(diaryStore.selectedDate)

  if (!searchQuery.value) {
    return entries
  }

  const query = searchQuery.value.toLowerCase()
  return entries.filter(entry =>
    entry.title.toLowerCase().includes(query) ||
    entry.content.toLowerCase().includes(query)
  )
})

const filteredEntries = computed(() => {
  let result = [...currentEntries.value]

  // Фильтр по категории
  if (filterCategory.value) {
    result = result.filter(entry => entry.categoryId === filterCategory.value)
  }

  // Фильтр по статусу
  if (filterStatus.value === 'pending') {
    result = result.filter(entry => !entry.completed)
  } else if (filterStatus.value === 'completed') {
    result = result.filter(entry => entry.completed)
  }

  // Фильтр по приоритету
  if (filterPriority.value !== 'all') {
    result = result.filter(entry => entry.priority === filterPriority.value)
  }

  // Сортировка
  if (sortBy.value === 'priority') {
    const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
    result.sort((a, b) => {
      const aPriority = priorityOrder[a.priority || 'medium']
      const bPriority = priorityOrder[b.priority || 'medium']
      return aPriority - bPriority
    })
  } else if (sortBy.value === 'title') {
    result.sort((a, b) => a.title.localeCompare(b.title))
  } else {
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }

  return result
})

const categories = computed(() => categoriesStore.categories)

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function getCategoryName(id: string): string {
  const category = categoriesStore.categories.find(c => c.id === id)
  return category?.name || ''
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function openEntryModal(): void {
  isEditing.value = false
  editingId.value = null
  formData.value = {
    title: '',
    content: '',
    categoryId: '',
    tags: [],
    priority: 'medium',
  }
  showModal.value = true
}

function editEntry(entry: DiaryEntry): void {
  isEditing.value = true
  editingId.value = entry.id
  formData.value = {
    title: entry.title,
    content: entry.content,
    categoryId: entry.categoryId,
    tags: entry.tags,
    priority: entry.priority,
  }
  showModal.value = true
  closeContextMenu()
}

function closeModal(): void {
  showModal.value = false
}

function saveEntry(): void {
  if (!formData.value.title || !formData.value.content) {
    return
  }

  const now = new Date().toISOString()

  if (isEditing.value && editingId.value) {
    diaryStore.updateEntry(editingId.value, {
      ...formData.value,
      updatedAt: now,
    })
  } else {
    const newEntry: DiaryEntry = {
      id: crypto.randomUUID(),
      date: diaryStore.selectedDate,
      title: formData.value.title!,
      content: formData.value.content!,
      categoryId: formData.value.categoryId || undefined,
      tags: formData.value.tags || [],
      priority: formData.value.priority || 'medium',
      createdAt: now,
      updatedAt: now,
    }
    diaryStore.addEntry(newEntry)

    sendTelegramNotificationIfNeeded(newEntry)
  }

  closeModal()
}

function toggleComplete(entry: DiaryEntry): void {
  diaryStore.toggleComplete(entry.id)
}

function deleteEntry(id: string): void {
  diaryStore.deleteEntry(id)
  closeContextMenu()
}

function duplicateEntry(entry: DiaryEntry): void {
  const now = new Date().toISOString()
  const newEntry: DiaryEntry = {
    ...entry,
    id: crypto.randomUUID(),
    title: `${entry.title} (копия)`,
    createdAt: now,
    updatedAt: now,
    completed: false,
  }
  diaryStore.addEntry(newEntry)
  closeContextMenu()
}

function setPriority(entry: DiaryEntry, priority: Priority): void {
  diaryStore.updateEntry(entry.id, { priority })
  closeContextMenu()
}

function openContextMenu(event: MouseEvent, entry: DiaryEntry): void {
  contextMenu.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY,
    entry,
  }
}

function closeContextMenu(): void {
  contextMenu.value.visible = false
  contextMenu.value.entry = null
}

async function sendTelegramNotificationIfNeeded(entry: DiaryEntry): Promise<void> {
  const settings = settingsStore.settings

  if (!settings.telegram.enabled ||
      !settings.telegram.botToken ||
      !settings.telegram.chatId) {
    return
  }

  const planKeywords = ['завтра', 'план', 'напомнить', 'важно', 'не забыть']
  const contentLower = (entry.title + ' ' + entry.content).toLowerCase()

  const isPlanEntry = planKeywords.some(keyword => contentLower.includes(keyword))

  if (!isPlanEntry) {
    return
  }

  const dateStr = new Date(entry.date).toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const message = `📝 <b>Новая запись</b>\n\n📅 ${dateStr}\n\n<b>${entry.title}</b>\n\n${entry.content.substring(0, 200)}${entry.content.length > 200 ? '...' : ''}`

  try {
    await invoke<boolean>('send_telegram_notification', {
      botToken: settings.telegram.botToken,
      chatId: settings.telegram.chatId,
      message,
    })
  } catch (error) {
    console.error('Ошибка отправки уведомления в Telegram:', error)
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

<style lang="scss" module src="./ListView.module.scss"></style>
