<script setup lang="ts">
import UiButton from '@/components/ui/UiButton.vue'
import UiLabeledField from '@/components/ui/UiLabeledField.vue'
import { useMergedShellStyles } from '@/composables/useMergedShellStyles'

type FieldLabels = {
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
}

type Props = {
  titleValue: string
  usernameValue: string
  passwordValue: string
  notesValue: string
  urlValue: string
  isPasswordVisible: boolean
  editPasswordMask: string
  isLoginCopied: boolean
  isPasswordCopied: boolean
  isEditing: boolean
  labels: FieldLabels
}

defineProps<Props>()

const styles = useMergedShellStyles()

const emit = defineEmits<{
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

function onNotesInput(event: Event): void {
  emit('update:notes', (event.target as HTMLTextAreaElement).value)
}
</script>

<template>
  <div :class="styles.column">
    <UiLabeledField :show-label="isEditing" :label="labels.titleLabel">
      <input
        :value="titleValue"
        :class="styles.modalInput"
        :placeholder="labels.titlePlaceholder"
        @input="onFieldUpdate($event, 'title')"
      />
    </UiLabeledField>
    <UiLabeledField :show-label="isEditing" :label="labels.usernameLabel">
      <div :class="styles.inputInlineAction">
        <input
          :value="usernameValue"
          :class="[styles.modalInput, styles.inlineRowPrimaryInput]"
          :placeholder="labels.usernamePlaceholder"
          @input="onFieldUpdate($event, 'username')"
        />
        <UiButton
          v-if="isEditing"
          variant="plain"
          :class="styles.fieldInlineButton"
          type="button"
          :title="isLoginCopied ? labels.copied : labels.copy"
          @click="emit('copy-login')"
        >
          {{ isLoginCopied ? labels.copied : labels.copy }}
        </UiButton>
      </div>
    </UiLabeledField>
    <UiLabeledField :show-label="isEditing" :label="labels.passwordLabel">
      <div :class="styles.inputInlineAction">
        <input
          :value="passwordValue"
          :class="[styles.modalInput, styles.inlineRowPrimaryInput]"
          :type="isPasswordVisible ? 'text' : 'password'"
          :placeholder="isEditing ? editPasswordMask || labels.passwordPlaceholder : labels.passwordPlaceholder"
          @input="
            onFieldUpdate($event, 'password');
            emit('password-input')
          "
        />
        <div v-if="isEditing" :class="styles.fieldInlineButtons">
          <UiButton
            variant="plain"
            :class="styles.fieldInlineButton"
            type="button"
            :title="isPasswordVisible ? labels.hide : labels.reveal"
            @click="emit('toggle-password')"
          >
            {{ isPasswordVisible ? labels.hide : labels.reveal }}
          </UiButton>
          <UiButton
            variant="plain"
            :class="styles.fieldInlineButton"
            type="button"
            :title="isPasswordCopied ? labels.copied : labels.copy"
            @click="emit('copy-password')"
          >
            {{ isPasswordCopied ? labels.copied : labels.copy }}
          </UiButton>
        </div>
      </div>
    </UiLabeledField>
    <UiLabeledField :show-label="isEditing" :label="labels.descriptionLabel">
      <textarea
        :value="notesValue"
        :class="[styles.modalInput, styles.descriptionTextarea]"
        :placeholder="labels.descriptionPlaceholder"
        :rows="3"
        @input="onNotesInput"
      />
    </UiLabeledField>
    <UiLabeledField :show-label="isEditing" :label="labels.urlLabel">
      <div :class="styles.inputInlineAction">
        <input
          :value="urlValue"
          :class="[styles.modalInput, styles.inlineRowPrimaryInput]"
          :placeholder="labels.urlPlaceholder"
          @input="onFieldUpdate($event, 'url')"
        />
        <UiButton
          v-if="isEditing && urlValue.trim().length > 0"
          variant="plain"
          :class="styles.fieldInlineButton"
          type="button"
          :title="labels.goToUrl"
          @click="emit('open-url', urlValue)"
        >
          {{ labels.goToUrl }}
        </UiButton>
      </div>
    </UiLabeledField>
  </div>
</template>

<style lang="scss" module src="./UiVaultEntryFields.module.scss"></style>
