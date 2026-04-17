import { computed, ref } from 'vue'
import type { VaultItem, VaultItemInput } from '@/types'

type VaultStoreApi = {
  revealPassword: (itemId: string) => Promise<string | null>
  createItem: (input: VaultItemInput) => Promise<boolean>
  updateItem: (id: string, input: VaultItemInput) => Promise<boolean>
}

export function useVaultEntryForm(vaultStore: VaultStoreApi) {
  const isFormModalOpen = ref(false)
  const isEditing = ref(false)
  const editingId = ref<string | null>(null)
  const isPasswordVisible = ref(false)
  const editPasswordMask = ref('')
  const resetFormTimer = ref<ReturnType<typeof setTimeout> | null>(null)
  const form = ref({
    title: '',
    username: '',
    password: '',
    url: '',
  })

  const hasPasswordValueForEdit = computed(() => form.value.password.length > 0 || editPasswordMask.value.length > 0)
  const canSaveForm = computed(() => {
    const hasTitle = form.value.title.trim().length > 0
    const hasUsername = form.value.username.trim().length > 0
    if (!hasTitle || !hasUsername) return false
    if (isEditing.value) return hasPasswordValueForEdit.value
    return form.value.password.length > 0
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
    editPasswordMask.value = ''
    isPasswordVisible.value = false
    editingId.value = null
    isEditing.value = false
  }

  function clearResetFormTimer(): void {
    if (!resetFormTimer.value) return
    clearTimeout(resetFormTimer.value)
    resetFormTimer.value = null
  }

  function scheduleResetForm(): void {
    clearResetFormTimer()
    resetFormTimer.value = setTimeout(() => {
      resetForm()
      resetFormTimer.value = null
    }, 520)
  }

  function openCreateModal(): void {
    clearResetFormTimer()
    resetForm()
    isFormModalOpen.value = true
  }

  function openEditModal(item: VaultItem): void {
    clearResetFormTimer()
    form.value = {
      title: item.title,
      username: item.username,
      password: '',
      url: item.url || '',
    }
    editPasswordMask.value = item.passwordMasked
    isPasswordVisible.value = false
    isEditing.value = true
    editingId.value = item.id
    isFormModalOpen.value = true
  }

  function closeFormModal(): void {
    isFormModalOpen.value = false
    scheduleResetForm()
  }

  async function togglePasswordVisibility(): Promise<void> {
    if (!isEditing.value || !editingId.value) return
    if (!isPasswordVisible.value && !form.value.password) {
      const revealed = await vaultStore.revealPassword(editingId.value)
      if (revealed) {
        form.value.password = revealed
      }
    }
    isPasswordVisible.value = !isPasswordVisible.value
  }

  function handlePasswordInput(): void {
    if (form.value.password.length > 0) {
      editPasswordMask.value = ''
    }
  }

  async function saveForm(): Promise<boolean> {
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
      return success
    }

    const success = await vaultStore.createItem(payload)
    if (success) {
      closeFormModal()
    }
    return success
  }

  function cleanup(): void {
    clearResetFormTimer()
  }

  return {
    form,
    isFormModalOpen,
    isEditing,
    editingId,
    isPasswordVisible,
    editPasswordMask,
    canSaveForm,
    openCreateModal,
    openEditModal,
    closeFormModal,
    togglePasswordVisibility,
    handlePasswordInput,
    saveForm,
    clearResetFormTimer,
    cleanup,
  }
}
