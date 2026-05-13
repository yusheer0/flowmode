<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { Cog, Grid2x2, Search, SquarePlus, Box } from 'lucide-vue-next'
import HabitCard from '@/components/habits/HabitCard.vue'
import HabitsDialogs from '@/components/habits/HabitsDialogs.vue'
import { useHabitsTracker } from '@/composables/useHabitsTracker'
import { useCanvasBackground } from '@/composables/useCanvasBackground'
import { useSettingsStore } from '@/stores'
import { TRANSLATIONS } from '@/translations/translations'
import { useViewPageStyles } from '@/composables/useViewPageStyles'
import { useListDragReorder } from '@/composables/useListDragReorder'
import { HABITS_TRACKER_KEY } from '@/components/habits/habitsInjection'

const styles = useViewPageStyles()
const settingsStore = useSettingsStore()
const dialogsRef = ref<InstanceType<typeof HabitsDialogs> | null>(null)

const tracker = useHabitsTracker()
provide(HABITS_TRACKER_KEY, tracker)

const { habits, loadHabits, isHabitDoneToday, toggleHabitDone, reorderHabits } = tracker

const searchQuery = ref('')

const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())
const filteredHabits = computed(() => {
  const query = normalizedSearchQuery.value
  if (!query) return habits.value
  return habits.value.filter((habit) => habit.name.toLowerCase().includes(query))
})

const reorderEnabled = computed(() => normalizedSearchQuery.value.length === 0)

const listDrag = useListDragReorder({
  enabled: reorderEnabled,
  canDrop: () => true,
  onReorder: (draggedId, targetId, placeBefore) => {
    const order = filteredHabits.value.map(h => h.id)
    const next = order.filter(id => id !== draggedId)
    const targetIndexInNext = next.indexOf(targetId)
    if (targetIndexInNext === -1) return
    const insertAt = placeBefore ? targetIndexInNext : targetIndexInNext + 1
    next.splice(insertAt, 0, draggedId)
    reorderHabits(next)
  },
})

const {
  draggingId,
  dragOverId,
  isDragOverBefore,
  onHandleDragStart,
  onCardDragOver,
  onCardDragLeave,
  onCardDrop,
  onDragEnd,
} = listDrag

const currentLang = computed(() => settingsStore.settings.language)
const t = (key: keyof typeof TRANSLATIONS.en): string => TRANSLATIONS[currentLang.value][key]

const { canvasStyle } = useCanvasBackground(t)

onMounted(() => {
  settingsStore.init()
  loadHabits()
})
</script>

<template>
  <section :class="styles.habitsView">
    <div :class="styles.canvas" :style="canvasStyle">
      <HabitCard
        v-for="habit in filteredHabits"
        :key="habit.id"
        :habit="habit"
        :styles="styles"
        :is-done-today="isHabitDoneToday(habit)"
        :delete-title="t('habitsDeleteTitle')"
        :reorder-enabled="reorderEnabled"
        :drag-handle-title="t('dragToReorderTitle')"
        :is-dragging="draggingId === habit.id"
        :is-drop-target="dragOverId === habit.id"
        :drop-before="isDragOverBefore"
        @toggle-done="toggleHabitDone"
        @request-delete="(id) => dialogsRef?.promptDeleteHabit(id)"
        @drag-handle-start="(e) => onHandleDragStart(e, habit.id)"
        @card-drag-over="(e) => onCardDragOver(e, habit.id)"
        @card-drag-leave="(e) => onCardDragLeave(e, habit.id)"
        @card-drop="(e) => onCardDrop(e, habit.id)"
        @card-drag-end="onDragEnd"
      />
    </div>

    <HabitsDialogs ref="dialogsRef" v-model:search-query="searchQuery" />

    <nav :class="styles.bottomDock">
      <button
        :class="[
          styles.dockButton,
          { [styles.dockButtonActive]: dialogsRef?.isCreateModalOpen },
        ]"
        type="button"
        :title="t('habitsAddButton')"
        @click="dialogsRef?.openCreateModal()"
      >
        <SquarePlus :size="24" />
      </button>
      <button
        :class="[
          styles.dockButton,
          { [styles.dockButtonActive]: dialogsRef?.isSearchModalOpen },
        ]"
        type="button"
        :title="t('searchTitle')"
        @click="dialogsRef?.openSearchModal()"
      >
        <Search :size="24" />
      </button>
      <button
        :class="[
          styles.dockButton,
          { [styles.dockButtonActive]: dialogsRef?.isViewPickerModalOpen },
        ]"
        type="button"
        title="View"
        @click="dialogsRef?.openViewPickerModal()"
      >
        <Grid2x2 :size="24" />
      </button>
      <button
        :class="[
          styles.dockButton,
          { [styles.dockButtonActive]: dialogsRef?.isSettingsModalOpen },
        ]"
        type="button"
        :title="t('settingsTitle')"
        @click="dialogsRef?.openSettingsModal()"
      >
        <Cog :size="24" />
      </button>
      <button
        :class="[
          styles.dockButton,
          { [styles.dockButtonActive]: dialogsRef?.isAboutModalOpen },
        ]"
        type="button"
        :title="t('aboutTitle')"
        @click="dialogsRef?.openAboutModal()"
      >
        <Box :size="24" />
      </button>
    </nav>
  </section>
</template>

<style lang="scss" module src="./HabitsWorkspace.module.scss"></style>
