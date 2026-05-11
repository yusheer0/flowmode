<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { Search, X } from 'lucide-vue-next'
import SheetModal from '@/components/SheetModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { useShellOnlyStyles } from '@/composables/useShellOnlyStyles'

type Props = {
  isOpen: boolean
  title: string
  placeholder: string
  closeTitle: string
  clearTitle: string
  modelValue: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'close'): void
}>()

const styles = useShellOnlyStyles()
const inputRef = ref<HTMLInputElement | null>(null)

const showClearButton = computed(() => props.modelValue.length > 0)

function onInput(event: Event): void {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function clearInput(): void {
  emit('update:modelValue', '')
  void nextTick(() => inputRef.value?.focus())
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
        ref="inputRef"
        :value="modelValue"
        :class="styles.searchInput"
        :placeholder="placeholder"
        autofocus
        @input="onInput"
      >
      <UiButton
        v-if="showClearButton"
        variant="plain"
        type="button"
        :class="styles.searchClearButton"
        :title="clearTitle"
        :aria-label="clearTitle"
        @click="clearInput"
      >
        <X :size="18" aria-hidden="true" />
      </UiButton>
    </div>
  </SheetModal>
</template>
