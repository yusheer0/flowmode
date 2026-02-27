<template>
  <div :class="$style.notesView">
    <div :class="$style.notesContent">
      <!-- Поиск, сортировка и кнопка -->
      <div :class="$style.topBar">
        <div :class="$style.searchBox">
          <a-input
            v-model:value="searchQuery"
            :class="$style.searchInput"
            placeholder="Поиск заметок..."
            size="large"
            allow-clear
          >
            <template #prefix>
              <span class="material-symbols-rounded">search</span>
            </template>
          </a-input>
        </div>

        <div :class="$style.controls">
          <a-select
            v-model:value="sortOption"
            :class="$style.sortSelect"
            size="large"
            @change="applySort"
          >
            <a-select-option value="newest">Сначала новые</a-select-option>
            <a-select-option value="oldest">Сначала старые</a-select-option>
            <a-select-option value="important">Важные сверху</a-select-option>
          </a-select>

          <a-button type="primary" size="large" @click="openAddModal">
            Новая заметка
          </a-button>

          <a-button size="large" @click="showTrashModal = true">
            Корзина
            <a-badge :count="trashedCount" :numberStyle="{ backgroundColor: '#ef4444' }" />
          </a-button>
        </div>
      </div>

      <!-- Список заметок -->
      <div :class="$style.notesList">
        <a-empty v-if="displayNotes.length === 0" :description="notes.length === 0 ? 'Здесь пусто, даже очень' : 'Заметки не найдены'" />

        <div v-else :class="$style.notesGrid">
          <a-card
            v-for="note in displayNotes"
            :key="note.id"
            :class="[$style.noteCard, { [$style.important]: note.isImportant }]"
            size="small"
            @click="editNote(note)"
          >
            <div :class="$style.noteCardHeader">
              <span :class="$style.noteDate">{{ formatDate(note.updatedAt) }}</span>
              <div :class="$style.noteActions">
                <a-button
                  :class="[$style.actionBtn, { [$style.active]: note.isImportant }]"
                  type="text"
                  size="small"
                  @click.stop="toggleImportant(note.id)"
                  title="Важная"
                >
                  <template #icon>{{ note.isImportant ? '★' : '☆' }}</template>
                </a-button>
                <a-button
                  :class="$style.actionBtn"
                  type="text"
                  danger
                  size="small"
                  @click.stop="copyToClipboard(note.content)"
                  title="Копировать"
                >
                  <template #icon>📋</template>
                </a-button>
                <a-button
                  :class="$style.actionBtn"
                  type="text"
                  danger
                  size="small"
                  @click.stop="deleteNote(note.id)"
                  title="Удалить"
                >
                  <template #icon>🗑</template>
                </a-button>
              </div>
            </div>
            <p :class="$style.noteContent">{{ note.content }}</p>
            <div :class="$style.noteFooter">
              <span :class="$style.charCount">{{ note.content.length }} симв.</span>
              <span v-if="note.isImportant" :class="$style.importantBadge">Важная</span>
            </div>
          </a-card>
        </div>
      </div>
    </div>

    <!-- Модальное окно для добавления/редактирования -->
    <a-modal
      v-model:open="showModal"
      :title="isEditing ? 'Редактировать заметку' : 'Новая заметка'"
      :footer="null"
      width="600px"
    >
      <a-textarea
        ref="textareaRef"
        v-model:value="formData.content"
        :class="$style.textarea"
        placeholder="Текст заметки..."
        :rows="12"
        autofocus
        @input="handleInput"
      />
      <div :class="$style.modalFooter">
        <div :class="$style.charCountLive">
          {{ formData.content.length }} символов
        </div>
        <div :class="$style.modalActions">
          <a-button @click="closeModal">Отмена</a-button>
          <a-button type="primary" @click="saveNote" :disabled="!formData.content.trim()">
            Сохранить
          </a-button>
        </div>
      </div>
    </a-modal>

    <!-- Модальное окно корзины -->
    <a-modal
      v-model:open="showTrashModal"
      title="Корзина"
      :footer="null"
      width="700px"
    >
      <div :class="$style.trashHeader">
        <span v-if="trashedNotes.length > 0">
          Удалённых заметок: {{ trashedNotes.length }}
        </span>
        <a-button
          v-if="trashedNotes.length > 0"
          danger
          size="large"
          @click="showClearConfirm = true"
        >
          Очистить корзину
        </a-button>
      </div>

      <div :class="$style.trashContent">
        <a-empty v-if="trashedNotes.length === 0" description="Корзина пуста" />

        <div v-else :class="$style.trashList">
          <div
            v-for="note in trashedNotes"
            :key="note.id"
            :class="$style.trashItem"
          >
            <div :class="$style.trashItemHeader">
              <span :class="$style.trashDate">{{ formatDate(note.deletedAt!) }}</span>
              <div :class="$style.trashActions">
                <a-button
                  type="primary"
                  size="small"
                  @click="restoreNote(note.id)"
                >
                  Восстановить
                </a-button>
                <a-button
                  danger
                  type="text"
                  size="small"
                  @click="permanentDeleteNote(note.id)"
                >
                  Удалить навсегда
                </a-button>
              </div>
            </div>
            <p :class="$style.trashNoteContent">{{ note.content }}</p>
          </div>
        </div>
      </div>
    </a-modal>

    <!-- Подтверждение очистки корзины -->
    <a-modal
      v-model:open="showClearConfirm"
      title="Очистить корзину"
      :footer="null"
      width="450px"
    >
      <a-alert
        type="warning"
        show-icon
      >
        <template #message>
          <div>
            <strong>Внимание!</strong> Все заметки будут удалены навсегда.
          </div>
        </template>
        <template #description>
          <div style="margin-top: 12px;">
            Это действие нельзя отменить. Вы уверены?
          </div>
        </template>
      </a-alert>

      <div :class="$style.modalFooter">
        <a-button size="large" @click="showClearConfirm = false">
          Отмена
        </a-button>
        <a-button
          danger
          size="large"
          @click="clearTrash"
        >
          Удалить всё
        </a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useNotesStore } from '@/stores'
import type { Note, NoteSortOption } from '@/types'
import { message } from 'ant-design-vue'

const notesStore = useNotesStore()

const showModal = ref(false)
const showTrashModal = ref(false)
const showClearConfirm = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const searchQuery = ref('')
const sortOption = ref<NoteSortOption>('newest')
const textareaRef = ref()

const formData = ref<{ content: string; id?: string }>({
  content: '',
})

const notes = computed(() => notesStore.getActiveNotes())
const trashedNotes = computed(() => notesStore.getTrashedNotes())
const trashedCount = computed(() => trashedNotes.value.length)

const displayNotes = computed(() => {
  let result = notes.value

  // Поиск
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(note =>
      note.content.toLowerCase().includes(query)
    )
  }

  // Сортировка
  result = notesStore.sortNotes(result, sortOption.value)

  return result
})

// Автосохранение при вводе
let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null

function handleInput() {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
  }

  if (isEditing.value && editingId.value) {
    autoSaveTimeout = setTimeout(() => {
      notesStore.autoSaveNote(editingId.value!, formData.value.content)
    }, 1000)
  }
}

function applySort() {
  // Сортировка применяется через computed
}

function openAddModal(): void {
  isEditing.value = false
  editingId.value = null
  formData.value = { content: '' }
  showModal.value = true
}

function editNote(note: Note): void {
  isEditing.value = true
  editingId.value = note.id
  formData.value = { content: note.content, id: note.id }
  showModal.value = true
}

function closeModal(): void {
  showModal.value = false
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
    autoSaveTimeout = null
  }
}

function saveNote(): void {
  if (!formData.value.content?.trim()) return

  if (isEditing.value && editingId.value) {
    notesStore.updateNote(editingId.value, formData.value.content.trim())
  } else {
    notesStore.addNote(formData.value.content.trim())
  }

  closeModal()
}

function deleteNote(id: string): void {
  notesStore.deleteNote(id)
}

function toggleImportant(id: string): void {
  notesStore.toggleImportant(id)
}

async function copyToClipboard(content: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(content)
    message.success('Скопировано в буфер обмена')
  } catch (error) {
    message.error('Ошибка копирования')
  }
}

function formatDate(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Функции корзины
function restoreNote(id: string): void {
  notesStore.restoreNote(id)
  message.success('Заметка восстановлена')
}

function permanentDeleteNote(id: string): void {
  notesStore.permanentDeleteNote(id)
  message.success('Заметка удалена навсегда')
}

function clearTrash(): void {
  notesStore.clearTrash()
  showClearConfirm.value = false
  message.success('Корзина очищена')
}

onMounted(() => {
  notesStore.init()
})

onUnmounted(() => {
  if (autoSaveTimeout) {
    clearTimeout(autoSaveTimeout)
  }
})
</script>

<style lang="scss" module src="./NotesView.module.scss"></style>
