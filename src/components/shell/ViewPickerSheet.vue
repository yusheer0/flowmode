<script setup lang="ts">
import SheetModal from '@/components/SheetModal.vue'
import UiButton from '@/components/ui/UiButton.vue'
import { useShellOnlyStyles } from '@/composables/useShellOnlyStyles'
import type { ActiveAppView } from '@/composables/useViewNavigation'

type Labels = {
  title: string
  closeTitle: string
  notesViewTitle: string
  vaultViewTitle: string
  habitsViewTitle: string
}

type Props = {
  isOpen: boolean
  activeView: ActiveAppView
  labels: Labels
}

defineProps<Props>()

const styles = useShellOnlyStyles()

const emit = defineEmits<{
  close: []
  select: [view: ActiveAppView]
}>()
</script>

<template>
  <SheetModal
    :is-open="isOpen"
    :overlay-class="styles.modalOverlay"
    :sheet-class="styles.modalSheet"
    :close-button-class="styles.modalClose"
    :title-class="styles.modalTitle"
    :title="labels.title"
    :close-title="labels.closeTitle"
    @close="emit('close')"
  >
    <div :class="styles.settingsGroup">
      <div :class="styles.settingsOptions">
        <UiButton
          variant="plain"
          :class="[styles.settingsOption, { [styles.settingsOptionActive]: activeView === 'notes' }]"
          type="button"
          @click="emit('select', 'notes')"
        >
          {{ labels.notesViewTitle }}
        </UiButton>
        <UiButton
          variant="plain"
          :class="[styles.settingsOption, { [styles.settingsOptionActive]: activeView === 'vault' }]"
          type="button"
          @click="emit('select', 'vault')"
        >
          {{ labels.vaultViewTitle }}
        </UiButton>
        <UiButton
          variant="plain"
          :class="[styles.settingsOption, { [styles.settingsOptionActive]: activeView === 'habits' }]"
          type="button"
          @click="emit('select', 'habits')"
        >
          {{ labels.habitsViewTitle }}
        </UiButton>
      </div>
    </div>
  </SheetModal>
</template>
