<template>
  <section :class="$style.vaultView">
    <div v-if="vaultStore.error" :class="$style.errorBanner">
      {{ vaultStore.error }}
    </div>

    <div :class="$style.canvas">
      <div :class="$style.listPane">
        <article
          v-for="item in filteredItems"
          :key="item.id"
          :class="$style.card"
          @click="openEditModal(item)"
        >
          <h3 :class="$style.cardTitle">{{ item.title }}</h3>
          <p :class="$style.cardText">
            <strong>{{ t('loginLabel') }}:</strong> {{ item.username }}
          </p>
          <p :class="$style.cardText">
            <strong>{{ t('passwordLabel') }}:</strong> {{ item.passwordMasked }}
          </p>
          <p v-if="item.url" :class="$style.cardText">
            <strong>URL:</strong> {{ item.url }}
          </p>
          <div :class="$style.actions">
            <button
              :class="$style.cardAction"
              type="button"
              :title="t('delete')"
              @click.stop="requestDelete(item.id)"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </article>
        <p v-if="!filteredItems.length" :class="$style.emptyState">
          {{ t('emptyState') }}
        </p>
      </div>
    </div>

    <SheetModal
      :is-open="isFormModalOpen"
      :transition-name="isEditing ? 'top-sheet' : 'sheet'"
      :overlay-class="isEditing ? $style.topModalOverlay : $style.modalOverlay"
      :sheet-class="isEditing ? [$style.modalSheet, $style.topModalSheet] : $style.modalSheet"
      :close-button-class="$style.modalClose"
      :title-class="$style.modalTitle"
      :title="isEditing ? t('editTitle') : t('createTitle')"
      :close-title="t('close')"
      :close-on-overlay="false"
      @close="closeFormModal"
    >
      <input v-model.trim="form.title" :class="$style.modalInput" :placeholder="t('titlePlaceholder')" />
      <input v-model.trim="form.username" :class="$style.modalInput" :placeholder="t('usernamePlaceholder')" />
      <input v-model="form.password" :class="$style.modalInput" :placeholder="t('passwordPlaceholder')" />
      <input v-model.trim="form.url" :class="$style.modalInput" :placeholder="t('urlPlaceholder')" />

      <div :class="$style.modalActions">
        <button :class="$style.modalCancelButton" type="button" @click="closeFormModal">{{ t('cancel') }}</button>
        <button :class="$style.modalSaveButton" type="button" @click="saveForm">{{ t('save') }}</button>
      </div>
    </SheetModal>

    <SheetModal
      :is-open="isDeleteConfirmModalOpen"
      :overlay-class="[$style.modalOverlay, $style.deleteConfirmOverlay]"
      :sheet-class="$style.modalSheet"
      :title-class="$style.modalTitle"
      :title="t('deleteConfirmTitle')"
      :show-close="false"
      @close="closeDeleteConfirmModal"
    >
      <p :class="$style.confirmMessage">{{ t('deleteConfirmDescription') }}</p>
      <div :class="$style.confirmActions">
        <button :class="$style.modalCancelButton" type="button" @click="closeDeleteConfirmModal">
          {{ t('cancel') }}
        </button>
        <button :class="$style.modalDeleteButton" type="button" @click="confirmDelete">
          {{ t('delete') }}
        </button>
      </div>
    </SheetModal>

    <SheetModal
      :is-open="isSearchModalOpen"
      :overlay-class="$style.modalOverlay"
      :sheet-class="[$style.modalSheet, $style.searchSheet]"
      :close-button-class="$style.modalClose"
      :title-class="$style.modalTitle"
      :title="t('searchTitle')"
      :close-title="t('close')"
      @close="closeSearchModal"
    >
      <div :class="$style.searchField">
        <Search :size="16" />
        <input
          v-model.trim="searchQuery"
          :class="$style.searchInput"
          :placeholder="t('searchPlaceholder')"
          autofocus
        />
      </div>
    </SheetModal>

    <nav :class="$style.bottomDock">
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
import { computed, onMounted, ref } from 'vue'
import { Search, SquarePlus, Trash2 } from 'lucide-vue-next'
import SheetModal from '@/components/SheetModal.vue'
import { useSettingsStore, useVaultStore } from '@/stores'
import type { VaultItem, VaultItemInput } from '@/types'

const vaultStore = useVaultStore()
const settingsStore = useSettingsStore()

const searchQuery = ref('')
const isFormModalOpen = ref(false)
const isSearchModalOpen = ref(false)
const isDeleteConfirmModalOpen = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const pendingDeleteItemId = ref<string | null>(null)
const form = ref({
  title: '',
  username: '',
  password: '',
  url: '',
})

const TRANSLATIONS = {
  ru: {
    vaultTitle: 'Password Vault',
    searchTitle: 'Поиск',
    searchPlaceholder: 'Поиск по vault...',
    createEntry: 'Новая запись',
    loginLabel: 'Логин',
    passwordLabel: 'Пароль',
    reveal: 'Показать',
    copyLogin: 'Коп. логин',
    copyPassword: 'Коп. пароль',
    edit: 'Изменить',
    delete: 'Удалить',
    emptyState: 'Записей не найдено',
    createTitle: 'Добавить запись',
    editTitle: 'Редактировать запись',
    titlePlaceholder: 'Название',
    usernamePlaceholder: 'Логин',
    passwordPlaceholder: 'Пароль',
    urlPlaceholder: 'URL (опционально)',
    cancel: 'Отмена',
    save: 'Сохранить',
    revealTitle: 'Временный показ пароля',
    revealHint: 'Пароль хранится в памяти временно и автоматически скрывается.',
    close: 'Закрыть',
    created: 'Создано',
    updated: 'Обновлено',
    deleted: 'Удалено',
    revealed: 'Пароль показан',
    copied_login: 'Скопирован логин',
    copied_password: 'Скопирован пароль',
    deleteConfirmTitle: 'Подтвердите удаление',
    deleteConfirmDescription: 'Запись будет удалена из vault без возможности восстановления.',
  },
  en: {
    vaultTitle: 'Password Vault',
    searchTitle: 'Search',
    searchPlaceholder: 'Search vault...',
    createEntry: 'New entry',
    loginLabel: 'Login',
    passwordLabel: 'Password',
    reveal: 'Reveal',
    copyLogin: 'Copy login',
    copyPassword: 'Copy password',
    edit: 'Edit',
    delete: 'Delete',
    emptyState: 'No records found',
    createTitle: 'Create record',
    editTitle: 'Edit record',
    titlePlaceholder: 'Title',
    usernamePlaceholder: 'Username',
    passwordPlaceholder: 'Password',
    urlPlaceholder: 'URL (optional)',
    cancel: 'Cancel',
    save: 'Save',
    revealTitle: 'Temporary password reveal',
    revealHint: 'Password is cached in memory for a short time and then hidden.',
    close: 'Close',
    created: 'Created',
    updated: 'Updated',
    deleted: 'Deleted',
    revealed: 'Password revealed',
    copied_login: 'Login copied',
    copied_password: 'Password copied',
    deleteConfirmTitle: 'Confirm deletion',
    deleteConfirmDescription: 'This record will be permanently deleted from vault.',
  },
} as const

const currentLang = computed(() => settingsStore.settings.language)
const t = (key: keyof typeof TRANSLATIONS.en): string => TRANSLATIONS[currentLang.value][key]

function normalizeSearchValue(value: unknown): string {
  return typeof value === 'string' ? value.toLowerCase() : ''
}

const filteredItems = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return vaultStore.items.filter((item) => {
    const title = normalizeSearchValue(item.title)
    const username = normalizeSearchValue(item.username)
    const service = normalizeSearchValue(item.service)
    const url = normalizeSearchValue(item.url)
    const textPass = !query
      || title.includes(query)
      || username.includes(query)
      || service.includes(query)
      || url.includes(query)
    return textPass
  })
})

function toPayload(): VaultItemInput {
  return {
    title: form.value.title,
    service: form.value.title,
    username: form.value.username,
    password: form.value.password,
    url: form.value.url,
    notes: '',
    tags: [],
  }
}

function resetForm(): void {
  form.value = {
    title: '',
    username: '',
    password: '',
    url: '',
  }
  editingId.value = null
  isEditing.value = false
}

function openCreateModal(): void {
  resetForm()
  isFormModalOpen.value = true
}

function openEditModal(item: VaultItem): void {
  form.value = {
    title: item.title,
    username: item.username,
    password: '',
    url: item.url || '',
  }
  isEditing.value = true
  editingId.value = item.id
  isFormModalOpen.value = true
}

function closeFormModal(): void {
  isFormModalOpen.value = false
  resetForm()
}

async function saveForm(): Promise<void> {
  const payload = toPayload()
  if (isEditing.value && editingId.value) {
    if (!payload.password) {
      const existing = await vaultStore.revealPassword(editingId.value)
      payload.password = existing || ''
    }
    const success = await vaultStore.updateItem(editingId.value, payload)
    if (success) {
      closeFormModal()
    }
    return
  }

  const success = await vaultStore.createItem(payload)
  if (success) {
    closeFormModal()
  }
}

function openSearchModal(): void {
  isSearchModalOpen.value = true
}

function closeSearchModal(): void {
  isSearchModalOpen.value = false
}

function toggleSearchModal(): void {
  if (isSearchModalOpen.value) {
    closeSearchModal()
    return
  }
  openSearchModal()
}

async function requestDelete(itemId: string): Promise<void> {
  pendingDeleteItemId.value = itemId
  isDeleteConfirmModalOpen.value = true
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
})
</script>

<style lang="scss" module src="./VaultView.module.scss"></style>
