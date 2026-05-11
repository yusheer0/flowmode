<script setup lang="ts">
import SheetModal from '@/components/SheetModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import UiVaultEntryFields from '@/components/ui/UiVaultEntryFields.vue'
import { useMergedShellStyles } from '@/composables/useMergedShellStyles'

type Labels = {
  createTitle: string
  editTitle: string
  close: string
  titleLabel: string
  usernameLabel: string
  passwordLabel: string
  descriptionLabel: string
  urlLabel: string
  titlePlaceholder: string
  usernamePlaceholder: string
  passwordPlaceholder: string
  descriptionPlaceholder: string
  urlPlaceholder: string
  copy: string
  copied: string
  hide: string
  reveal: string
  goToUrl: string
  save: string
}

type Props = {
  isOpen: boolean
  isEditing: boolean
  titleValue: string
  usernameValue: string
  passwordValue: string
  notesValue: string
  urlValue: string
  isPasswordVisible: boolean
  editPasswordMask: string
  isLoginCopied: boolean
  isPasswordCopied: boolean
  canSave: boolean
  labels: Labels
}

defineProps<Props>()

const styles = useMergedShellStyles()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save'): void
  (e: 'update:title', value: string): void
  (e: 'update:username', value: string): void
  (e: 'update:password', value: string): void
  (e: 'update:notes', value: string): void
  (e: 'update:url', value: string): void
  (e: 'password-input'): void
  (e: 'toggle-password'): void
  (e: 'copy-login'): void
  (e: 'copy-password'): void
  (e: 'open-url', value: string): void
}>()
</script>

<template>
  <SheetModal
    :is-open="isOpen"
    :transition-name="isEditing ? 'top-sheet' : 'sheet'"
    :overlay-class="isEditing ? styles.topModalOverlay : styles.modalOverlay"
    :sheet-class="isEditing ? [styles.modalSheet, styles.topModalSheet] : styles.modalSheet"
    :close-button-class="styles.modalClose"
    :title-class="styles.modalTitle"
    :title="isEditing ? labels.editTitle : labels.createTitle"
    :close-title="labels.close"
    :close-on-overlay="false"
    @close="emit('close')"
  >
    <div :class="styles.modalContent">
      <UiVaultEntryFields
        :title-value="titleValue"
        :username-value="usernameValue"
        :password-value="passwordValue"
        :notes-value="notesValue"
        :url-value="urlValue"
        :is-password-visible="isPasswordVisible"
        :edit-password-mask="editPasswordMask"
        :is-login-copied="isLoginCopied"
        :is-password-copied="isPasswordCopied"
        :is-editing="isEditing"
        :labels="labels"
        @update:title="emit('update:title', $event)"
        @update:username="emit('update:username', $event)"
        @update:password="emit('update:password', $event)"
        @update:notes="emit('update:notes', $event)"
        @update:url="emit('update:url', $event)"
        @password-input="emit('password-input')"
        @toggle-password="emit('toggle-password')"
        @copy-login="emit('copy-login')"
        @copy-password="emit('copy-password')"
        @open-url="emit('open-url', $event)"
      />

      <div :class="styles.modalActions">
        <UiButton variant="save" :disabled="!canSave" @click="emit('save')">
          {{ labels.save }}
        </UiButton>
      </div>
    </div>
  </SheetModal>
</template>

<style lang="scss" module src="./VaultEntrySheet.module.scss"></style>
