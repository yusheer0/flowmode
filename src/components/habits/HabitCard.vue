<script setup lang="ts">
import { GripVertical, SquareCheck, Trash } from 'lucide-vue-next'
import type { Habit } from '@/types'

type Props = {
  habit: Habit
  styles: Record<string, string>
  isDoneToday: boolean
  deleteTitle: string
  reorderEnabled?: boolean
  dragHandleTitle?: string
  isDragging?: boolean
  isDropTarget?: boolean
  dropBefore?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  'toggle-done': [habitId: string]
  'request-delete': [habitId: string]
  'drag-handle-start': [event: DragEvent]
  'card-drag-over': [event: DragEvent]
  'card-drag-leave': [event: DragEvent]
  'card-drop': [event: DragEvent]
  'card-drag-end': []
}>()
</script>

<template>
  <article
    data-view-card
    :class="[
      styles.card,
      { [styles.cardDone]: isDoneToday },
      { [styles.cardDragging]: isDragging, [styles.cardDropInsertBefore]: isDropTarget && dropBefore, [styles.cardDropInsertAfter]: isDropTarget && !dropBefore },
    ]"
    @dragover="emit('card-drag-over', $event)"
    @dragleave="emit('card-drag-leave', $event)"
    @drop="emit('card-drop', $event)"
    @dragend="emit('card-drag-end')"
  >
    <h3 :class="styles.cardTitle">{{ habit.name }}</h3>

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
        type="button"
        :class="[styles.cardAction, { [styles.cardActionActive]: isDoneToday }]"
        @click="emit('toggle-done', habit.id)"
      >
        <SquareCheck :size="14" />
      </button>

      <button
        type="button"
        :class="styles.cardAction"
        :title="deleteTitle"
        @click="emit('request-delete', habit.id)"
      >
        <Trash :size="14" />
      </button>
    </div>
  </article>
</template>
