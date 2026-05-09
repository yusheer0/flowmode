<script setup lang="ts">
import { Check, Trash2 } from 'lucide-vue-next'
import type { Habit } from '@/types'

type Props = {
  habit: Habit
  styles: Record<string, string>
  isDoneToday: boolean
  deleteTitle: string
}

defineProps<Props>()

const emit = defineEmits<{
  'toggle-done': [habitId: string]
  'request-delete': [habitId: string]
}>()
</script>

<template>
  <article
    data-view-card
    :class="[styles.card, { [styles.cardDone]: isDoneToday }]"
  >
    <h3 :class="styles.cardTitle">{{ habit.name }}</h3>

    <div :class="styles.cardActions">
      <button
        type="button"
        :class="[styles.cardAction, { [styles.cardActionActive]: isDoneToday }]"
        @click="emit('toggle-done', habit.id)"
      >
        <Check :size="14" />
      </button>

      <button
        type="button"
        :class="styles.cardAction"
        :title="deleteTitle"
        @click="emit('request-delete', habit.id)"
      >
        <Trash2 :size="14" />
      </button>
    </div>
  </article>
</template>
