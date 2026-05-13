<script setup lang="ts">
import { ref, watch } from 'vue'
import { Bookmark, GripVertical, Star, Trash } from 'lucide-vue-next'
import type { Note } from '@/types'

type Props = {
  note: Note
  backgroundColor: string
  pinTitle: string
  deleteTitle: string
  styles: Record<string, string>
  reorderEnabled?: boolean
  dragHandleTitle?: string
  isDragging?: boolean
  isDropTarget?: boolean
  dropBefore?: boolean
}

const props = defineProps<Props>()

const pinEnterActive = ref(false)
const PIN_ENTER_MS = 580

watch(
  () => props.note.isImportant,
  (isImportant, wasImportant) => {
    if (isImportant && wasImportant === false) {
      pinEnterActive.value = true
      window.setTimeout(() => {
        pinEnterActive.value = false
      }, PIN_ENTER_MS)
    }
  },
)

const emit = defineEmits<{
  (e: 'edit', note: Note): void
  (e: 'toggle-important', noteId: string): void
  (e: 'delete', noteId: string): void
  (e: 'drag-handle-start', event: DragEvent): void
  (e: 'card-drag-over', event: DragEvent): void
  (e: 'card-drag-leave', event: DragEvent): void
  (e: 'card-drop', event: DragEvent): void
  (e: 'card-drag-end'): void
}>()
</script>

<template>
  <article
    data-view-card
    :class="[
      styles.noteCard,
      {
        [styles.noteCardPinned]: note.isImportant,
        [styles.noteCardPinEnter]: pinEnterActive,
        [styles.noteCardDragging]: isDragging,
        [styles.noteCardDropInsertBefore]: isDropTarget && dropBefore,
        [styles.noteCardDropInsertAfter]: isDropTarget && !dropBefore,
      },
    ]"
    :style="{ backgroundColor }"
    @click="emit('edit', note)"
    @dragover="emit('card-drag-over', $event)"
    @dragleave="emit('card-drag-leave', $event)"
    @drop="emit('card-drop', $event)"
    @dragend="emit('card-drag-end')"
  >
    <span v-if="note.isImportant" :class="styles.pinnedBadge" aria-hidden="true">
      <Bookmark :size="28" fill="#ffffff" />
    </span>
    <p :class="styles.noteContent">{{ note.content }}</p>

    <span
      v-if="reorderEnabled"
      :class="styles.dragHandle"
      draggable="true"
      role="button"
      tabindex="-1"
      :title="dragHandleTitle"
      :aria-label="dragHandleTitle"
      @pointerdown.stop
      @dragstart.stop="emit('drag-handle-start', $event)"
      @dragend.stop="emit('card-drag-end')"
    >
      <GripVertical :size="18" aria-hidden="true" />
    </span>

    <div :class="styles.cardActions">
      <button
        :class="[styles.cardAction, { [styles.cardActionActive]: note.isImportant }]"
        type="button"
        :title="pinTitle"
        @click.stop="emit('toggle-important', note.id)"
      >
        <Star :size="14" />
      </button>
      <button
        :class="styles.cardAction"
        type="button"
        :title="deleteTitle"
        @click.stop="emit('delete', note.id)"
      >
        <Trash :size="14" />
      </button>
    </div>
  </article>
</template>
