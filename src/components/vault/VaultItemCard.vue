<script setup lang="ts">
import { Trash, UserRound, Link2, GripVertical } from 'lucide-vue-next'
import type { VaultItem } from '@/types'

type Props = {
  item: VaultItem
  loginLabel: string
  passwordLabel: string
  deleteTitle: string
  styles: Record<string, string>
  reorderEnabled?: boolean
  dragHandleTitle?: string
  isDragging?: boolean
  isDropTarget?: boolean
  dropBefore?: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'edit', item: VaultItem): void
  (e: 'delete', itemId: string): void
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
      styles.card,
      { [styles.cardDragging]: isDragging, [styles.cardDropInsertBefore]: isDropTarget && dropBefore, [styles.cardDropInsertAfter]: isDropTarget && !dropBefore },
    ]"
    @click="emit('edit', item)"
    @dragover="emit('card-drag-over', $event)"
    @dragleave="emit('card-drag-leave', $event)"
    @drop="emit('card-drop', $event)"
    @dragend="emit('card-drag-end')"
  >
    <h3 :class="styles.cardTitle">{{ item.title }}</h3>
    <p :class="styles.cardText"><UserRound :size="20" /> {{ item.username }}</p>
    <p v-if="item.url" :class="styles.cardText"><Link2 :size="20" /> {{ item.url }}</p>
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
        :class="styles.cardAction"
        type="button"
        :title="deleteTitle"
        @click.stop="emit('delete', item.id)"
      >
        <Trash :size="14" />
      </button>
    </div>
  </article>
</template>
