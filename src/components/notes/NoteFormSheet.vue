<script setup lang="ts">
import type { Note } from '@/types'
import SheetModal from '@/components/SheetModal.vue'
import CriticalityPicker from '@/components/notes/CriticalityPicker.vue'

type Option = {
  value: Note['criticality']
  label: string
}

type Labels = {
  createTitle: string
  editTitle: string
  close: string
  bodyPlaceholder: string
  criticalityLabel: string
  createButton: string
  saveButton: string
  deleteButton: string
}

type Props = {
  isOpen: boolean
  isEdit: boolean
  body: string
  criticality: Note['criticality'] | ''
  isSubmitEnabled: boolean
  options: readonly Option[]
  labels: Labels
  styles: Record<string, string>
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'update:body', value: string): void
  (e: 'update:criticality', value: Note['criticality'] | ''): void
  (e: 'submit'): void
  (e: 'delete'): void
}>()

function onBodyInput(event: Event): void {
  const target = event.target as HTMLTextAreaElement
  emit('update:body', target.value.trim())
}
</script>

<template>
  <SheetModal
    :is-open="isOpen"
    :transition-name="isEdit ? 'top-sheet' : 'sheet'"
    :overlay-class="isEdit ? styles.topModalOverlay : styles.modalOverlay"
    :sheet-class="isEdit ? [styles.modalSheet, styles.topModalSheet] : styles.modalSheet"
    :close-button-class="styles.modalClose"
    :title-class="styles.modalTitle"
    :title="isEdit ? labels.editTitle : labels.createTitle"
    :close-title="labels.close"
    :close-on-overlay="false"
    @close="emit('close')"
  >
    <textarea
      :value="body"
      :class="styles.modalTextarea"
      :placeholder="labels.bodyPlaceholder"
      autofocus
      @input="onBodyInput"
      :resize="false"
    />

    <CriticalityPicker
      :model-value="criticality"
      :options="options"
      :label="labels.criticalityLabel"
      :styles="styles"
      :id-prefix="isEdit ? 'edit' : 'create'"
      @update:model-value="emit('update:criticality', $event)"
    />

    <div v-if="isEdit" :class="styles.editModalActions">
      <button
        :class="styles.modalDeleteButton"
        type="button"
        @click="emit('delete')"
      >
        {{ labels.deleteButton }}
      </button>
      <button
        :class="styles.modalSaveButton"
        type="button"
        :disabled="!isSubmitEnabled"
        @click="emit('submit')"
      >
        {{ labels.saveButton }}
      </button>
    </div>

    <button
      v-else
      :class="styles.modalCreateButton"
      type="button"
      :disabled="!isSubmitEnabled"
      @click="emit('submit')"
    >
      {{ labels.createButton }}
    </button>
  </SheetModal>
</template>
