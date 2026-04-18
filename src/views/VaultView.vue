<template>
  <section :class="$style.vaultView">
    <div ref="scrollHost" :class="$style.canvas" @scroll="onListScroll">
      <div :class="$style.virtualSpacer" :style="{ height: `${topSpacerHeight}px` }"></div>
      <div :class="$style.listPane">
        <VaultItemCard
          v-for="item in visibleItems"
          :key="item.id"
          :item="item"
          :styles="$style"
          :login-label="t('loginLabel')"
          :password-label="t('passwordLabel')"
          :delete-title="t('delete')"
          @edit="openEditModal"
          @delete="requestDelete"
        />
        <p v-if="!filteredItems.length" :class="$style.emptyState">
          {{ t('emptyState') }}
        </p>
      </div>
      <div :class="$style.virtualSpacer" :style="{ height: `${bottomSpacerHeight}px` }"></div>
    </div>

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
      :styles="$style"
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
      :styles="$style"
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
      :styles="$style"
      @close="closeSearchModal"
      @update:model-value="updateSearchQuery"
    />

    <nav :class="$style.bottomDock">
      <button
        v-if="embedded"
        :class="$style.dockButton"
        type="button"
        :title="t('notesViewTitle')"
        @click="emit('close')"
      >
        <ArrowLeft :size="20" />
      </button>
      <button :class="$style.dockButton" type="button" :title="t('createEntry')" @click="openCreateModal">
        <SquarePlus :size="20" />
      </button>
      <button
        :class="[$style.dockButton, { [$style.dockButtonActive]: isSearchModalOpen }]"
        type="button"
        :title="t('searchTitle')"
        @click="toggleSearchModal"
      >
        <Search :size="20" />
      </button>
    </nav>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowLeft, Search, SquarePlus } from 'lucide-vue-next'
import ConfirmSheet from '@/components/common/ConfirmSheet.vue'
import SearchSheet from '@/components/common/SearchSheet.vue'
import VaultEntrySheet from '@/components/vault/VaultEntrySheet.vue'
import VaultItemCard from '@/components/vault/VaultItemCard.vue'
import { useCopyFeedback } from '@/composables/useCopyFeedback'
import { useVaultEntryForm } from '@/composables/useVaultEntryForm'
import { useVaultListFilter } from '@/composables/useVaultListFilter'
import { useSettingsStore, useVaultStore } from '@/stores'
import { TRANSLATIONS } from '@/translations/translations'
import type { VaultItem } from '@/types'
import { normalizeUrl } from '@/utils/vault'

withDefaults(defineProps<{ embedded?: boolean }>(), {
  embedded: false,
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const vaultStore = useVaultStore()
const settingsStore = useSettingsStore()

const searchQuery = ref('')
const isSearchModalOpen = ref(false)
const isDeleteConfirmModalOpen = ref(false)
const pendingDeleteItemId = ref<string | null>(null)
const scrollHost = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(0)

const ESTIMATED_CARD_HEIGHT = 186
const CARD_GAP = 12
const OVERSCAN_ROWS = 3

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
const { filteredItems } = useVaultListFilter(computed(() => vaultStore.items), searchQuery)
const columnCount = computed(() => 3)
const rowStride = computed(() => ESTIMATED_CARD_HEIGHT + CARD_GAP)
const totalRows = computed(() => Math.ceil(filteredItems.value.length / columnCount.value))
const startRow = computed(() => Math.max(0, Math.floor(scrollTop.value / rowStride.value) - OVERSCAN_ROWS))
const visibleRowCount = computed(() => {
  const base = Math.ceil(viewportHeight.value / rowStride.value)
  return Math.max(1, base + OVERSCAN_ROWS * 2)
})
const endRow = computed(() => Math.min(totalRows.value, startRow.value + visibleRowCount.value))
const startIndex = computed(() => startRow.value * columnCount.value)
const endIndex = computed(() => Math.min(filteredItems.value.length, endRow.value * columnCount.value))
const visibleItems = computed(() => filteredItems.value.slice(startIndex.value, endIndex.value))
const topSpacerHeight = computed(() => startRow.value * rowStride.value)
const bottomSpacerHeight = computed(() => Math.max(0, (totalRows.value - endRow.value) * rowStride.value))

const currentLang = computed(() => settingsStore.settings.language)
const t = (key: keyof typeof TRANSLATIONS.en): string => TRANSLATIONS[currentLang.value][key]
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

function syncViewportMetrics(): void {
  if (!scrollHost.value) return
  viewportHeight.value = scrollHost.value.clientHeight
}

function onListScroll(event: Event): void {
  const target = event.target as HTMLElement
  scrollTop.value = target.scrollTop
}

function toggleSearchModal(): void {
  if (isSearchModalOpen.value) {
    closeSearchModal()
    return
  }
  openSearchModal()
}

function requestDelete(itemId: string): void {
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

function openUrl(url?: string): void {
  if (!url) return
  const normalized = normalizeUrl(url.trim())
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

onMounted(async () => {
  await vaultStore.refreshItems()
  syncViewportMetrics()
  window.addEventListener('resize', syncViewportMetrics)
})

onBeforeUnmount(() => {
  cleanup()
  clearTimers()
  window.removeEventListener('resize', syncViewportMetrics)
})
</script>

<style lang="scss" module src="./VaultView.module.scss"></style>
