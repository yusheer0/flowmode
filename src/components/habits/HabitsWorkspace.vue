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
import { HABITS_TRACKER_KEY } from '@/components/habits/habitsInjection'

const styles = useViewPageStyles()
const settingsStore = useSettingsStore()
const dialogsRef = ref<InstanceType<typeof HabitsDialogs> | null>(null)

const tracker = useHabitsTracker()
provide(HABITS_TRACKER_KEY, tracker)

const { habits, loadHabits, isHabitDoneToday, toggleHabitDone } = tracker

const searchQuery = ref('')

const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())
const filteredHabits = computed(() => {
  const query = normalizedSearchQuery.value
  if (!query) return habits.value
  return habits.value.filter((habit) => habit.name.toLowerCase().includes(query))
})

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
        @toggle-done="toggleHabitDone"
        @request-delete="(id) => dialogsRef?.promptDeleteHabit(id)"
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
