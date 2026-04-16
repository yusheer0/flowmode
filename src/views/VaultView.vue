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
        >
          <h3 :class="$style.cardTitle">{{ item.title }}</h3>
          <p :class="[$style.cardText, $style.cardInfoRow]">
            <span :class="$style.cardInfoValue">
              <strong>{{ t('loginLabel') }}:</strong> {{ item.username }}
            </span>
            <button
              :class="$style.inlineAction"
              type="button"
              :title="t('copyLogin')"
              @click.stop="copyUsername(item.id)"
            >
              <Copy :size="14" />
            </button>
          </p>
          <p :class="[$style.cardText, $style.cardInfoRow]">
            <span :class="$style.cardInfoValue">
              <strong>{{ t('passwordLabel') }}:</strong> {{ getMaskedPassword(item.id, item.passwordMasked) }}
            </span>
            <button
              :class="$style.inlineAction"
              type="button"
              :title="t('copyPassword')"
              @click.stop="copyPassword(item.id)"
            >
              <Copy :size="14" />
            </button>
          </p>
          <p v-if="item.url" :class="$style.cardText">
            <strong>URL:</strong> {{ item.url }}
          </p>
          <div :class="$style.actions">
            <button :class="$style.cardAction" type="button" :title="t('reveal')" @click.stop="openRevealModal(item)">
              <Eye :size="14" />
            </button>
            <button :class="$style.cardAction" type="button" :title="t('edit')" @click.stop="openEditModal(item)">
              <Pencil :size="14" />
            </button>
            <button
              :class="[$style.cardAction, $style.cardActionDanger]"
              type="button"
              :title="t('delete')"
              @click.stop="requestDelete(item.id)"
            >
              <Trash2 :size="14" />
            </button>
          </div>
        </article>
      </div>
    </div>

    <transition :name="isEditing ? 'top-sheet' : 'sheet'">
      <div
        v-if="isFormModalOpen"
        :class="[isEditing ? $style.topModalOverlay : $style.modalOverlay]"
        @click.self="closeFormModal"
      >
        <div :class="[$style.modalCard, { [$style.topModalCard]: isEditing }]">
          <h2>{{ isEditing ? t('editTitle') : t('createTitle') }}</h2>
          <input v-model.trim="form.title" :class="$style.fieldInput" :placeholder="t('titlePlaceholder')" />
          <input v-model.trim="form.username" :class="$style.fieldInput" :placeholder="t('usernamePlaceholder')" />
          <input v-model="form.password" :class="$style.fieldInput" :placeholder="t('passwordPlaceholder')" />
          <input v-model.trim="form.url" :class="$style.fieldInput" :placeholder="t('urlPlaceholder')" />

          <div :class="$style.modalActions">
            <button :class="$style.ghostButton" type="button" @click="closeFormModal">{{ t('cancel') }}</button>
            <button :class="$style.primaryButton" type="button" @click="saveForm">{{ t('save') }}</button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="sheet">
      <div v-if="isDeleteConfirmModalOpen" :class="$style.modalOverlay" @click.self="closeDeleteConfirmModal">
        <div :class="$style.modalCard">
          <h2>{{ t('deleteConfirmTitle') }}</h2>
          <p :class="$style.historyHint">{{ t('deleteConfirmDescription') }}</p>
          <div :class="$style.modalActions">
            <button :class="$style.ghostButton" type="button" @click="closeDeleteConfirmModal">
              {{ t('cancel') }}
            </button>
            <button :class="$style.dangerButton" type="button" @click="confirmDelete">
              {{ t('delete') }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="sheet">
      <div v-if="isRevealModalOpen" :class="$style.modalOverlay" @click.self="closeRevealModal">
        <div :class="$style.modalCard">
          <h2>{{ t('revealTitle') }}</h2>
          <p>{{ revealItemTitle }}</p>
          <p :class="$style.revealPassword">{{ revealedPassword || '••••••••' }}</p>
          <p :class="$style.historyHint">{{ t('revealHint') }}</p>
          <div :class="$style.modalActions">
            <button :class="$style.ghostButton" type="button" @click="closeRevealModal">{{ t('close') }}</button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="sheet">
      <div v-if="isSearchModalOpen" :class="$style.modalOverlay" @click.self="closeSearchModal">
        <div :class="[$style.modalCard, $style.searchModalCard]">
          <h2>{{ t('searchTitle') }}</h2>
          <input
            v-model.trim="searchQuery"
            :class="$style.searchInput"
            :placeholder="t('searchPlaceholder')"
            autofocus
          />
          <div :class="$style.modalActions">
            <button :class="$style.ghostButton" type="button" @click="closeSearchModal">{{ t('close') }}</button>
          </div>
        </div>
      </div>
    </transition>

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
import { Copy, Eye, Pencil, Search, SquarePlus, Trash2 } from 'lucide-vue-next'
import { useSettingsStore, useVaultStore } from '@/stores'
import type { VaultItem, VaultItemInput } from '@/types'

const vaultStore = useVaultStore()
const settingsStore = useSettingsStore()

const searchQuery = ref('')
const isFormModalOpen = ref(false)
const isRevealModalOpen = ref(false)
const isSearchModalOpen = ref(false)
const isDeleteConfirmModalOpen = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const pendingDeleteItemId = ref<string | null>(null)
const revealItemId = ref<string | null>(null)
const revealItemTitle = ref('')
const revealedPassword = ref<string | null>(null)
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

async function openRevealModal(item: VaultItem): Promise<void> {
  revealItemId.value = item.id
  revealItemTitle.value = item.title
  revealedPassword.value = await vaultStore.revealPassword(item.id)
  isRevealModalOpen.value = true
}

function closeRevealModal(): void {
  if (revealItemId.value) {
    vaultStore.hidePassword(revealItemId.value)
  }
  revealItemId.value = null
  revealItemTitle.value = ''
  revealedPassword.value = null
  isRevealModalOpen.value = false
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

async function copyUsername(itemId: string): Promise<void> {
  const success = await vaultStore.copyUsername(itemId)
  if (!success) return
  alert('Логин скопирован')
}

async function copyPassword(itemId: string): Promise<void> {
  const success = await vaultStore.copyPassword(itemId)
  if (!success) return
  alert('Пароль скопирован')
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

function getMaskedPassword(itemId: string, fallback: string): string {
  return vaultStore.getVisiblePassword(itemId) || fallback
}

onMounted(async () => {
  await vaultStore.refreshItems()
})
</script>

<style lang="scss" module src="./VaultView.module.scss"></style>
