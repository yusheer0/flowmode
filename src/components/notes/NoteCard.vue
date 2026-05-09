<script setup lang="ts">
import { Bookmark, Heart, Trash2 } from 'lucide-vue-next'
import type { Note } from '@/types'

type Props = {
  note: Note
  backgroundColor: string
  pinTitle: string
  deleteTitle: string
  styles: Record<string, string>
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'edit', note: Note): void
  (e: 'toggle-important', noteId: string): void
  (e: 'delete', noteId: string): void
}>()
</script>

<template>
  <article
    data-view-card
    :class="[styles.noteCard, { [styles.noteCardPinned]: note.isImportant }]"
    :style="{ backgroundColor }"
    @click="emit('edit', note)"
  >
    <span v-if="note.isImportant" :class="styles.pinnedBadge" aria-hidden="true">
      <Bookmark :size="28" fill="#ffffff" />
    </span>
    <p :class="styles.noteContent">{{ note.content }}</p>

    <div :class="styles.cardActions">
      <button
        :class="[styles.cardAction, { [styles.cardActionActive]: note.isImportant }]"
        type="button"
        :title="pinTitle"
        @click.stop="emit('toggle-important', note.id)"
      >
        <Heart :size="14" />
      </button>
      <button
        :class="styles.cardAction"
        type="button"
        :title="deleteTitle"
        @click.stop="emit('delete', note.id)"
      >
        <Trash2 :size="14" />
      </button>
    </div>
  </article>
</template>
