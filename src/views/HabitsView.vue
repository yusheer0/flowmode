<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Check, Cog, Grid2x2, Search, SquarePlus, Trash2, Box } from 'lucide-vue-next'
import SheetModal from '@/components/SheetModal.vue'
import ConfirmSheet from '@/components/common/ConfirmSheet.vue'
import SearchSheet from '@/components/common/SearchSheet.vue'
import { useDataExport } from '@/composables/useDataExport'
import { useCanvasBackground } from '@/composables/useCanvasBackground'
import { useSettingsStore } from '@/stores'
import { TRANSLATIONS } from '@/translations/translations'
import type { Habit } from '@/types'
import { useRoute, useRouter } from 'vue-router'

const HABITS_STORAGE_KEY = 'habitsTrackerItems'

const settingsStore = useSettingsStore()
const router = useRouter()
const route = useRoute()
const habits = ref<Habit[]>([])
const newHabitName = ref('')
const isCreateModalOpen = ref(false)
const isSearchModalOpen = ref(false)
const isSettingsModalOpen = ref(false)
const isAboutModalOpen = ref(false)
const isViewPickerModalOpen = ref(false)
const isDeleteConfirmModalOpen = ref(false)
const pendingDeleteHabitId = ref<string | null>(null)
const searchQuery = ref('')
const githubUrl = 'https://github.com/yusheer0/flowmode'
const { isExporting, exportAllData } = useDataExport()

const currentLang = computed(() => settingsStore.settings.language)
const t = (key: keyof typeof TRANSLATIONS.en): string => TRANSLATIONS[currentLang.value][key]
const canvasBackgroundInputId = 'habits-canvas-background-input'
const {
  hasCanvasBackground,
  canvasStyle,
  clearCanvasBackground,
  applyCanvasBackgroundFromEvent,
} = useCanvasBackground(t)
const activeView = computed<'notes' | 'vault' | 'habits'>(() => {
  if (route.name === 'vault') return 'vault'
  if (route.name === 'habits') return 'habits'
  return 'notes'
})
const today = computed(() => toDateKey(new Date()))
const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())
const filteredHabits = computed(() => {
  const query = normalizedSearchQuery.value
  if (!query) return habits.value
  return habits.value.filter((habit) => habit.name.toLowerCase().includes(query))
})

function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

function loadHabits(): void {
  const raw = localStorage.getItem(HABITS_STORAGE_KEY)
  if (!raw) {
    habits.value = []
    return
  }

  try {
    const parsed = JSON.parse(raw) as Habit[]
    habits.value = Array.isArray(parsed)
      ? parsed.filter((habit): habit is Habit => typeof habit?.id === 'string' && typeof habit?.name === 'string')
      : []
  } catch {
    habits.value = []
  }
}

function saveHabits(): void {
  localStorage.setItem(HABITS_STORAGE_KEY, JSON.stringify(habits.value))
}

function isHabitDoneToday(habit: Habit): boolean {
  return habit.completedDates.includes(today.value)
}

function addHabit(): void {
  const name = newHabitName.value.trim()
  if (!name) return

  const nextHabit: Habit = {
    id: crypto.randomUUID(),
    name,
    icon: 'check',
    color: '#64748b',
    frequency: 'daily',
    createdAt: new Date().toISOString(),
    completedDates: [],
  }

  habits.value = [nextHabit, ...habits.value]
  closeCreateModal()
  saveHabits()
}

function toggleHabitDone(habitId: string): void {
  habits.value = habits.value.map((habit) => {
    if (habit.id !== habitId) return habit
    const hasToday = habit.completedDates.includes(today.value)
    const nextCompletedDates = hasToday
      ? habit.completedDates.filter(date => date !== today.value)
      : [...habit.completedDates, today.value]

    return {
      ...habit,
      completedDates: nextCompletedDates,
    }
  })
  saveHabits()
}

function deleteHabit(habitId: string): void {
  habits.value = habits.value.filter(habit => habit.id !== habitId)
  saveHabits()
}

function openCreateModal(): void {
  newHabitName.value = ''
  isCreateModalOpen.value = true
}

function closeCreateModal(): void {
  isCreateModalOpen.value = false
  newHabitName.value = ''
}

function openSearchModal(): void {
  isSearchModalOpen.value = true
}

function closeSearchModal(): void {
  isSearchModalOpen.value = false
}

function openViewPickerModal(): void {
  isViewPickerModalOpen.value = true
}

function closeViewPickerModal(): void {
  isViewPickerModalOpen.value = false
}

function openView(view: 'notes' | 'vault' | 'habits'): void {
  closeViewPickerModal()
  if (view === activeView.value) return
  if (view === 'vault') {
    void router.push('/vault')
    return
  }
  if (view === 'habits') {
    void router.push('/habits')
    return
  }
  void router.push('/notes')
}

function updateSearchQuery(value: string): void {
  searchQuery.value = value
}

function openSettingsModal(): void {
  isSettingsModalOpen.value = true
}

function closeSettingsModal(): void {
  isSettingsModalOpen.value = false
}

function openAboutModal(): void {
  isAboutModalOpen.value = true
}

function closeAboutModal(): void {
  isAboutModalOpen.value = false
}

function updateLanguage(value: 'ru' | 'en'): void {
  settingsStore.updateSettings({ language: value })
}

function updateTheme(value: 'light' | 'dark'): void {
  settingsStore.updateSettings({ theme: value })
}

async function handleExportData(): Promise<void> {
  const result = await exportAllData()
  if (result.status === 'success') {
    window.alert(`${t('exportDataSuccess')}.\n${result.path}`)
    return
  }
  if (result.status === 'error') {
    window.alert(t('exportDataError'))
  }
}

function requestDeleteHabit(habitId: string): void {
  pendingDeleteHabitId.value = habitId
  isDeleteConfirmModalOpen.value = true
}

function closeDeleteConfirm(): void {
  isDeleteConfirmModalOpen.value = false
  pendingDeleteHabitId.value = null
}

function confirmDeleteHabit(): void {
  if (!pendingDeleteHabitId.value) return
  deleteHabit(pendingDeleteHabitId.value)
  closeDeleteConfirm()
}

onMounted(() => {
  settingsStore.init()
  loadHabits()
})
</script>

<template>
  <section :class="$style.habitsView">
    <div :class="$style.canvas" :style="canvasStyle">
      <article
        v-for="habit in filteredHabits"
        :key="habit.id"
        :class="[$style.card, { [$style.cardDone]: isHabitDoneToday(habit) }]"
      >
        <h3 :class="$style.cardTitle">{{ habit.name }}</h3>

        <div :class="$style.actions">
          <button
            type="button"
            :class="[$style.cardAction, { [$style.cardActionActive]: isHabitDoneToday(habit) }]"
            @click="toggleHabitDone(habit.id)"
          >
            <Check :size="14" />
          </button>

          <button
            type="button"
            :class="$style.cardAction"
            :title="t('habitsDeleteTitle')"
            @click="requestDeleteHabit(habit.id)"
          >
            <Trash2 :size="14" />
          </button>
        </div>
      </article>
    </div>

    <SheetModal
      :is-open="isCreateModalOpen"
      :overlay-class="$style.modalOverlay"
      :sheet-class="$style.modalSheet"
      :close-button-class="$style.modalClose"
      :title-class="$style.modalTitle"
      :title="t('habitsHeaderTitle')"
      :close-title="t('close')"
      @close="closeCreateModal"
    >
      <form :class="$style.modalContent" @submit.prevent="addHabit">
        <input
          v-model.trim="newHabitName"
          :class="$style.modalInput"
          :placeholder="t('habitsAddPlaceholder')"
        />
        <button
          type="submit"
          :class="$style.modalCreateButton"
          :disabled="newHabitName.length === 0"
        >
          {{ t('habitsAddButton') }}
        </button>
      </form>
    </SheetModal>

    <ConfirmSheet
      :is-open="isDeleteConfirmModalOpen"
      :title="t('deleteConfirmTitle')"
      :message="t('habitsDeleteTitle')"
      :cancel-label="t('cancelButton')"
      :confirm-label="t('deleteButton')"
      :styles="$style"
      @close="closeDeleteConfirm"
      @cancel="closeDeleteConfirm"
      @confirm="confirmDeleteHabit"
    />

    <SearchSheet
      :is-open="isSearchModalOpen"
      :title="t('searchTitle')"
      :close-title="t('close')"
      :placeholder="t('searchPlaceholder')"
      :model-value="searchQuery"
      :styles="$style"
      @close="closeSearchModal"
      @update:model-value="updateSearchQuery"
    />

    <SheetModal
      :is-open="isSettingsModalOpen"
      :overlay-class="$style.modalOverlay"
      :sheet-class="$style.modalSheet"
      :close-button-class="$style.modalClose"
      :title-class="$style.modalTitle"
      :title="t('settingsTitle')"
      :close-title="t('close')"
      @close="closeSettingsModal"
    >
      <div :class="$style.settingsGroup">
        <span :class="$style.settingsLabel">{{ t('languageSetting') }}</span>
        <div :class="$style.settingsOptions">
          <button
            type="button"
            :class="[
              $style.settingsOption,
              { [$style.settingsOptionActive]: settingsStore.settings.language === 'ru' },
            ]"
            @click="updateLanguage('ru')"
          >
            Русский
          </button>
          <button
            type="button"
            :class="[
              $style.settingsOption,
              { [$style.settingsOptionActive]: settingsStore.settings.language === 'en' },
            ]"
            @click="updateLanguage('en')"
          >
            English
          </button>
        </div>
      </div>
      <div :class="$style.settingsGroup">
        <span :class="$style.settingsLabel">{{ t('themeSetting') }}</span>
        <div :class="$style.settingsOptions">
          <button
            type="button"
            :class="[
              $style.settingsOption,
              { [$style.settingsOptionActive]: settingsStore.settings.theme === 'light' },
            ]"
            @click="updateTheme('light')"
          >
            {{ t('themeLight') }}
          </button>
          <button
            type="button"
            :class="[
              $style.settingsOption,
              { [$style.settingsOptionActive]: settingsStore.settings.theme === 'dark' },
            ]"
            @click="updateTheme('dark')"
          >
            {{ t('themeDark') }}
          </button>
        </div>
      </div>
      <div :class="$style.settingsGroup">
        <span :class="$style.settingsLabel">{{ t('canvasBackgroundSetting') }}</span>
        <div :class="$style.settingsOptions">
          <input
            :id="canvasBackgroundInputId"
            type="file"
            accept="image/*"
            :class="$style.hiddenInput"
            @change="applyCanvasBackgroundFromEvent"
          />
          <label
            :for="canvasBackgroundInputId"
            :class="$style.settingsOption"
          >
            {{ t('canvasBackgroundUploadButton') }}
          </label>
          <button
            type="button"
            :class="$style.settingsOption"
            :disabled="!hasCanvasBackground"
            @click="clearCanvasBackground"
          >
            {{ t('canvasBackgroundResetButton') }}
          </button>
        </div>
        <p v-if="hasCanvasBackground" :class="$style.settingsHint">
          {{ t('canvasBackgroundApplied') }}
        </p>
      </div>
      <div :class="$style.settingsGroup">
        <span :class="$style.settingsLabel">{{ t('exportDataSetting') }}</span>
        <div :class="$style.settingsOptions">
          <button
            type="button"
            :class="$style.settingsOption"
            style="grid-column: 1 / -1;"
            :disabled="isExporting"
            @click="handleExportData"
          >
            {{ t('exportDataButton') }}
          </button>
        </div>
      </div>
    </SheetModal>

    <SheetModal
      :is-open="isAboutModalOpen"
      :overlay-class="$style.modalOverlay"
      :sheet-class="$style.modalSheet"
      :close-button-class="$style.modalClose"
      :title-class="$style.modalTitle"
      :title="t('aboutTitle')"
      :close-title="t('close')"
      @close="closeAboutModal"
    >
      <div :class="$style.aboutContent">
        <p :class="$style.aboutDescription">{{ t('aboutDescription') }}</p>
        <a
          :class="$style.aboutGithubButton"
          :href="githubUrl"
          target="_blank"
          rel="noopener noreferrer"
        >
          {{ t('aboutGithubButton') }}
        </a>
      </div>
    </SheetModal>

    <SheetModal
      :is-open="isViewPickerModalOpen"
      :overlay-class="$style.modalOverlay"
      :sheet-class="$style.modalSheet"
      :close-button-class="$style.modalClose"
      :title-class="$style.modalTitle"
      :title="t('view')"
      :close-title="t('close')"
      @close="closeViewPickerModal"
    >
      <div :class="$style.settingsGroup">
        <span :class="$style.settingsLabel">Select view</span>
        <div :class="$style.settingsOptions">
          <button
            :class="[$style.settingsOption, { [$style.settingsOptionActive]: activeView === 'notes' }]"
            type="button"
            @click="openView('notes')"
          >
            {{ t('notesViewTitle') }}
          </button>
          <button
            :class="[$style.settingsOption, { [$style.settingsOptionActive]: activeView === 'vault' }]"
            type="button"
            @click="openView('vault')"
          >
            {{ t('vaultViewTitle') }}
          </button>
          <button
            :class="[$style.settingsOption, { [$style.settingsOptionActive]: activeView === 'habits' }]"
            type="button"
            @click="openView('habits')"
          >
            {{ t('habitsViewTitle') }}
          </button>
        </div>
      </div>
    </SheetModal>

    <nav :class="$style.bottomDock">
      <button
        :class="[$style.dockButton, { [$style.dockButtonActive]: isCreateModalOpen }]"
        type="button"
        :title="t('habitsAddButton')"
        @click="openCreateModal"
      >
        <SquarePlus :size="24" />
      </button>
      <button
        :class="[$style.dockButton, { [$style.dockButtonActive]: isSearchModalOpen }]"
        type="button"
        :title="t('searchTitle')"
        @click="openSearchModal"
      >
        <Search :size="24" />
      </button>
      <button
        :class="[$style.dockButton, { [$style.dockButtonActive]: isViewPickerModalOpen }]"
        type="button"
        title="View"
        @click="openViewPickerModal"
      >
      <Grid2x2 :size="24" />
      </button>
      <button
        :class="[$style.dockButton, { [$style.dockButtonActive]: isSettingsModalOpen }]"
        type="button"
        :title="t('settingsTitle')"
        @click="openSettingsModal"
      >
        <Cog :size="24" />
      </button>
      <button
        :class="[$style.dockButton, { [$style.dockButtonActive]: isAboutModalOpen }]"
        type="button"
        :title="t('aboutTitle')"
        @click="openAboutModal"
      >
        <Box :size="24" />
      </button>
    </nav>
  </section>
</template>

<style lang="scss" module src="./HabitsView.module.scss"></style>
