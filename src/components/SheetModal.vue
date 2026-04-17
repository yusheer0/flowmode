<script setup lang="ts">
import { X } from 'lucide-vue-next'

type ClassValue = string | string[] | Record<string, boolean> | undefined

type Props = {
  isOpen: boolean
  transitionName?: string
  overlayClass: ClassValue
  sheetClass: ClassValue
  closeButtonClass?: ClassValue
  titleClass?: ClassValue
  title?: string
  closeTitle?: string
  showClose?: boolean
  closeOnOverlay?: boolean
  closeDisabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  transitionName: 'sheet',
  title: '',
  closeTitle: 'Close',
  showClose: true,
  closeOnOverlay: true,
  closeDisabled: false,
  closeButtonClass: undefined,
  titleClass: undefined,
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

function requestClose(): void {
  if (props.closeDisabled) return
  emit('close')
}

function handleOverlayClick(): void {
  if (!props.closeOnOverlay) return
  requestClose()
}
</script>

<template>
  <transition :name="transitionName">
    <div v-if="isOpen" :class="overlayClass" @click.self="handleOverlayClick">
      <div :class="sheetClass">
        <button
          v-if="showClose"
          :class="closeButtonClass"
          type="button"
          :title="closeTitle"
          :disabled="closeDisabled"
          @click="requestClose"
        >
          <X :size="18" />
        </button>

        <h2 v-if="title" :class="titleClass">{{ title }}</h2>
        <slot />
      </div>
    </div>
  </transition>
</template>
