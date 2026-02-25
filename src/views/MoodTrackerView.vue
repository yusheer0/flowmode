<template>
  <div :class="$style.moodTrackerView">
    <div :class="$style.moodContent">
      <!-- Статистика -->
      <div :class="$style.stats">
        <div :class="$style.statCard">
          <div :class="$style.statValue">
            {{ moodEmojis[ Math.round(averageMood) as keyof typeof moodEmojis ] || '😐' }}
          </div>
          <div :class="$style.statLabel">Среднее настроение</div>
          <div :class="$style.statDetail">{{ averageMood }} / 5</div>
        </div>
        <div :class="$style.statCard">
          <div :class="$style.statValue">
            {{ moodTrend === 'up' ? '📈' : moodTrend === 'down' ? '📉' : '➡️' }}
          </div>
          <div :class="$style.statLabel">Тренд</div>
          <div :class="$style.statDetail">{{ moodTrendLabel }}</div>
        </div>
        <div :class="$style.statCard">
          <div :class="$style.statValue">{{ totalEntries }}</div>
          <div :class="$style.statLabel">Записей</div>
          <div :class="$style.statDetail">за 30 дней</div>
        </div>
        <div :class="$style.statCard">
          <div :class="$style.statValue">{{ topActivity?.activity || '—' }}</div>
          <div :class="$style.statLabel">Лучшая активность</div>
          <div :class="$style.statDetail">{{ topActivity?.count || 0 }} раз</div>
        </div>
      </div>

      <!-- Календарь настроения -->
      <div :class="$style.calendarSection">
        <div :class="$style.calendarHeader">
          <button :class="$style.navBtn" @click="previousMonth">
            <span class="material-symbols-rounded">chevron_left</span>
          </button>
          <h3 :class="$style.monthTitle">{{ formatMonth(currentDate) }}</h3>
          <button :class="$style.navBtn" @click="nextMonth">
            <span class="material-symbols-rounded">chevron_right</span>
          </button>
        </div>

        <div :class="$style.calendarGrid">
          <div :class="$style.weekdayHeader" v-for="day in weekDays" :key="day">{{ day }}</div>
          <div
            v-for="day in calendarDays"
            :key="day.date"
            :class="[
              $style.calendarDay,
              { [$style.otherMonth]: !day.currentMonth },
              { [$style.today]: day.isToday },
              { [$style.hasMood]: day.moodEntry }
            ]"
            :style="day.moodEntry ? { backgroundColor: getMoodColor(day.moodEntry.mood) } : {}"
            @click="openMoodModal(day.date)"
          >
            <span :class="$style.dayNumber">{{ day.dayOfMonth }}</span>
            <span v-if="day.moodEntry" :class="$style.moodEmoji">{{ moodEmojis[day.moodEntry.mood] }}</span>
          </div>
        </div>
      </div>

      <!-- Корреляции с активностями -->
      <div :class="$style.correlationsSection">
        <h3 :class="$style.sectionTitle">Влияние активностей на настроение</h3>
        <div :class="$style.correlationsList">
          <div
            v-for="corr in moodCorrelations"
            :key="corr.activity"
            :class="$style.correlationItem"
          >
            <div :class="$style.correlationHeader">
              <span :class="$style.correlationActivity">{{ corr.activity }}</span>
              <span :class="$style.correlationValue">{{ corr.emoji }}</span>
            </div>
            <div :class="$style.correlationBar">
              <div
                :class="$style.correlationFill"
                :style="{
                  width: (corr.correlation / 5 * 100) + '%',
                  backgroundColor: getMoodColor(corr.correlation as 1 | 2 | 3 | 4 | 5)
                }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Последние записи -->
      <div :class="$style.recentSection">
        <h3 :class="$style.sectionTitle">Последние записи</h3>
        <div :class="$style.recentList">
          <div
            v-for="entry in recentEntries"
            :key="entry.id"
            :class="$style.recentItem"
            :style="{ borderLeftColor: getMoodColor(entry.mood) }"
          >
            <div :class="$style.recentHeader">
              <span :class="$style.recentDate">{{ formatDate(entry.date) }}</span>
              <span :class="$style.recentMood">{{ moodEmojis[entry.mood] }}</span>
            </div>
            <p v-if="entry.note" :class="$style.recentNote">{{ entry.note }}</p>
            <div v-if="entry.activities.length > 0" :class="$style.recentActivities">
              <span
                v-for="activity in entry.activities"
                :key="activity"
                :class="$style.activityTag"
              >
                {{ activity }}
              </span>
            </div>
            <div :class="$style.recentActions">
              <button :class="$style.actionBtn" @click="editMoodEntry(entry)">
                <span class="material-symbols-rounded">edit</span>
              </button>
              <button :class="$style.actionBtn" @click="deleteMoodEntry(entry.id)">
                <span class="material-symbols-rounded">delete</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно для записи настроения -->
    <div v-if="showMoodModal" :class="$style.modalOverlay" @click="closeMoodModal">
      <div :class="$style.modal" @click.stop>
        <div :class="$style.modalHeader">
          <h3>{{ editingEntry ? 'Редактировать' : 'Как ваше настроение?' }}</h3>
          <button :class="$style.modalClose" @click="closeMoodModal">×</button>
        </div>

        <div :class="$style.modalBody">
          <div :class="$style.dateLabel">
            {{ formatDate(selectedDate) }}
          </div>

          <!-- Выбор настроения -->
          <div :class="$style.moodSelector">
            <button
              v-for="level in [1, 2, 3, 4, 5]"
              :key="level"
              :class="[
                $style.moodOption,
                { [$style.selected]: formData.mood === level }
              ]"
              @click="formData.mood = level as MoodLevel"
            >
              <span :class="$style.moodEmoji">{{ moodEmojis[level as keyof typeof moodEmojis] }}</span>
              <span :class="$style.moodLabel">{{ moodLabels[level as keyof typeof moodLabels] }}</span>
            </button>
          </div>

          <!-- Выбор активностей -->
          <div :class="$style.activitiesSection">
            <label :class="$style.label">Чем занимались?</label>
            <div :class="$style.activitiesGrid">
              <button
                v-for="activity in defaultActivities"
                :key="activity"
                :class="[
                  $style.activityBtn,
                  { [$style.selected]: formData.activities.includes(activity) }
                ]"
                @click="toggleActivity(activity)"
              >
                {{ activity }}
              </button>
            </div>
          </div>

          <!-- Заметка -->
          <div :class="$style.noteSection">
            <label :class="$style.label">Заметка (необязательно)</label>
            <textarea
              v-model="formData.note"
              :class="$style.textarea"
              placeholder="Что повлияло на ваше настроение?"
              rows="3"
            ></textarea>
          </div>
        </div>

        <div :class="$style.modalFooter">
          <div :class="$style.modalActions">
            <button :class="$style.btn" @click="closeMoodModal">Отмена</button>
            <button
              v-if="editingEntry"
              :class="[$style.btn, $style.btnDanger]"
              @click="deleteMoodEntry(editingEntry.id)"
            >
              Удалить
            </button>
            <button :class="[$style.btn, $style.btnPrimary]" @click="saveMoodEntry">
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMoodStore } from '@/stores'
import type { MoodEntry, MoodLevel } from '@/types'

const moodStore = useMoodStore()

const currentDate = ref(new Date())
const selectedDate = ref(new Date().toISOString().split('T')[0])
const showMoodModal = ref(false)
const editingEntry = ref<MoodEntry | null>(null)

const formData = ref<Partial<MoodEntry>>({
  mood: 3,
  note: '',
  activities: [],
}) as any

const weekDays = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

const moodEmojis = computed(() => moodStore.moodEmojis)
const moodLabels = computed(() => moodStore.moodLabels)
const defaultActivities = computed(() => moodStore.defaultActivities)

const moodEntries = computed(() => moodStore.moodEntries)

const averageMood = computed(() => moodStore.getAverageMood(30))

const moodTrend = computed(() => moodStore.getMoodTrend())

const moodTrendLabel = computed(() => {
  switch (moodTrend.value) {
    case 'up': return 'Улучшается'
    case 'down': return 'Ухудшается'
    default: return 'Стабильно'
  }
})

const totalEntries = computed(() => {
  const today = new Date()
  const cutoff = new Date(today.getTime() - 30 * 86400000)
  return moodEntries.value.filter(e => new Date(e.date) >= cutoff).length
})

const topActivity = computed(() => {
  const activities = moodStore.getMostFrequentActivities()
  return activities[0] || null
})

const moodCorrelations = computed(() => {
  return moodStore.getMoodCorrelations().slice(0, 5).map(c => ({
    ...c,
    emoji: moodEmojis.value[Math.round(c.correlation) as keyof typeof moodEmojis.value] || '😐',
  }))
})

const recentEntries = computed(() => {
  return [...moodEntries.value]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10)
})

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()
  const today = new Date().toISOString().split('T')[0]

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDay = firstDay.getDay()
  const totalDays = lastDay.getDate()

  const days = []

  // Дни предыдущего месяца
  const prevMonth = new Date(year, month, 0)
  for (let i = startDay - 1; i >= 0; i--) {
    const date = new Date(year, month - 1, prevMonth.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      dayOfMonth: date.getDate(),
      currentMonth: false,
      isToday: dateStr === today,
      moodEntry: moodEntries.value.find(e => e.date === dateStr),
    })
  }

  // Дни текущего месяца
  for (let i = 1; i <= totalDays; i++) {
    const date = new Date(year, month, i)
    const dateStr = date.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      dayOfMonth: i,
      currentMonth: true,
      isToday: dateStr === today,
      moodEntry: moodEntries.value.find(e => e.date === dateStr),
    })
  }

  // Дни следующего месяца
  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    const date = new Date(year, month + 1, i)
    const dateStr = date.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      dayOfMonth: i,
      currentMonth: false,
      isToday: dateStr === today,
      moodEntry: moodEntries.value.find(e => e.date === dateStr),
    })
  }

  return days
})

function formatMonth(date: Date): string {
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function getMoodColor(mood: MoodLevel | number): string {
  const colors: Record<number, string> = {
    1: '#e74c3c40',
    2: '#e67e2240',
    3: '#f1c40f40',
    4: '#2ecc7140',
    5: '#27ae6040',
  }
  return colors[Math.round(mood)] || colors[3]
}

function previousMonth() {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() - 1)
}

function nextMonth() {
  currentDate.value = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 1)
}

function openMoodModal(date: string) {
  selectedDate.value = date
  const existing = moodStore.getMoodEntry(date)
  if (existing) {
    editingEntry.value = existing
    formData.value = {
      mood: existing.mood,
      note: existing.note,
      activities: [...existing.activities],
    }
  } else {
    editingEntry.value = null
    formData.value = {
      mood: 3,
      note: '',
      activities: [],
    }
  }
  showMoodModal.value = true
}

function closeMoodModal() {
  showMoodModal.value = false
  editingEntry.value = null
}

function toggleActivity(activity: string) {
  const index = formData.value.activities?.indexOf(activity) ?? -1
  if (index === -1) {
    formData.value.activities?.push(activity)
  } else {
    formData.value.activities?.splice(index, 1)
  }
}

function saveMoodEntry() {
  if (!formData.value.mood) return

  const now = new Date().toISOString()

  const entry: MoodEntry = {
    id: editingEntry.value?.id || crypto.randomUUID(),
    date: selectedDate.value,
    mood: formData.value.mood,
    note: formData.value.note,
    activities: formData.value.activities || [],
    createdAt: now,
  }

  moodStore.addMoodEntry(entry)
  closeMoodModal()
}

function editMoodEntry(entry: MoodEntry) {
  openMoodModal(entry.date)
}

function deleteMoodEntry(id: string) {
  moodStore.deleteMoodEntry(id)
  if (editingEntry.value?.id === id) {
    closeMoodModal()
  }
}
</script>

<style lang="scss" module src="./MoodTrackerView.module.scss"></style>
