<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Layers3, Search, Cog, SquarePlus, X, Grid2x2 } from 'lucide-vue-next'
import ConfirmSheet from '@/components/common/ConfirmSheet.vue'
import SearchSheet from '@/components/common/SearchSheet.vue'
import NoteCard from '@/components/notes/NoteCard.vue'
import NoteFormSheet from '@/components/notes/NoteFormSheet.vue'
import { useNotesSheets } from '@/composables/useNotesSheets'
import { useNotesStore, useSettingsStore } from '@/stores'
import type { Note } from '@/types'
import SheetModal from '@/components/SheetModal.vue'
import { useAppUpdater } from '@/composables/useAppUpdater'
import { TRANSLATIONS } from '@/translations/translations'
import { getNoteBackground, NOTE_COLORS } from '@/utils/noteVisuals'

const notesStore = useNotesStore()
const settingsStore = useSettingsStore()
const searchQuery = ref('')
const debouncedSearchQuery = ref('')
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
const {
  isSearchModalOpen,
  isSettingsModalOpen,
  isAboutModalOpen,
  isLayerModalOpen,
  closeSecondarySheets,
  openSettingsModal,
  closeSettingsModal,
  openAboutModal,
  closeAboutModal,
  openLayerModal: openLayerSheet,
  closeLayerModal: closeLayerSheet,
} = useNotesSheets()
const isCreateModalOpen = ref(false)
const newNoteBody = ref('')
const selectedCreateCriticality = ref<Note['criticality'] | ''>('')
const isEditModalOpen = ref(false)
const editNoteId = ref<string | null>(null)
const editNoteBody = ref('')
const editNoteCriticality = ref<Note['criticality'] | ''>('')
const isDeleteConfirmModalOpen = ref(false)
const pendingDeleteNoteId = ref<string | null>(null)
const pendingDeleteFromEditModal = ref(false)
const isLayerDeleteConfirmModalOpen = ref(false)
const pendingDeleteLayerId = ref<string | null>(null)
const newLayerName = ref('')
const layerFormError = ref('')
const githubUrl = 'https://github.com/yusheer0/flowmode'

const sortedNotes = computed(() => notesStore.sortNotes(notesStore.getActiveNotesByLayer(), 'important'))
const searchableNotes = computed(() => sortedNotes.value.map(note => ({
  note,
  normalizedContent: note.content.toLowerCase(),
  normalizedTitle: note.title.toLowerCase(),
})))
const filteredNotes = computed(() => {
  const query = debouncedSearchQuery.value
  if (!query) return searchableNotes.value.map(entry => entry.note)
  return searchableNotes.value
    .filter(({ normalizedContent, normalizedTitle }) => normalizedContent.includes(query) || normalizedTitle.includes(query))
    .map(entry => entry.note)
})
const isCreateEnabled = computed(() => newNoteBody.value.length > 0)
const isEditEnabled = computed(() => editNoteBody.value.length > 0)
const customLayersCount = computed(() => notesStore.layers.filter(layer => !layer.isDefault).length)
const canCreateCustomLayer = computed(() => notesStore.canCreateCustomLayer())
const canSubmitLayer = computed(() => canCreateCustomLayer.value && newLayerName.value.length > 0)
const hasNoLayers = computed(() => notesStore.layers.length === 0)
const currentLang = computed(() => settingsStore.settings.language)
const t = (key: keyof typeof TRANSLATIONS.en): string => TRANSLATIONS[currentLang.value][key]
const translateForUpdater = (key: string): string => t(key as keyof typeof TRANSLATIONS.en)
const CRITICALITY_OPTIONS = computed(() => [
  { value: 'low', label: t('criticalityLow') },
  { value: 'medium', label: t('criticalityMedium') },
  { value: 'high', label: t('criticalityHigh') },
] as const)
const activeLayerLabel = computed(() => {
  return notesStore.getLayerName(notesStore.activeLayerId) || t('noLayerSelected')
})
const {
  appVersion,
  checkAndInstallUpdate,
  closeUpdateModal,
  isCheckingUpdates,
  isInstallingUpdate,
  isUpdateModalOpen,
  loadAppVersion,
  settingsUpdateMessage,
  settingsUpdateType,
  updateCurrentVersion,
  updateDownloadedBytes,
  updateError,
  updateProgress,
  updateStatus,
  updateTargetVersion,
} = useAppUpdater(translateForUpdater)

function openCreateModal(): void {
  if (hasNoLayers.value) {
    openLayerModal()
    return
  }
  closeSecondarySheets()
  newNoteBody.value = ''
  selectedCreateCriticality.value = ''
  isCreateModalOpen.value = true
}

function closeCreateModal(): void {
  isCreateModalOpen.value = false
}

function openEditModal(note: Note): void {
  closeSecondarySheets()
  isCreateModalOpen.value = false
  editNoteId.value = note.id
  editNoteBody.value = note.content
  editNoteCriticality.value = note.criticality || ''
  isEditModalOpen.value = true
}

function closeEditModal(): void {
  isEditModalOpen.value = false
  editNoteId.value = null
}

function openSearchModal(): void {
  closeSecondarySheets()
  isSearchModalOpen.value = true
}

function closeSearchModal(): void {
  isSearchModalOpen.value = false
}

function openLayerModal(): void {
  newLayerName.value = ''
  layerFormError.value = ''
  openLayerSheet()
}

function closeLayerModal(): void {
  if (hasNoLayers.value) return
  layerFormError.value = ''
  closeDeleteLayerConfirm()
  closeLayerSheet()
}

function selectLayer(layerId: string): void {
  notesStore.setActiveLayer(layerId)
  closeLayerSheet()
}

function createLayer(): void {
  if (!canSubmitLayer.value) return
  const result = notesStore.createCustomLayer(newLayerName.value)
  if (!result.success) {
    layerFormError.value = mapLayerError(result.code, result.error)
    return
  }

  newLayerName.value = ''
  layerFormError.value = ''
}

function deleteLayer(layerId: string): void {
  pendingDeleteLayerId.value = layerId
  isLayerDeleteConfirmModalOpen.value = true
}

function closeDeleteLayerConfirm(): void {
  isLayerDeleteConfirmModalOpen.value = false
  pendingDeleteLayerId.value = null
}

function confirmDeleteLayer(): void {
  if (!pendingDeleteLayerId.value) return

  const layerId = pendingDeleteLayerId.value
  closeDeleteLayerConfirm()

  const result = notesStore.deleteLayer(layerId)
  if (!result.success) {
    layerFormError.value = mapLayerDeleteError(result.code, result.error)
    return
  }
  layerFormError.value = ''
}

function mapLayerError(code?: string, error?: string): string {
  if (code === 'LAYER_NAME_REQUIRED') return t('layerNameRequired')
  if (code === 'LAYER_NAME_EXISTS') return t('layerNameExists')
  if (code === 'LAYER_LIMIT_REACHED') return t('layerLimitReached')
  if (!error) return t('customLayerCreateFailed')
  if (error.includes('Введите название слоя')) return t('layerNameRequired')
  if (error.includes('уже существует')) return t('layerNameExists')
  if (error.includes('Достигнут лимит')) return t('layerLimitReached')
  return t('customLayerCreateFailed')
}

function mapLayerDeleteError(code?: string, error?: string): string {
  if (code === 'LAYER_DELETE_LAST_BLOCKED') return t('layerDeleteLastBlocked')
  if (code === 'LAYER_NOT_FOUND') return t('layerDeleteNotFound')
  if (code === 'LAYER_TARGET_NOT_FOUND') return t('layerDeleteNotFound')
  if (!error) return t('layerDeleteFailed')
  if (error.includes('последний слой')) return t('layerDeleteLastBlocked')
  if (error.includes('не найден')) return t('layerDeleteNotFound')
  return t('layerDeleteFailed')
}

function updateLanguage(value: 'ru' | 'en'): void {
  settingsStore.updateSettings({ language: value })
}

function updateTheme(value: 'light' | 'dark'): void {
  settingsStore.updateSettings({ theme: value })
}

function createNote(): void {
  if (!isCreateEnabled.value) return
  const noteCriticality = selectedCreateCriticality.value || undefined

  notesStore.addNote({
    title: t('newNoteTitle'),
    content: newNoteBody.value,
    criticality: noteCriticality,
    backgroundColor: noteCriticality ? NOTE_COLORS[noteCriticality] : NOTE_COLORS.default,
  })

  closeCreateModal()
}

function saveEditedNote(): void {
  if (!editNoteId.value || !isEditEnabled.value) return
  const noteCriticality = editNoteCriticality.value || undefined

  notesStore.updateNote(editNoteId.value, {
    content: editNoteBody.value,
    criticality: noteCriticality,
    backgroundColor: noteCriticality ? NOTE_COLORS[noteCriticality] : NOTE_COLORS.default,
  })

  closeEditModal()
}

function deleteEditedNote(): void {
  if (!editNoteId.value) return
  openDeleteNoteConfirm(editNoteId.value, true)
}

function toggleImportant(noteId: string): void {
  notesStore.toggleImportant(noteId)
}

function deleteNote(noteId: string): void {
  openDeleteNoteConfirm(noteId)
}

function openDeleteNoteConfirm(noteId: string, fromEditModal = false): void {
  pendingDeleteNoteId.value = noteId
  pendingDeleteFromEditModal.value = fromEditModal
  isDeleteConfirmModalOpen.value = true
}

function closeDeleteNoteConfirm(): void {
  isDeleteConfirmModalOpen.value = false
  pendingDeleteNoteId.value = null
  pendingDeleteFromEditModal.value = false
}

function confirmDeleteNote(): void {
  if (!pendingDeleteNoteId.value) return

  notesStore.deleteNote(pendingDeleteNoteId.value)
  if (pendingDeleteFromEditModal.value) {
    closeEditModal()
  }
  closeDeleteNoteConfirm()
}

function updateSearchQuery(value: string): void {
  searchQuery.value = value
}

function updateCreateBody(value: string): void {
  newNoteBody.value = value
}

function updateCreateCriticality(value: Note['criticality'] | ''): void {
  selectedCreateCriticality.value = value
}

function updateEditBody(value: string): void {
  editNoteBody.value = value
}

function updateEditCriticality(value: Note['criticality'] | ''): void {
  editNoteCriticality.value = value
}

onMounted(async () => {
  await Promise.all([settingsStore.init(), notesStore.init(), loadAppVersion()])

  if (hasNoLayers.value) {
    openLayerModal()
    return
  }
})

watch(searchQuery, (nextValue) => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }
  searchDebounceTimer = setTimeout(() => {
    debouncedSearchQuery.value = nextValue.trim().toLowerCase()
  }, 180)
}, { immediate: true })

onBeforeUnmount(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
})
</script>

<template>
  <section :class="$style.notesView">
    <div :class="$style.canvas">
      <NoteCard
        v-for="note in filteredNotes"
        :key="note.id"
        :note="note"
        :styles="$style"
        :background-color="getNoteBackground(note)"
        :pin-title="t('pinNoteTitle')"
        :delete-title="t('deleteNoteTitle')"
        @edit="openEditModal"
        @toggle-important="toggleImportant"
        @delete="deleteNote"
      />
    </div>

    <!-- Create Modal -->
    <NoteFormSheet
        :is-open="isCreateModalOpen"
        :is-edit="false"
        :body="newNoteBody"
        :criticality="selectedCreateCriticality"
        :is-submit-enabled="isCreateEnabled"
        :options="CRITICALITY_OPTIONS"
        :styles="$style"
        :labels="{
          createTitle: t('newNoteTitle'),
          editTitle: t('editNoteTitle'),
          close: t('close'),
          bodyPlaceholder: t('noteBodyPlaceholder'),
          criticalityLabel: t('criticalityLabel'),
          createButton: t('createButton'),
          saveButton: t('saveButton'),
          deleteButton: t('deleteButton'),
        }"
        @close="closeCreateModal"
        @update:body="updateCreateBody"
        @update:criticality="updateCreateCriticality"
        @submit="createNote"
      />

      <NoteFormSheet
        :is-open="isEditModalOpen"
        :is-edit="true"
        :body="editNoteBody"
        :criticality="editNoteCriticality"
        :is-submit-enabled="isEditEnabled"
        :options="CRITICALITY_OPTIONS"
        :styles="$style"
        :labels="{
          createTitle: t('newNoteTitle'),
          editTitle: t('editNoteTitle'),
          close: t('close'),
          bodyPlaceholder: t('noteBodyPlaceholder'),
          criticalityLabel: t('criticalityLabel'),
          createButton: t('createButton'),
          saveButton: t('saveButton'),
          deleteButton: t('deleteButton'),
        }"
        @close="closeEditModal"
        @update:body="updateEditBody"
        @update:criticality="updateEditCriticality"
        @submit="saveEditedNote"
        @delete="deleteEditedNote"
      />

      <ConfirmSheet
        :is-open="isDeleteConfirmModalOpen"
        :title="t('deleteConfirmTitle')"
        :message="t('deleteConfirmMessage')"
        :cancel-label="t('cancelButton')"
        :confirm-label="t('deleteButton')"
        :styles="$style"
        @close="closeDeleteNoteConfirm"
        @cancel="closeDeleteNoteConfirm"
        @confirm="confirmDeleteNote"
      />

      <SearchSheet
        :is-open="isSearchModalOpen"
        :title="t('searchTitle')"
        :close-title="t('close')"
        :placeholder="t('searchPlaceholder')"
        :model-value="searchQuery"
        :styles="$style"
        @close="closeSearchModal"
        @update:model-value="updateSearchQuery"
      />

      <!-- Settings Modal -->
      <SheetModal
        :is-open="isSettingsModalOpen"
        :overlay-class="$style.modalOverlay"
        :sheet-class="[$style.modalSheet, $style.settingsSheet]"
        :close-button-class="$style.modalClose"
        :title-class="$style.modalTitle"
        :title="t('settingsTitle')"
        :close-title="t('close')"
        @close="closeSettingsModal"
      >
        <div :class="$style.settingsGroup">
          <span :class="$style.settingsLabel">{{ t('languageSetting') }}</span>
          <div :class="$style.settingsOptions">
            <button
              type="button"
              :class="[
                $style.settingsOption,
                { [$style.settingsOptionActive]: settingsStore.settings.language === 'ru' },
              ]"
              @click="updateLanguage('ru')"
            >
              Русский
            </button>
            <button
              type="button"
              :class="[
                $style.settingsOption,
                { [$style.settingsOptionActive]: settingsStore.settings.language === 'en' },
              ]"
              @click="updateLanguage('en')"
            >
              English
            </button>
          </div>
        </div>
        <div :class="$style.settingsGroup">
          <span :class="$style.settingsLabel">{{ t('themeSetting') }}</span>
          <div :class="$style.settingsOptions">
            <button
              type="button"
              :class="[
                $style.settingsOption,
                { [$style.settingsOptionActive]: settingsStore.settings.theme === 'light' },
              ]"
              @click="updateTheme('light')"
            >
              {{ t('themeLight') }}
            </button>
            <button
              type="button"
              :class="[
                $style.settingsOption,
                { [$style.settingsOptionActive]: settingsStore.settings.theme === 'dark' },
              ]"
              @click="updateTheme('dark')"
            >
              {{ t('themeDark') }}
            </button>
          </div>
        </div>
        <div :class="$style.settingsGroup">
          <span :class="$style.settingsLabel">{{ t('updateSetting') }}</span>
          <p :class="$style.updateMeta">
            {{ t('updateCurrentVersion') }}: {{ appVersion || '—' }}
          </p>
          <button
            type="button"
            :class="$style.updateButton"
            :disabled="isCheckingUpdates || isInstallingUpdate"
            @click="checkAndInstallUpdate"
          >
            {{ t('updateNowButton') }}
          </button>
          <p
            v-if="settingsUpdateMessage"
            :class="[
              $style.updateInlineStatus,
              {
                [$style.updateInlineStatusSuccess]: settingsUpdateType === 'success',
                [$style.updateInlineStatusError]: settingsUpdateType === 'error',
              },
            ]"
          >
            {{ settingsUpdateMessage }}
          </p>
        </div>
      </SheetModal>

      <!-- About Modal -->
      <SheetModal
        :is-open="isAboutModalOpen"
        :overlay-class="$style.modalOverlay"
        :sheet-class="[$style.modalSheet, $style.aboutSheet]"
        :close-button-class="$style.modalClose"
        :title-class="$style.modalTitle"
        :title="t('aboutTitle')"
        :close-title="t('close')"
        @close="closeAboutModal"
      >
        <div :class="$style.aboutContent">
          <p :class="$style.aboutMeta">
            {{ t('aboutVersionLabel') }}: {{ appVersion || '—' }}
          </p>
          <p :class="$style.aboutDescription">{{ t('aboutDescription') }}</p>
          <a
            :class="$style.aboutGithubButton"
            :href="githubUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            {{ t('aboutGithubButton') }}
          </a>
        </div>
      </SheetModal>

      <!-- Update Modal -->
      <SheetModal
        :is-open="isUpdateModalOpen"
        :overlay-class="$style.modalOverlay"
        :sheet-class="[$style.modalSheet, $style.updateSheet]"
        :close-button-class="$style.modalClose"
        :title-class="$style.modalTitle"
        :title="t('updateModalTitle')"
        :close-title="t('close')"
        :close-disabled="isInstallingUpdate"
        @close="closeUpdateModal"
      >
        <p :class="$style.updateStatus">{{ updateStatus }}</p>
        <p v-if="updateError" :class="$style.updateError">{{ updateError }}</p>
        <p v-if="updateCurrentVersion" :class="$style.updateMeta">
          {{ t('updateCurrentVersion') }}: {{ updateCurrentVersion }}
        </p>
        <p v-if="updateTargetVersion" :class="$style.updateMeta">
          {{ t('updateTargetVersion') }}: {{ updateTargetVersion }}
        </p>
        <p :class="$style.updateMeta">
          {{ t('updateRestartHint') }}
        </p>
        <div v-if="updateProgress !== null" :class="$style.updateProgressWrap">
          <div :class="$style.updateProgressTrack">
            <div :class="$style.updateProgressValue" :style="{ width: `${updateProgress}%` }"></div>
          </div>
          <p :class="$style.updateMeta">
            {{ t('updateDownloadProgress') }}: {{ updateProgress.toFixed(0) }}%
            <span v-if="updateDownloadedBytes">({{ updateDownloadedBytes }})</span>
          </p>
        </div>
      </SheetModal>

      <!-- Layer Modal -->
      <SheetModal
        :is-open="isLayerModalOpen"
        :overlay-class="$style.modalOverlay"
        :sheet-class="[$style.modalSheet, $style.layerSheet]"
        :close-button-class="$style.modalClose"
        :title-class="$style.modalTitle"
        :title="t('layersTitle')"
        :close-title="t('close')"
        @close="closeLayerModal"
      >
        <div :class="$style.layerButtons">
          <div
            v-for="layer in notesStore.layers"
            :key="layer.id"
          >
            <div :class="$style.layerRow">
              <button
                :class="[
                  $style.layerOption,
                  { [$style.layerOptionActive]: layer.id === notesStore.activeLayerId }
                ]"
                type="button"
                @click="selectLayer(layer.id)"
              >
                {{ layer.name }}
              </button>
              <button
                :class="$style.layerDeleteButton"
                type="button"
                :title="t('deleteButton')"
                :disabled="notesStore.layers.length <= 1"
                @click="deleteLayer(layer.id)"
              >
                <X :size="18" />
              </button>
            </div>
          </div>
        </div>

        <div :class="$style.layerCreate">
          <span :class="$style.layerCreateLabel">
            {{ t('layersCount') }}: {{ customLayersCount }}/{{ notesStore.MAX_CUSTOM_LAYERS }}
          </span>
          <div :class="$style.layerCreateControls">
            <input
              v-model.trim="newLayerName"
              :class="$style.layerCreateInput"
              :disabled="!canCreateCustomLayer"
              :placeholder="t('newLayerPlaceholder')"
              @keydown.enter.prevent="createLayer"
            />
            <button
              :class="$style.layerCreateButton"
              type="button"
              :disabled="!canSubmitLayer"
              @click="createLayer"
            >
              {{ t('createButton') }}
            </button>
          </div>
          <p v-if="!canCreateCustomLayer" :class="$style.layerHint">
            {{ t('customLayerLimitReached') }}
          </p>
          <p v-if="layerFormError" :class="$style.layerError">{{ layerFormError }}</p>
        </div>
      </SheetModal>

      <!-- Layer Delete Confirm Modal -->
    <ConfirmSheet
        :is-open="isLayerDeleteConfirmModalOpen"
        :title="t('layerDeleteConfirmTitle')"
        :message="t('layerDeleteConfirmMessage')"
        :cancel-label="t('cancelButton')"
        :confirm-label="t('deleteButton')"
        :styles="$style"
        @close="closeDeleteLayerConfirm"
        @cancel="closeDeleteLayerConfirm"
        @confirm="confirmDeleteLayer"
      />

    <!-- Bottom Dock -->
    <nav :class="$style.bottomDock">
      <button
        :class="$style.dockButton"
        type="button"
        :title="hasNoLayers ? t('createLayerFirstHint') : t('newNoteTitle')"
        :disabled="hasNoLayers"
        @click="openCreateModal"
      >
        <SquarePlus :size="20" />
      </button>
      <button
        :class="[$style.dockButton, { [$style.dockButtonActive]: isSearchModalOpen }]"
        type="button"
        :title="t('searchTitle')"
        @click="openSearchModal"
      >
        <Search :size="20" />
      </button>
      <button
        :class="[$style.dockButton, { [$style.dockButtonActive]: isLayerModalOpen }]"
        type="button"
        :title="`${t('layerTitle')}: ${activeLayerLabel}`"
        @click="openLayerModal"
      >
        <Layers3 :size="20" />
      </button>
      <button
        :class="[$style.dockButton, { [$style.dockButtonActive]: isSettingsModalOpen }]"
        type="button"
        :title="t('settingsTitle')"
        @click="openSettingsModal"
      >
        <Cog :size="20" />
      </button>
      <button
        :class="[$style.dockButton, { [$style.dockButtonActive]: isAboutModalOpen }]"
        type="button"
        :title="t('aboutTitle')"
        @click="openAboutModal"
      >
        <Grid2x2 :size="20" />
      </button>
    </nav>

    <div :class="$style.layerStatusDock">
      <div :class="$style.layerStatusWrapper">
        <Layers3 :size="18" color="#ffffff" />
        <strong :class="$style.layerStatusValue">{{ activeLayerLabel }}</strong>
      </div>
    </div>
  </section>
</template>

<style lang="scss" module src="./NotesView.module.scss"></style>
