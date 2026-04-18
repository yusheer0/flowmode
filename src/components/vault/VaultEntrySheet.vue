<script setup lang="ts">
import SheetModal from '@/components/SheetModal.vue'

type Labels = {
  createTitle: string
  editTitle: string
  close: string
  titlePlaceholder: string
  usernamePlaceholder: string
  passwordPlaceholder: string
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
  urlValue: string
  isPasswordVisible: boolean
  editPasswordMask: string
  isLoginCopied: boolean
  isPasswordCopied: boolean
  canSave: boolean
  labels: Labels
  styles: Record<string, string>
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'save'): void
  (e: 'update:title', value: string): void
  (e: 'update:username', value: string): void
  (e: 'update:password', value: string): void
  (e: 'update:url', value: string): void
  (e: 'password-input'): void
  (e: 'toggle-password'): void
  (e: 'copy-login'): void
  (e: 'copy-password'): void
  (e: 'open-url', value: string): void
}>()

function onFieldUpdate(event: Event, field: 'title' | 'username' | 'password' | 'url'): void {
  const target = event.target as HTMLInputElement
  const value = field === 'password' ? target.value : target.value.trim()

  switch (field) {
    case 'title':
      emit('update:title', value)
      break
    case 'username':
      emit('update:username', value)
      break
    case 'password':
      emit('update:password', value)
      break
    case 'url':
      emit('update:url', value)
      break
  }
}
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
    <input
      :value="titleValue"
      :class="styles.modalInput"
      :placeholder="labels.titlePlaceholder"
      @input="onFieldUpdate($event, 'title')"
    />
    <div :class="styles.inputInlineAction">
      <input
        :value="usernameValue"
        :class="styles.modalInput"
        :placeholder="labels.usernamePlaceholder"
        @input="onFieldUpdate($event, 'username')"
      />
      <button
        v-if="isEditing"
        :class="styles.fieldInlineButton"
        type="button"
        :title="isLoginCopied ? labels.copied : labels.copy"
        @click="emit('copy-login')"
      >
        {{ isLoginCopied ? labels.copied : labels.copy }}
      </button>
    </div>
    <div :class="styles.inputInlineAction">
      <input
        :value="passwordValue"
        :class="styles.modalInput"
        :type="isPasswordVisible ? 'text' : 'password'"
        :placeholder="isEditing ? editPasswordMask || labels.passwordPlaceholder : labels.passwordPlaceholder"
        @input="
          onFieldUpdate($event, 'password');
          emit('password-input')
        "
      />
      <div v-if="isEditing" :class="styles.fieldInlineButtons">
        <button
          :class="styles.fieldInlineButton"
          type="button"
          :title="isPasswordVisible ? labels.hide : labels.reveal"
          @click="emit('toggle-password')"
        >
          {{ isPasswordVisible ? labels.hide : labels.reveal }}
        </button>
        <button
          :class="styles.fieldInlineButton"
          type="button"
          :title="isPasswordCopied ? labels.copied : labels.copy"
          @click="emit('copy-password')"
        >
          {{ isPasswordCopied ? labels.copied : labels.copy }}
        </button>
      </div>
    </div>
    <div :class="styles.inputInlineAction">
      <input
        :value="urlValue"
        :class="styles.modalInput"
        :placeholder="labels.urlPlaceholder"
        @input="onFieldUpdate($event, 'url')"
      />
      <button
        v-if="isEditing && urlValue.trim().length > 0"
        :class="styles.fieldInlineButton"
        type="button"
        :title="labels.goToUrl"
        @click="emit('open-url', urlValue)"
      >
        {{ labels.goToUrl }}
      </button>
    </div>

    <div :class="styles.modalActions">
      <button :class="styles.modalSaveButton" type="button" :disabled="!canSave" @click="emit('save')">
        {{ labels.save }}
      </button>
    </div>
  </SheetModal>
</template>
