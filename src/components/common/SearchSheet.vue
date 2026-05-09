<script setup lang="ts">
import { Search } from 'lucide-vue-next'
import SheetModal from '@/components/SheetModal.vue'
import { useShellOnlyStyles } from '@/composables/useShellOnlyStyles'

type Props = {
  isOpen: boolean
  title: string
  placeholder: string
  closeTitle: string
  modelValue: string
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'close'): void
}>()

const styles = useShellOnlyStyles()

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <SheetModal
    :is-open="isOpen"
    :overlay-class="styles.modalOverlay"
    :sheet-class="[styles.modalSheet, styles.searchSheet]"
    :close-button-class="styles.modalClose"
    :title-class="styles.modalTitle"
    :title="title"
    :close-title="closeTitle"
    @close="emit('close')"
  >
    <div :class="styles.searchField">
      <Search :size="22" />
      <input
        :value="modelValue"
        :class="styles.searchInput"
        :placeholder="placeholder"
        autofocus
        @input="onInput"
      >
    </div>
  </SheetModal>
</template>
