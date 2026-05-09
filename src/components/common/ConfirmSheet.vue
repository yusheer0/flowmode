<script setup lang="ts">
import SheetModal from '@/components/SheetModal.vue'
import { useShellOnlyStyles } from '@/composables/useShellOnlyStyles'

type Props = {
  isOpen: boolean
  title: string
  message: string
  cancelLabel: string
  confirmLabel: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'cancel'): void
  (e: 'confirm'): void
}>()

const styles = useShellOnlyStyles()

function cancel(): void {
  emit('cancel')
}
</script>

<template>
  <SheetModal
    :is-open="isOpen"
    :overlay-class="[styles.modalOverlay, styles.deleteConfirmOverlay]"
    :sheet-class="styles.modalSheet"
    :title-class="styles.modalTitle"
    :title="title"
    :show-close="false"
    @close="emit('close')"
  >
    <p :class="styles.confirmMessage">{{ message }}</p>
    <div :class="styles.confirmActions">
      <button :class="styles.modalCancelButton" type="button" @click="cancel">
        {{ cancelLabel }}
      </button>
      <button :class="styles.modalDeleteButton" type="button" @click="emit('confirm')">
        {{ confirmLabel }}
      </button>
    </div>
  </SheetModal>
</template>
