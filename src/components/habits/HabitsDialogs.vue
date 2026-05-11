<script setup lang="ts">
import { computed, inject, ref } from 'vue'
import SheetModal from '@/components/SheetModal.vue'
import ConfirmSheet from '@/components/common/ConfirmSheet.vue'
import SearchSheet from '@/components/common/SearchSheet.vue'
import ViewPickerSheet from '@/components/shell/ViewPickerSheet.vue'
import AppSettingsSheet from '@/components/shell/AppSettingsSheet.vue'
import AboutAppSheet from '@/components/shell/AboutAppSheet.vue'
import { useDataExport } from '@/composables/useDataExport'
import { useCanvasBackground } from '@/composables/useCanvasBackground'
import { useViewNavigation } from '@/composables/useViewNavigation'
import { useSettingsStore } from '@/stores'
import { TRANSLATIONS } from '@/translations/translations'
import { useShellOnlyStyles } from '@/composables/useShellOnlyStyles'
import { HABITS_TRACKER_KEY } from '@/components/habits/habitsInjection'
import UiButton from '@/components/ui/UiButton.vue'

const searchQuery = defineModel<string>('searchQuery', { required: true })

const injected = inject(HABITS_TRACKER_KEY)
if (!injected) {
  throw new Error('HabitsDialogs expects HABITS_TRACKER_KEY from HabitsWorkspace')
}
const tracker = injected

const settingsStore = useSettingsStore()
const githubUrl = 'https://github.com/yusheer0/flowmode'

const styles = useShellOnlyStyles()

const {
  activeView,
  openView,
  isViewPickerModalOpen,
  openViewPickerModal,
  closeViewPickerModal,
} = useViewNavigation()

const newHabitName = ref('')
const isCreateModalOpen = ref(false)
const isSearchModalOpen = ref(false)
const isSettingsModalOpen = ref(false)
const isAboutModalOpen = ref(false)
const isDeleteConfirmModalOpen = ref(false)
const pendingDeleteHabitId = ref<string | null>(null)

const { isExporting, exportAllData } = useDataExport()

const currentLang = computed(() => settingsStore.settings.language)
const t = (key: keyof typeof TRANSLATIONS.en): string => TRANSLATIONS[currentLang.value][key]
const canvasBackgroundInputId = 'habits-canvas-background-input'
const {
  hasCanvasBackground,
  applyCanvasBackgroundFromEvent,
  clearCanvasBackground,
} = useCanvasBackground(t)

function submitNewHabit(): void {
  if (!tracker.tryCreateHabit(newHabitName.value)) return
  closeCreateModal()
}

function openCreateModal(): void {
  newHabitName.value = ''
  isCreateModalOpen.value = true
}

function closeCreateModal(): void {
  isCreateModalOpen.value = false
  newHabitName.value = ''
}

function openSearchModal(): void {
  isSearchModalOpen.value = true
}

function closeSearchModal(): void {
  isSearchModalOpen.value = false
}

function updateSearchQuery(value: string): void {
  searchQuery.value = value
}

function openSettingsModal(): void {
  isSettingsModalOpen.value = true
}

function closeSettingsModal(): void {
  isSettingsModalOpen.value = false
}

function openAboutModal(): void {
  isAboutModalOpen.value = true
}

function closeAboutModal(): void {
  isAboutModalOpen.value = false
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

function promptDeleteHabit(habitId: string): void {
  pendingDeleteHabitId.value = habitId
  isDeleteConfirmModalOpen.value = true
}

function closeDeleteConfirm(): void {
  isDeleteConfirmModalOpen.value = false
  pendingDeleteHabitId.value = null
}

function confirmDeleteHabit(): void {
  if (!pendingDeleteHabitId.value) return
  tracker.deleteHabit(pendingDeleteHabitId.value)
  closeDeleteConfirm()
}

defineExpose({
  openCreateModal,
  promptDeleteHabit,
  openSearchModal,
  openSettingsModal,
  openAboutModal,
  openViewPickerModal,
  isSearchModalOpen,
  isSettingsModalOpen,
  isAboutModalOpen,
  isCreateModalOpen,
  isViewPickerModalOpen,
})
</script>

<template>
  <SheetModal
    :is-open="isCreateModalOpen"
    :overlay-class="styles.modalOverlay"
    :sheet-class="styles.modalSheet"
    :close-button-class="styles.modalClose"
    :title-class="styles.modalTitle"
    :title="t('habitsHeaderTitle')"
    :close-title="t('close')"
    @close="closeCreateModal"
  >
    <form :class="styles.modalContent" @submit.prevent="submitNewHabit">
      <input
        v-model.trim="newHabitName"
        :class="styles.modalInput"
        :placeholder="t('habitsAddPlaceholder')"
      />
      <UiButton
        type="submit"
        variant="cta"
        :class="styles.modalCreateButton"
        :disabled="newHabitName.length === 0"
      >
        {{ t('habitsAddButton') }}
      </UiButton>
    </form>
  </SheetModal>

  <ConfirmSheet
    :is-open="isDeleteConfirmModalOpen"
    :title="t('deleteConfirmTitle')"
    :message="t('habitsDeleteTitle')"
    :cancel-label="t('cancelButton')"
    :confirm-label="t('deleteButton')"
    @close="closeDeleteConfirm"
    @cancel="closeDeleteConfirm"
    @confirm="confirmDeleteHabit"
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
  />

  <AboutAppSheet
    :is-open="isAboutModalOpen"
    :labels="{
      aboutTitle: t('aboutTitle'),
      close: t('close'),
      aboutDescription: t('aboutDescription'),
      aboutGithubButton: t('aboutGithubButton'),
    }"
    :github-url="githubUrl"
    @close="closeAboutModal"
  />

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
