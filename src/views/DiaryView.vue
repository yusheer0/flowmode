<template>
  <div class="diary-view">
    <header class="view-header">
      <div class="header-actions">
        <div class="search-box">
          <input
            v-model="searchQuery"
            type="text"
            class="search-input"
            placeholder="Поиск записей..."
          />
        </div>
        <button class="btn btn-primary" @click="openEntryModal">
          Новая запись
        </button>
      </div>
    </header>

    <div class="diary-content">
      <div class="entries-list">
        <div v-if="currentEntries.length === 0" class="empty-state">
          <p>Нет записей</p>
        </div>

        <div v-else class="entries-grid">
          <div
            v-for="entry in currentEntries"
            :key="entry.id"
            class="entry-card"
            :class="{ 'entry-completed': entry.completed }"
          >
            <div class="entry-card-header">
              <div class="task-checkbox" @click.stop="toggleComplete(entry)">
                <input
                  type="checkbox"
                  :checked="!!entry.completed"
                  @click.stop="toggleComplete(entry)"
                />
              </div>
              <h3 
                class="entry-title"
                @click="editEntry(entry)"
              >
                {{ entry.title }}
              </h3>
            </div>
            
            <p class="entry-preview">{{ entry.content }}</p>
            
            <div class="entry-meta">
              <span v-if="entry.categoryId" class="entry-category">
                {{ getCategoryName(entry.categoryId) }}
              </span>
              <span class="entry-time">{{ formatTime(entry.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно для создания/редактирования -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>{{ isEditing ? 'Редактировать запись' : 'Новая запись' }}</h3>
          <button class="modal-close" @click="closeModal">×</button>
        </div>

        <div class="modal-body">
          <input
            v-model="formData.title"
            type="text"
            class="input"
            placeholder="Заголовок"
          />

          <textarea
            v-model="formData.content"
            class="textarea"
            placeholder="Содержимое записи..."
            rows="8"
          ></textarea>

          <div class="form-row">
            <select v-model="formData.categoryId" class="select">
              <option value="">Без категории</option>
              <option v-for="cat in categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-danger" v-if="isEditing" @click="deleteCurrentEntry">
            Удалить
          </button>
          <div class="modal-actions">
            <button class="btn" @click="closeModal">Отмена</button>
            <button class="btn btn-primary" @click="saveEntry">Сохранить</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDiaryStore, useCategoriesStore, useSettingsStore } from '@/stores'
import type { DiaryEntry } from '@/types'
import { invoke } from '@tauri-apps/api/core'

const diaryStore = useDiaryStore()
const categoriesStore = useCategoriesStore()
const settingsStore = useSettingsStore()

const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const searchQuery = ref('')

const formData = ref<Partial<DiaryEntry>>({
  title: '',
  content: '',
  categoryId: '',
  tags: [],
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

const categories = computed(() => categoriesStore.categories)

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
  }
  showModal.value = true
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
    diaryStore.updateEntry(editingId.value, formData.value)
  } else {
    const newEntry: DiaryEntry = {
      id: crypto.randomUUID(),
      date: diaryStore.selectedDate,
      title: formData.value.title!,
      content: formData.value.content!,
      categoryId: formData.value.categoryId || undefined,
      tags: formData.value.tags || [],
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

function deleteCurrentEntry(): void {
  if (editingId.value) {
    diaryStore.deleteEntry(editingId.value)
    closeModal()
  }
}
</script>

<style lang="scss">
.diary-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.view-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
}

.search-input {
  height: 60px;
  padding: 16px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg);
  color: var(--color-text);
  font-size: 0.95rem;
  width: 250px;
  transition: border-color var(--transition-fast);

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }

  &::placeholder {
    color: var(--color-text-secondary);
  }
}

.search-icon {
  position: absolute;
  left: 12px;
  font-size: 1rem;
  pointer-events: none;
}

.btn {
  padding: 17px 20px;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  font-weight: 500;
  transition: all var(--transition-fast);

  &.btn-primary {
    background-color: var(--color-primary);
    color: white;

    &:hover {
      background-color: var(--color-primary-hover);
    }
  }

  &.btn-danger {
    background-color: var(--color-danger);
    color: white;

    &:hover {
      opacity: 0.9;
    }
  }

  &:not(.btn-primary):not(.btn-danger) {
    background-color: var(--color-bg);
    color: var(--color-text);

    &:hover {
      background-color: var(--color-border);
    }
  }
}

.diary-content {
  flex: 1;
  padding: 8px;
  overflow: auto;
}

.entries-list {
  max-width: 1200px;
  margin: 0 auto;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-secondary);

  p {
    margin-bottom: 20px;
    font-size: 1.1rem;
  }
}

.entries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.entry-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  transition: box-shadow var(--transition-fast), transform var(--transition-fast);

  &:hover {
    box-shadow: var(--shadow-md);
  }

  &.entry-completed {
    opacity: 0.6;

    .entry-title {
      text-decoration: line-through;
      color: var(--color-text-secondary);
    }
  }
}

.entry-card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.task-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    cursor: pointer;
    accent-color: var(--color-primary);
  }
}

.entry-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  flex: 1;
}

.entry-preview {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 16px;
}

.entry-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.entry-category {
  background-color: var(--color-bg);
  padding: 4px 10px;
  border-radius: var(--radius-sm);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: auto;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
}

.modal-close {
  font-size: 1.5rem;
  color: var(--color-text-secondary);
  line-height: 1;

  &:hover {
    color: var(--color-text);
  }
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.input, .textarea, .select {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background-color: var(--color-bg);
  color: var(--color-text);

  &:focus {
    outline: none;
    border-color: var(--color-primary);
  }
}

.textarea {
  resize: vertical;
  min-height: 150px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-top: 1px solid var(--color-border);
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-left: auto;
}
</style>
