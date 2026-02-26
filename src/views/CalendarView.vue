<template>
  <div :class="$style.calendarView">
    <div :class="$style.calendarContent">
      <!-- Заголовок и навигация -->
      <div :class="$style.calendarHeader">
        <div :class="$style.headerActions">
          <div :class="$style.calendarDate">
            <button :class="$style.btnIcon" @click="previousMonth">‹</button>
            <span :class="$style.currentMonth">{{ formatMonth(currentDate) }}</span>
            <button :class="$style.btnIcon" @click="nextMonth">›</button>
          </div>
          <div :class="$style.calendarButtons">
            <button :class="$style.btn" @click="goToToday">Сегодня</button>
            <button :class="[$style.btn, $style.btnPrimary]" @click="openEntryModal">
              Новая запись
            </button>
          </div>
        </div>
      </div>

      <!-- Основная область: календарь слева, записи справа -->
      <div :class="$style.mainArea">
        <!-- Левая колонка: календарь -->
        <div :class="$style.calendarColumn">
          <div :class="$style.calendarGrid">
            <div :class="$style.weekdayHeader" v-for="day in weekDays" :key="day">
              {{ day }}
            </div>

            <div
              v-for="day in calendarDays"
              :key="day.date"
              :class="[
                $style.calendarDay,
                { [$style.otherMonth]: !day.currentMonth },
                { [$style.today]: day.isToday },
                { [$style.selected]: day.date === selectedDate },
                { [$style.hasEntries]: day.hasEntries }
              ]"
              @click="selectDate(day.date)"
            >
              <span :class="$style.dayNumber">{{ day.dayOfMonth }}</span>
              <span v-if="day.hasEntries" :class="$style.entriesIndicator"></span>
            </div>
          </div>
        </div>

        <!-- Правая колонка: список записей -->
        <div :class="$style.entriesColumn">
          <div :class="$style.entriesHeader">
            <h3 :class="$style.entriesTitle">Записи на {{ formatDate(selectedDate) }}</h3>
            <span :class="$style.entriesCount">{{ selectedEntries.length }}</span>
          </div>

          <div :class="$style.entriesList">
            <div v-if="selectedEntries.length === 0" :class="$style.noEntries">
              Нет записей на эту дату
            </div>

            <div
              v-for="entry in selectedEntries"
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
                <h4 :class="$style.entryTitle" @click="editEntry(entry)">
                  {{ entry.audioPath && !entry.content ? '🎤 ' : '' }}{{ entry.title }}
                </h4>
                <div :class="$style.entryActions">
                  <button
                    :class="$style.actionBtn"
                    @click.stop="editEntry(entry)"
                    title="Редактировать"
                  >
                    ✏️
                  </button>
                  <button
                    :class="$style.actionBtn"
                    @click.stop="deleteEntry(entry.id)"
                    title="Удалить запись"
                  >
                    🗑
                  </button>
                </div>
              </div>

              <p v-if="entry.content" :class="$style.entryPreview">{{ entry.content }}</p>

              <div v-if="entry.audioPath" :class="$style.audioPlayer">
                <audio :class="$style.audioElement" controls :src="convertFileSrc(entry.audioPath)"></audio>
              </div>

              <div :class="$style.entryMeta">
                <span v-if="entry.categoryId" :class="$style.entryCategory">
                  {{ getCategoryName(entry.categoryId) }}
                </span>
                <span :class="$style.entryPriority">
                  {{ getPriorityLabel(entry.priority) }}
                </span>
                <span :class="$style.entryTime">{{ formatTime(entry.createdAt) }}</span>
              </div>
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
        Высокий приоритет
      </div>
      <div :class="$style.contextMenuItem" @click="contextMenu.entry && setPriority(contextMenu.entry, 'medium')">
        Средний приоритет
      </div>
      <div :class="$style.contextMenuItem" @click="contextMenu.entry && setPriority(contextMenu.entry, 'low')">
        Низкий приоритет
      </div>
      <div :class="$style.contextMenuDivider"></div>
      <div :class="$style.contextMenuItemDanger" @click="contextMenu.entry && deleteEntry(contextMenu.entry.id)">
        Удалить
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
              <option value="high">Высокий</option>
              <option value="medium">Средний</option>
              <option value="low">Низкий</option>
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

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const currentDate = ref(new Date())
const selectedDate = ref(new Date().toISOString().split('T')[0])

// Модальное окно
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)

const formData = ref<Partial<DiaryEntry>>({
  title: '',
  content: '',
  categoryId: '',
  tags: [],
  priority: 'medium',
})

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

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const startDayOfWeek = firstDay.getDay() || 7
  const daysBeforeMonth = startDayOfWeek - 1

  const days: Array<{
    date: string
    dayOfMonth: number
    currentMonth: boolean
    isToday: boolean
    hasEntries: boolean
  }> = []

  const today = new Date().toISOString().split('T')[0]

  for (let i = daysBeforeMonth; i > 0; i--) {
    const date = new Date(year, month, -i + 1)
    const dateStr = date.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      dayOfMonth: date.getDate(),
      currentMonth: false,
      isToday: dateStr === today,
      hasEntries: diaryStore.getEntriesByDate(dateStr).length > 0,
    })
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i)
    const dateStr = date.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      dayOfMonth: i,
      currentMonth: true,
      isToday: dateStr === today,
      hasEntries: diaryStore.getEntriesByDate(dateStr).length > 0,
    })
  }

  const daysAfterMonth = 42 - days.length
  for (let i = 1; i <= daysAfterMonth; i++) {
    const date = new Date(year, month + 1, i)
    const dateStr = date.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      dayOfMonth: i,
      currentMonth: false,
      isToday: dateStr === today,
      hasEntries: diaryStore.getEntriesByDate(dateStr).length > 0,
    })
  }

  return days
})

const selectedEntries = computed(() => {
  return diaryStore.getEntriesByDate(selectedDate.value)
})

const categories = computed(() => categoriesStore.categories)

function formatMonth(date: Date): string {
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function getCategoryName(id: string): string {
  const category = categoriesStore.categories.find(c => c.id === id)
  return category?.name || ''
}

function getPriorityLabel(priority?: Priority): string {
  switch (priority) {
    case 'high': return '🔴 Высокий'
    case 'medium': return '🟡 Средний'
    case 'low': return '🟢 Низкий'
    default: return ''
  }
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

function previousMonth(): void {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() - 1,
    1
  )
}

function nextMonth(): void {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() + 1,
    1
  )
}

function goToToday(): void {
  currentDate.value = new Date()
  selectedDate.value = new Date().toISOString().split('T')[0]
}

function selectDate(date: string): void {
  selectedDate.value = date
  diaryStore.selectedDate = date
}

// Функции для модального окна
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
      date: selectedDate.value,
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
</script>

<style lang="scss" module src="./CalendarView.module.scss"></style>
