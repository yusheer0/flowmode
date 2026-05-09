<script setup lang="ts">
import { Trash2, UserRound, Link2 } from 'lucide-vue-next'
import type { VaultItem } from '@/types'

type Props = {
  item: VaultItem
  loginLabel: string
  passwordLabel: string
  deleteTitle: string
  styles: Record<string, string>
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'edit', item: VaultItem): void
  (e: 'delete', itemId: string): void
}>()
</script>

<template>
  <article
    data-view-card
    :class="styles.card"
    @click="emit('edit', item)"
  >
    <h3 :class="styles.cardTitle">{{ item.title }}</h3>
    <p :class="styles.cardText"><UserRound :size="20" /> {{ item.username }}</p>
    <p v-if="item.url" :class="styles.cardText"><Link2 :size="20" /> {{ item.url }}</p>
    <div :class="styles.cardActions">
      <button
        :class="styles.cardAction"
        type="button"
        :title="deleteTitle"
        @click.stop="emit('delete', item.id)"
      >
        <Trash2 :size="14" />
      </button>
    </div>
  </article>
</template>
