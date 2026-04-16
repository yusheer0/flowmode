<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Layers3, Heart, Search, Settings, SquarePlus, Trash2, X } from 'lucide-vue-next'
import { getVersion } from '@tauri-apps/api/app'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { useNotesStore, useSettingsStore } from '@/stores'
import type { Note } from '@/types'
import VaultView from '@/views/VaultView.vue'
import { TRANSLATIONS } from '@/translations/translations'

const notesStore = useNotesStore()
const settingsStore = useSettingsStore()
const NOTE_COLORS = {
  default: '#8c8c94',
  low: '#7b8fb8',
  medium: '#b89565',
  high: '#b96464',
} as const
const activeView = ref<'notes' | 'vault'>('notes')
const searchQuery = ref('')
const isSearchModalOpen = ref(false)
const isSettingsModalOpen = ref(false)
const isLayerModalOpen = ref(false)
const isCreateModalOpen = ref(false)
const isUpdateModalOpen = ref(false)
const newNoteTitle = ref('')
const newNoteBody = ref('')
const selectedCreateCriticality = ref<Note['criticality'] | ''>('')
const isEditModalOpen = ref(false)
const editNoteId = ref<string | null>(null)
const editNoteTitle = ref('')
const editNoteBody = ref('')
const editNoteCriticality = ref<Note['criticality'] | ''>('')
const isDeleteConfirmModalOpen = ref(false)
const pendingDeleteNoteId = ref<string | null>(null)
const pendingDeleteFromEditModal = ref(false)
const newLayerName = ref('')
const layerFormError = ref('')
const isCheckingUpdates = ref(false)
const isInstallingUpdate = ref(false)
const updateStatus = ref('')
const updateError = ref('')
const settingsUpdateMessage = ref('')
const settingsUpdateType = ref<'neutral' | 'success' | 'error'>('neutral')
const updateCurrentVersion = ref('')
const updateTargetVersion = ref('')
const updateProgress = ref<number | null>(null)
const updateDownloadedBytes = ref('')
const appVersion = ref('')
let unlistenUpdateProgress: UnlistenFn | null = null

type UpdateCheckResult = {
  available: boolean
  currentVersion: string
  targetVersion: string | null
}

type UpdateDownloadProgress = {
  downloaded: number
  contentLength: number | null
  progress: number | null
  version: string
}

const sortedNotes = computed(() => notesStore.sortNotes(notesStore.getActiveNotesByLayer(), 'important'))
const filteredNotes = computed(() => {
  if (!searchQuery.value) return sortedNotes.value
  const query = searchQuery.value.toLowerCase()
  return sortedNotes.value.filter((note) => {
    return note.content.toLowerCase().includes(query) || note.title.toLowerCase().includes(query)
  })
})
const isCreateEnabled = computed(() => newNoteTitle.value.length > 0 || newNoteBody.value.length > 0)
const isEditEnabled = computed(() => editNoteTitle.value.length > 0 || editNoteBody.value.length > 0)
const customLayersCount = computed(() => notesStore.layers.filter(layer => !layer.isDefault).length)
const canCreateCustomLayer = computed(() => notesStore.canCreateCustomLayer())
const canSubmitLayer = computed(() => canCreateCustomLayer.value && newLayerName.value.length > 0)
const hasNoLayers = computed(() => notesStore.layers.length === 0)
const currentLang = computed(() => settingsStore.settings.language)
const t = (key: keyof typeof TRANSLATIONS.en): string => TRANSLATIONS[currentLang.value][key]
const CRITICALITY_OPTIONS = computed(() => [
  { value: 'low', label: t('criticalityLow') },
  { value: 'medium', label: t('criticalityMedium') },
  { value: 'high', label: t('criticalityHigh') },
] as const)
const activeLayerLabel = computed(() => {
  return notesStore.getLayerName(notesStore.activeLayerId) || t('noLayerSelected')
})

function openCreateModal(): void {
  if (hasNoLayers.value) {
    openLayerModal()
    return
  }
  closeSecondarySheets()
  newNoteTitle.value = ''
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
  editNoteTitle.value = note.title
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

function openSettingsModal(): void {
  closeSecondarySheets()
  isSettingsModalOpen.value = true
}

function closeSettingsModal(): void {
  isSettingsModalOpen.value = false
}

function closeUpdateModal(): void {
  if (isInstallingUpdate.value) return
  isUpdateModalOpen.value = false
}

function openLayerModal(): void {
  closeSecondarySheets()
  newLayerName.value = ''
  layerFormError.value = ''
  isLayerModalOpen.value = true
}

function closeLayerModal(): void {
  if (hasNoLayers.value) return
  layerFormError.value = ''
  isLayerModalOpen.value = false
}

function selectLayer(layerId: string): void {
  notesStore.setActiveLayer(layerId)
  isLayerModalOpen.value = false
}

function createLayer(): void {
  if (!canSubmitLayer.value) return
  const result = notesStore.createCustomLayer(newLayerName.value)
  if (!result.success) {
    layerFormError.value = mapLayerError(result.error)
    return
  }

  newLayerName.value = ''
  layerFormError.value = ''
}

function deleteLayer(layerId: string): void {
  const result = notesStore.deleteLayer(layerId)
  if (!result.success) {
    layerFormError.value = mapLayerDeleteError(result.error)
    return
  }
  layerFormError.value = ''
}

function mapLayerError(error?: string): string {
  if (!error) return t('customLayerCreateFailed')
  if (error.includes('Введите название слоя')) return t('layerNameRequired')
  if (error.includes('уже существует')) return t('layerNameExists')
  if (error.includes('Достигнут лимит')) return t('layerLimitReached')
  return t('customLayerCreateFailed')
}

function mapLayerDeleteError(error?: string): string {
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

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  if (bytes <= 0) return `0 ${units[0]}`
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const normalized = bytes / (1024 ** index)
  const fractionDigits = index === 0 ? 0 : 1
  return `${normalized.toFixed(fractionDigits)} ${units[index]}`
}

async function ensureUpdateProgressListener(): Promise<void> {
  if (unlistenUpdateProgress) return
  unlistenUpdateProgress = await listen<UpdateDownloadProgress>('update_download_progress', (event) => {
    const payload = event.payload
    updateTargetVersion.value = payload.version
    updateProgress.value = payload.progress === null ? null : Math.min(Math.max(payload.progress, 0), 100)
    if (payload.contentLength && payload.contentLength > 0) {
      updateDownloadedBytes.value = `${formatBytes(payload.downloaded)} / ${formatBytes(payload.contentLength)}`
    } else {
      updateDownloadedBytes.value = formatBytes(payload.downloaded)
    }
  })
}

async function checkAndInstallUpdate(): Promise<void> {
  if (isCheckingUpdates.value || isInstallingUpdate.value) return
  isUpdateModalOpen.value = true
  updateError.value = ''
  settingsUpdateMessage.value = t('updateChecking')
  settingsUpdateType.value = 'neutral'
  updateProgress.value = null
  updateDownloadedBytes.value = ''
  updateTargetVersion.value = ''
  updateStatus.value = t('updateChecking')
  isCheckingUpdates.value = true

  try {
    const result = await invoke<UpdateCheckResult>('check_for_updates')
    updateCurrentVersion.value = result.currentVersion
    if (!result.available || !result.targetVersion) {
      updateStatus.value = t('updateNotFound')
      settingsUpdateMessage.value = `${t('updateNotFound')} (${result.currentVersion})`
      settingsUpdateType.value = 'success'
      return
    }

    updateTargetVersion.value = result.targetVersion
    updateStatus.value = `${t('updateFound')}: ${result.targetVersion}`
    settingsUpdateMessage.value = `${t('updateFound')}: ${result.targetVersion}`
    settingsUpdateType.value = 'neutral'
    await ensureUpdateProgressListener()

    isInstallingUpdate.value = true
    updateStatus.value = t('updateDownloading')
    await invoke<void>('download_and_install_update')
    updateStatus.value = t('updateInstalling')
  } catch (error) {
    updateError.value = `${t('updateError')}: ${String(error)}`
    settingsUpdateMessage.value = updateError.value
    settingsUpdateType.value = 'error'
  } finally {
    isCheckingUpdates.value = false
    isInstallingUpdate.value = false
  }
}

async function loadAppVersion(): Promise<void> {
  try {
    const version = await getVersion()
    appVersion.value = version
    updateCurrentVersion.value = version
  } catch (error) {
    console.error('Не удалось получить версию приложения:', error)
    appVersion.value = ''
  }
}

function closeSecondarySheets(): void {
  isSearchModalOpen.value = false
  isSettingsModalOpen.value = false
  isLayerModalOpen.value = false
}

function createNote(): void {
  if (!isCreateEnabled.value) return
  const noteCriticality = selectedCreateCriticality.value || undefined

  notesStore.addNote({
    title: newNoteTitle.value || t('newNoteTitle'),
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
    title: editNoteTitle.value || t('newNoteTitle'),
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

function getNoteBackground(note: Note): string {
  if (note.criticality) {
    return NOTE_COLORS[note.criticality]
  }

  return note.backgroundColor || NOTE_COLORS.default
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

function switchView(view: 'notes' | 'vault'): void {
  activeView.value = view
}

onMounted(async () => {
  await Promise.all([settingsStore.init(), notesStore.init(), loadAppVersion()])

  if (hasNoLayers.value) {
    openLayerModal()
    return
  }
})

onBeforeUnmount(() => {
  if (!unlistenUpdateProgress) return
  void unlistenUpdateProgress()
  unlistenUpdateProgress = null
})
</script>

<template>
  <section :class="$style.notesView">
    <div v-if="activeView === 'notes'" :class="$style.canvas">
      <article
        v-for="note in filteredNotes"
        :key="note.id"
        :class="[$style.noteCard, { [$style.noteCardPinned]: note.isImportant }]"
        :style="{ backgroundColor: getNoteBackground(note) }"
        @click="openEditModal(note)"
      >
        <h3 :class="$style.noteTitle">{{ note.title }}</h3>
        <p :class="$style.noteContent">{{ note.content }}</p>

        <div :class="$style.noteActions">
          <button
            :class="[$style.cardAction, { [$style.cardActionActive]: note.isImportant }]"
            type="button"
            title="Закрепить"
            @click.stop="toggleImportant(note.id)"
          >
            <Heart :size="14" />
          </button>
          <button
            :class="$style.cardAction"
            type="button"
            title="Удалить"
            @click.stop="deleteNote(note.id)"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </article>
    </div>
    <VaultView
      v-else
      embedded
      :class="$style.embeddedVault"
      @close="switchView('notes')"
    />

    <transition v-if="activeView === 'notes'" name="sheet">
      <div v-if="isCreateModalOpen" :class="$style.modalOverlay">
        <div :class="$style.modalSheet">
          <button :class="$style.modalClose" type="button" title="Закрыть" @click="closeCreateModal">
            <X :size="18" />
          </button>

          <h2 :class="$style.modalTitle">{{ t('newNoteTitle') }}</h2>
          <input
            v-model.trim="newNoteTitle"
            :class="$style.modalInput"
            :placeholder="t('noteTitlePlaceholder')"
          />
          <textarea
            v-model.trim="newNoteBody"
            :class="$style.modalTextarea"
            :placeholder="t('noteBodyPlaceholder')"
            autofocus
          />
          <div :class="$style.criticalityPicker">
            <span :class="$style.criticalityLabel">{{ t('criticalityLabel') }}</span>
            <div
              :class="$style.criticalityOptions"
              role="radiogroup"
              :aria-label="t('criticalityLabel')"
            >
              <button
                v-for="option in CRITICALITY_OPTIONS"
                :key="option.value"
                type="button"
                :class="[
                  $style.criticalityOption,
                  {
                    [$style.criticalityOptionLow]: option.value === 'low',
                    [$style.criticalityOptionMedium]: option.value === 'medium',
                    [$style.criticalityOptionHigh]: option.value === 'high',
                  },
                  {
                    [$style.criticalityOptionActive]:
                      selectedCreateCriticality === option.value,
                  },
                ]"
                role="radio"
                :aria-checked="selectedCreateCriticality === option.value"
                @click="selectedCreateCriticality = option.value"
              >
                <span>{{ option.label }}</span>
              </button>
            </div>
          </div>

          <button
            :class="$style.modalCreateButton"
            type="button"
            :disabled="!isCreateEnabled"
            @click="createNote"
          >
            {{ t('createButton') }}
          </button>
        </div>
      </div>
    </transition>

    <transition v-if="activeView === 'notes'" name="top-sheet">
      <div v-if="isEditModalOpen" :class="$style.topModalOverlay">
        <div :class="[$style.modalSheet, $style.topModalSheet]">
          <button :class="$style.modalClose" type="button" title="Закрыть" @click="closeEditModal">
            <X :size="18" />
          </button>

          <h2 :class="$style.modalTitle">{{ t('editNoteTitle') }}</h2>
          <input
            v-model.trim="editNoteTitle"
            :class="$style.modalInput"
            :placeholder="t('noteTitlePlaceholder')"
          />
          <textarea
            v-model.trim="editNoteBody"
            :class="$style.modalTextarea"
            :placeholder="t('noteBodyPlaceholder')"
            autofocus
          />
          <div :class="$style.criticalityPicker">
            <span :class="$style.criticalityLabel">{{ t('criticalityLabel') }}</span>
            <div
              :class="$style.criticalityOptions"
              role="radiogroup"
              :aria-label="t('criticalityLabel')"
            >
              <button
                v-for="option in CRITICALITY_OPTIONS"
                :key="`edit-${option.value}`"
                type="button"
                :class="[
                  $style.criticalityOption,
                  {
                    [$style.criticalityOptionLow]: option.value === 'low',
                    [$style.criticalityOptionMedium]: option.value === 'medium',
                    [$style.criticalityOptionHigh]: option.value === 'high',
                  },
                  {
                    [$style.criticalityOptionActive]:
                      editNoteCriticality === option.value,
                  },
                ]"
                role="radio"
                :aria-checked="editNoteCriticality === option.value"
                @click="editNoteCriticality = option.value"
              >
                <span>{{ option.label }}</span>
              </button>
            </div>
          </div>

          <div :class="$style.editModalActions">
            <button
              :class="$style.modalDeleteButton"
              type="button"
              @click="deleteEditedNote"
            >
              {{ t('deleteButton') }}
            </button>
            <button
              :class="$style.modalSaveButton"
              type="button"
              :disabled="!isEditEnabled"
              @click="saveEditedNote"
            >
              {{ t('saveButton') }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition v-if="activeView === 'notes'" name="sheet">
      <div
        v-if="isDeleteConfirmModalOpen"
        :class="[$style.modalOverlay, $style.deleteConfirmOverlay]"
        @click.self="closeDeleteNoteConfirm"
      >
        <div :class="$style.modalSheet">
          <h2 :class="$style.modalTitle">{{ t('deleteConfirmTitle') }}</h2>
          <p :class="$style.confirmMessage">{{ t('deleteConfirmMessage') }}</p>
          <div :class="$style.confirmActions">
            <button :class="$style.modalCancelButton" type="button" @click="closeDeleteNoteConfirm">
              {{ t('cancelButton') }}
            </button>
            <button :class="$style.modalDeleteButton" type="button" @click="confirmDeleteNote">
              {{ t('deleteButton') }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition v-if="activeView === 'notes'" name="sheet">
      <div v-if="isSearchModalOpen" :class="$style.modalOverlay" @click.self="closeSearchModal">
        <div :class="[$style.modalSheet, $style.searchSheet]">
          <button :class="$style.modalClose" type="button" title="Закрыть" @click="closeSearchModal">
            <X :size="18" />
          </button>

          <h2 :class="$style.modalTitle">{{ t('searchTitle') }}</h2>
          <div :class="$style.searchField">
            <Search :size="16" />
            <input
              v-model.trim="searchQuery"
              :class="$style.searchInput"
              :placeholder="t('searchPlaceholder')"
              autofocus
            />
          </div>
        </div>
      </div>
    </transition>

    <transition v-if="activeView === 'notes'" name="sheet">
      <div v-if="isSettingsModalOpen" :class="$style.modalOverlay" @click.self="closeSettingsModal">
        <div :class="[$style.modalSheet, $style.settingsSheet]">
          <button :class="$style.modalClose" type="button" :title="t('close')" @click="closeSettingsModal">
            <X :size="18" />
          </button>

          <h2 :class="$style.modalTitle">{{ t('settingsTitle') }}</h2>
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
        </div>
      </div>
    </transition>

    <transition v-if="activeView === 'notes'" name="sheet">
      <div v-if="isUpdateModalOpen" :class="$style.modalOverlay" @click.self="closeUpdateModal">
        <div :class="[$style.modalSheet, $style.updateSheet]">
          <button
            :class="$style.modalClose"
            type="button"
            :title="t('close')"
            :disabled="isInstallingUpdate"
            @click="closeUpdateModal"
          >
            <X :size="18" />
          </button>

          <h2 :class="$style.modalTitle">{{ t('updateModalTitle') }}</h2>
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
        </div>
      </div>
    </transition>

    <transition v-if="activeView === 'notes'" name="sheet">
      <div v-if="isLayerModalOpen" :class="$style.modalOverlay" @click.self="closeLayerModal">
        <div :class="[$style.modalSheet, $style.layerSheet]">
          <button :class="$style.modalClose" type="button" title="Закрыть" @click="closeLayerModal">
            <X :size="18" />
          </button>

          <h2 :class="$style.modalTitle">{{ t('layersTitle') }}</h2>
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
        </div>
      </div>
    </transition>

    <nav :class="$style.viewDock">
      <button
        :class="[$style.viewButton, { [$style.viewButtonActive]: activeView === 'notes' }]"
        type="button"
        @click="switchView('notes')"
      >
        {{ t('notesViewTitle') }}
      </button>
      <button
        :class="[$style.viewButton, { [$style.viewButtonActive]: activeView === 'vault' }]"
        type="button"
        @click="switchView('vault')"
      >
        {{ t('vaultViewTitle') }}
      </button>
    </nav>

    <nav v-if="activeView === 'notes'" :class="$style.bottomDock">
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
        <Settings :size="20" />
      </button>
    </nav>
  </section>
</template>

<style lang="scss" module src="./NotesView.module.scss"></style>
