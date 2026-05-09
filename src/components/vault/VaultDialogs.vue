<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import ConfirmSheet from '@/components/common/ConfirmSheet.vue'
import SearchSheet from '@/components/common/SearchSheet.vue'
import VaultEntrySheet from '@/components/vault/VaultEntrySheet.vue'
import ViewPickerSheet from '@/components/shell/ViewPickerSheet.vue'
import AppSettingsSheet from '@/components/shell/AppSettingsSheet.vue'
import AboutAppSheet from '@/components/shell/AboutAppSheet.vue'
import { useVaultEntryForm } from '@/composables/useVaultEntryForm'
import { useCopyFeedback } from '@/composables/useCopyFeedback'
import { useDataExport } from '@/composables/useDataExport'
import { useCanvasBackground } from '@/composables/useCanvasBackground'
import { useViewNavigation } from '@/composables/useViewNavigation'
import { useSettingsStore, useVaultStore } from '@/stores'
import { TRANSLATIONS } from '@/translations/translations'
import type { VaultItem } from '@/types'
import { normalizeUrl } from '@/utils/vault'

const searchQuery = defineModel<string>('searchQuery', { required: true })

const vaultStore = useVaultStore()
const settingsStore = useSettingsStore()
const githubUrl = 'https://github.com/yusheer0/flowmode'

const isSearchModalOpen = ref(false)
const isSettingsModalOpen = ref(false)
const isAboutModalOpen = ref(false)
const isDeleteConfirmModalOpen = ref(false)
const pendingDeleteItemId = ref<string | null>(null)

const {
  activeView,
  openView,
  isViewPickerModalOpen,
  openViewPickerModal,
  closeViewPickerModal,
} = useViewNavigation()

const {
  form,
  isFormModalOpen,
  isEditing,
  editingId,
  isPasswordVisible,
  editPasswordMask,
  canSaveForm,
  openCreateModal: openCreateEntryModal,
  openEditModal: openEditEntryModal,
  closeFormModal,
  togglePasswordVisibility,
  handlePasswordInput,
  saveForm,
  cleanup,
} = useVaultEntryForm(vaultStore)

const { isLoginCopied, isPasswordCopied, activate, resetState, clearTimers } = useCopyFeedback()
const { isExporting, exportAllData } = useDataExport()

const currentLang = computed(() => settingsStore.settings.language)
const t = (key: keyof typeof TRANSLATIONS.en): string => TRANSLATIONS[currentLang.value][key]
const canvasBackgroundInputId = 'vault-canvas-background-input'
const {
  hasCanvasBackground,
  applyCanvasBackgroundFromEvent,
  clearCanvasBackground,
} = useCanvasBackground(t)

const entryLabels = computed(() => ({
  createTitle: t('createTitle'),
  editTitle: t('editTitle'),
  close: t('close'),
  titlePlaceholder: t('titlePlaceholder'),
  usernamePlaceholder: t('usernamePlaceholder'),
  passwordPlaceholder: t('passwordPlaceholder'),
  urlPlaceholder: t('urlPlaceholder'),
  copy: t('copy'),
  copied: t('copied'),
  hide: t('hide'),
  reveal: t('reveal'),
  goToUrl: t('goToUrl'),
  save: t('save'),
}))

function openCreateModal(): void {
  resetState()
  openCreateEntryModal()
}

function openEditModal(item: VaultItem): void {
  resetState()
  openEditEntryModal(item)
}

function openSearchModal(): void {
  isSearchModalOpen.value = true
}

function closeSearchModal(): void {
  isSearchModalOpen.value = false
}

function updateSearchQuery(value: string): void {
  searchQuery.value = value.trim()
}

function toggleSearchModal(): void {
  if (isSearchModalOpen.value) {
    closeSearchModal()
    return
  }
  openSearchModal()
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

function promptDeleteItem(itemId: string): void {
  pendingDeleteItemId.value = itemId
  isDeleteConfirmModalOpen.value = true
}

async function copyLogin(itemId: string): Promise<void> {
  const copied = await vaultStore.copyUsername(itemId)
  if (copied) {
    activate('login')
  }
}

async function copyPassword(itemId: string): Promise<void> {
  const copied = await vaultStore.copyPassword(itemId)
  if (copied) {
    activate('password')
  }
}

async function copyEditingLogin(): Promise<void> {
  if (!editingId.value) return
  await copyLogin(editingId.value)
}

async function copyEditingPassword(): Promise<void> {
  if (!editingId.value) return
  await copyPassword(editingId.value)
}

function openUrl(raw?: string): void {
  if (!raw) return
  const normalized = normalizeUrl(raw.trim())
  if (!normalized) return
  window.open(normalized, '_blank', 'noopener,noreferrer')
}

function closeDeleteConfirmModal(): void {
  isDeleteConfirmModalOpen.value = false
  pendingDeleteItemId.value = null
}

async function confirmDelete(): Promise<void> {
  if (!pendingDeleteItemId.value) return
  await vaultStore.deleteItem(pendingDeleteItemId.value)
  closeDeleteConfirmModal()
}

onBeforeUnmount(() => {
  cleanup()
  clearTimers()
})

defineExpose({
  openCreateModal,
  openEditModal,
  promptDeleteItem,
  openSearchModal,
  toggleSearchModal,
  openSettingsModal,
  openAboutModal,
  openViewPickerModal,
  isSearchModalOpen,
  isSettingsModalOpen,
  isAboutModalOpen,
  isViewPickerModalOpen,
})
</script>

<template>
  <VaultEntrySheet
    :is-open="isFormModalOpen"
    :is-editing="isEditing"
    :title-value="form.title"
    :username-value="form.username"
    :password-value="form.password"
    :url-value="form.url"
    :is-password-visible="isPasswordVisible"
    :edit-password-mask="editPasswordMask"
    :is-login-copied="isLoginCopied"
    :is-password-copied="isPasswordCopied"
    :can-save="canSaveForm"
    :labels="entryLabels"
    @close="closeFormModal"
    @save="saveForm"
    @update:title="(value) => (form.title = value)"
    @update:username="(value) => (form.username = value)"
    @update:password="(value) => (form.password = value)"
    @update:url="(value) => (form.url = value)"
    @password-input="handlePasswordInput"
    @toggle-password="togglePasswordVisibility"
    @copy-login="copyEditingLogin"
    @copy-password="copyEditingPassword"
    @open-url="openUrl"
  />

  <ConfirmSheet
    :is-open="isDeleteConfirmModalOpen"
    :title="t('deleteConfirmTitle')"
    :message="t('deleteConfirmDescription')"
    :cancel-label="t('cancel')"
    :confirm-label="t('delete')"
    @close="closeDeleteConfirmModal"
    @cancel="closeDeleteConfirmModal"
    @confirm="confirmDelete"
  />

  <SearchSheet
    :is-open="isSearchModalOpen"
    :title="t('searchTitle')"
    :close-title="t('close')"
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
