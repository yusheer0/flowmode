<script setup lang="ts">
import { computed, nextTick, provide, ref } from 'vue'
import ConfirmSheet from '@/components/common/ConfirmSheet.vue'
import SearchSheet from '@/components/common/SearchSheet.vue'
import NoteFormSheet from '@/components/notes/NoteFormSheet.vue'
import { useNotesSheets } from '@/composables/useNotesSheets'
import { useNotesStore, useSettingsStore } from '@/stores'
import type { Note, NoteCriticalitySelection } from '@/types'
import { useAppUpdater } from '@/composables/useAppUpdater'
import { useDataExport } from '@/composables/useDataExport'
import { useCanvasBackground } from '@/composables/useCanvasBackground'
import { TRANSLATIONS } from '@/translations/translations'
import { NOTE_COLORS } from '@/utils/noteVisuals'
import { useMergedShellStyles } from '@/composables/useMergedShellStyles'
import { useViewNavigation } from '@/composables/useViewNavigation'
import ViewPickerSheet from '@/components/shell/ViewPickerSheet.vue'
import AppSettingsSheet from '@/components/shell/AppSettingsSheet.vue'
import AboutAppSheet from '@/components/shell/AboutAppSheet.vue'
import AppUpdateSheet from '@/components/shell/AppUpdateSheet.vue'
import NotesLayersSheet from '@/components/notes/NotesLayersSheet.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { NOTES_SHEETS_KEY } from '@/components/notes/notesInjection'

const searchQuery = defineModel<string>('searchQuery', { required: true })

const notesStore = useNotesStore()
const settingsStore = useSettingsStore()

const sheets = useNotesSheets()
provide(NOTES_SHEETS_KEY, sheets)

const {
  activeView,
  openView,
  isViewPickerModalOpen,
  openViewPickerModal,
  closeViewPickerModal,
} = useViewNavigation()

const {
  isSearchModalOpen,
  isSettingsModalOpen,
  isAboutModalOpen,
  closeSecondarySheets,
  openSettingsModal,
  closeSettingsModal,
  openAboutModal,
  closeAboutModal,
  openSearchModal,
  closeSearchModal,
} = sheets

const isCreateModalOpen = ref(false)
const newNoteBody = ref('')
const selectedCreateCriticality = ref<NoteCriticalitySelection>('')
const isEditModalOpen = ref(false)
const editNoteId = ref<string | null>(null)
const editNoteBody = ref('')
const editNoteCriticality = ref<NoteCriticalitySelection>('')
const isDeleteConfirmModalOpen = ref(false)
const pendingDeleteNoteId = ref<string | null>(null)
const pendingDeleteFromEditModal = ref(false)
const githubUrl = 'https://github.com/yusheer0/flowmode'

const currentLang = computed(() => settingsStore.settings.language)
const t = (key: keyof typeof TRANSLATIONS.en): string => TRANSLATIONS[currentLang.value][key]
const translateForUpdater = (key: string): string => t(key as keyof typeof TRANSLATIONS.en)
const canvasBackgroundInputId = 'notes-canvas-background-input'
const {
  hasCanvasBackground,
  applyCanvasBackgroundFromEvent,
  clearCanvasBackground,
} = useCanvasBackground(t)

const CRITICALITY_OPTIONS = computed(() => [
  { value: 'low', label: t('criticalityLow') },
  { value: 'medium', label: t('criticalityMedium') },
  { value: 'high', label: t('criticalityHigh') },
] as const)

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
const { isExporting, exportAllData } = useDataExport()

const layersRef = ref<InstanceType<typeof NotesLayersSheet> | null>(null)

/** Shell + NotesDialogs.module (update-inline row in settings sheet). */
const dlgStyles = useMergedShellStyles()

const isCreateEnabled = computed(() => newNoteBody.value.length > 0)
const isEditEnabled = computed(() => editNoteBody.value.length > 0)

function closeCreateModal(): void {
  isCreateModalOpen.value = false
}

function openCreateFlow(): void {
  if (notesStore.layers.length === 0) {
    layersRef.value?.openLayerModal()
    return
  }
  closeSecondarySheets()
  newNoteBody.value = ''
  selectedCreateCriticality.value = ''
  isCreateModalOpen.value = true
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

async function handleExportData(): Promise<void> {
  const result = await exportAllData()
  if (result.status === 'success') {
    window.alert(`${t('exportDataSuccess')}.\n${result.path}`)
    return
  }
  if (result.status === 'error') {
    window.alert(t('exportDataError'))
  }
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

function promptDeleteNote(noteId: string): void {
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

function updateCreateCriticality(value: NoteCriticalitySelection): void {
  selectedCreateCriticality.value = value
}

function updateEditBody(value: string): void {
  editNoteBody.value = value
}

function updateEditCriticality(value: NoteCriticalitySelection): void {
  editNoteCriticality.value = value
}

function openLayers(): void {
  layersRef.value?.openLayerModal()
}

async function bootstrapPostInit(): Promise<void> {
  await loadAppVersion()
  await nextTick()
  if (notesStore.layers.length === 0) {
    layersRef.value?.openLayerModal()
  }
}

defineExpose({
  bootstrapPostInit,
  openCreateFlow,
  openEditModal,
  promptDeleteNote,
  openSearchModal,
  openSettingsModal,
  openAboutModal,
  openViewPickerModal,
  closeViewPickerModal,
  openLayers,
  selectAppView: openView,
  isSearchModalOpen: sheets.isSearchModalOpen,
  isSettingsModalOpen: sheets.isSettingsModalOpen,
  isAboutModalOpen: sheets.isAboutModalOpen,
  isViewPickerModalOpen,
  isLayerSheetOpen: sheets.isLayerModalOpen,
})
</script>

<template>
  <NoteFormSheet
    :is-open="isCreateModalOpen"
    :is-edit="false"
    :body="newNoteBody"
    :criticality="selectedCreateCriticality"
    :is-submit-enabled="isCreateEnabled"
    :options="CRITICALITY_OPTIONS"
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
    @close="closeDeleteNoteConfirm"
    @cancel="closeDeleteNoteConfirm"
    @confirm="confirmDeleteNote"
  />

  <SearchSheet
    :is-open="isSearchModalOpen"
    :title="t('searchTitle')"
    :close-title="t('close')"
    :clear-title="t('searchClearTitle')"
    :placeholder="t('searchPlaceholder')"
    :model-value="searchQuery"
    @close="closeSearchModal"
    @update:model-value="updateSearchQuery"
  />

  <AppSettingsSheet
    :is-open="isSettingsModalOpen"
    :labels="{
      settingsTitle: t('settingsTitle'),
      close: t('close'),
      languageSetting: t('languageSetting'),
      themeSetting: t('themeSetting'),
      themeLight: t('themeLight'),
      themeDark: t('themeDark'),
      canvasBackgroundSetting: t('canvasBackgroundSetting'),
      canvasBackgroundUploadButton: t('canvasBackgroundUploadButton'),
      canvasBackgroundResetButton: t('canvasBackgroundResetButton'),
      canvasBackgroundApplied: t('canvasBackgroundApplied'),
      exportDataSetting: t('exportDataSetting'),
      exportDataButton: t('exportDataButton'),
    }"
    :canvas-background-input-id="canvasBackgroundInputId"
    :has-canvas-background="hasCanvasBackground"
    :is-exporting="isExporting"
    :apply-canvas-background-from-event="applyCanvasBackgroundFromEvent"
    :clear-canvas-background="clearCanvasBackground"
    @close="closeSettingsModal"
    @export-request="handleExportData"
  >
    <template #afterExport>
      <div :class="dlgStyles.settingsGroup">
        <span :class="dlgStyles.settingsLabel">{{ t('updateSetting') }}</span>
        <UiButton
          variant="plain"
          type="button"
          :class="dlgStyles.updateButton"
          :disabled="isCheckingUpdates || isInstallingUpdate"
          @click="checkAndInstallUpdate"
        >
          {{ t('updateNowButton') }}
        </UiButton>
        <p
          v-if="settingsUpdateMessage"
          :class="[
            dlgStyles.updateInlineStatus,
            {
              [dlgStyles.updateInlineStatusSuccess]: settingsUpdateType === 'success',
              [dlgStyles.updateInlineStatusError]: settingsUpdateType === 'error',
            },
          ]"
        >
          {{ settingsUpdateMessage }}
        </p>
      </div>
    </template>
  </AppSettingsSheet>

  <AboutAppSheet
    :is-open="isAboutModalOpen"
    :labels="{
      aboutTitle: t('aboutTitle'),
      close: t('close'),
      aboutDescription: t('aboutDescription'),
      aboutGithubButton: t('aboutGithubButton'),
    }"
    :github-url="githubUrl"
    :version-line="`${t('aboutVersionLabel')}: ${appVersion || '—'}`"
    @close="closeAboutModal"
  />

  <AppUpdateSheet
    :is-open="isUpdateModalOpen"
    :close-disabled="isInstallingUpdate"
    :labels="{
      modalTitle: t('updateModalTitle'),
      close: t('close'),
      updateCurrentVersion: t('updateCurrentVersion'),
      updateTargetVersion: t('updateTargetVersion'),
      updateRestartHint: t('updateRestartHint'),
      updateDownloadProgress: t('updateDownloadProgress'),
    }"
    :update-status="updateStatus"
    :update-error="updateError"
    :update-current-version="updateCurrentVersion"
    :update-target-version="updateTargetVersion"
    :update-progress="updateProgress"
    :update-downloaded-bytes="updateDownloadedBytes ?? undefined"
    @close="closeUpdateModal"
  />

  <NotesLayersSheet ref="layersRef" />

  <ViewPickerSheet
    :is-open="isViewPickerModalOpen"
    :active-view="activeView"
    :labels="{
      title: t('view'),
      closeTitle: t('close'),
      notesViewTitle: t('notesViewTitle'),
      vaultViewTitle: t('vaultViewTitle'),
      habitsViewTitle: t('habitsViewTitle'),
    }"
    @close="closeViewPickerModal"
    @select="openView"
  />
</template>

<style lang="scss" module src="./NotesDialogs.module.scss"></style>
