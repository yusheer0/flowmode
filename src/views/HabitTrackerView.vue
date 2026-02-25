<template>
  <div :class="$style.habitTrackerView">
    <div :class="$style.habitContent">
      <!-- Заголовок и действия -->
      <div :class="$style.header">
        <button :class="[$style.btn, $style.btnPrimary]" @click="openAddHabitModal">
          <span class="material-symbols-rounded">add</span>
          Новая привычка
        </button>
      </div>

      <!-- Статистика за неделю -->
      <div :class="$style.weekStats">
        <div :class="$style.statCard">
          <div :class="$style.statValue">{{ totalHabits }}</div>
          <div :class="$style.statLabel">Всего привычек</div>
        </div>
        <div :class="$style.statCard">
          <div :class="$style.statValue">{{ completedToday }}</div>
          <div :class="$style.statLabel">Выполнено сегодня</div>
        </div>
        <div :class="$style.statCard">
          <div :class="$style.statValue">{{ currentStreak }} 🔥</div>
          <div :class="$style.statLabel">Лучшая серия</div>
        </div>
        <div :class="$style.statCard">
          <div :class="$style.statValue">{{ weekCompletionRate }}%</div>
          <div :class="$style.statLabel">За неделю</div>
        </div>
      </div>

      <!-- Навигация по неделе -->
      <div :class="$style.weekNav">
        <button :class="$style.navBtn" @click="previousWeek">
          <span class="material-symbols-rounded">chevron_left</span>
        </button>
        <div :class="$style.weekRange">
          {{ formatWeekRange(currentWeekStart) }}
        </div>
        <button :class="$style.navBtn" @click="nextWeek">
          <span class="material-symbols-rounded">chevron_right</span>
        </button>
        <button :class="[$style.btn, $style.btnSecondary]" @click="goToToday">
          Сегодня
        </button>
      </div>

      <!-- Список привычек -->
      <div :class="$style.habitsList">
        <div v-if="habits.length === 0" :class="$style.emptyState">
          <span :class="$style.emptyIcon">🌱</span>
          <p>Пока нет привычек. Добавьте первую!</p>
        </div>

        <div v-else :class="$style.habitsGrid">
          <div
            v-for="habit in habits"
            :key="habit.id"
            :class="$style.habitCard"
            :style="{ borderLeftColor: habit.color }"
          >
            <div :class="$style.habitHeader">
              <div :class="$style.habitIcon" :style="{ backgroundColor: habit.color + '20' }">
                {{ habit.icon }}
              </div>
              <div :class="$style.habitInfo">
                <h3 :class="$style.habitName">{{ habit.name }}</h3>
                <div :class="$style.habitStats">
                  <span :class="$style.habitStreak">🔥 {{ getHabitStreak(habit.id) }} дней</span>
                  <span :class="$style.habitRate">{{ getCompletionRate(habit.id) }}%</span>
                </div>
              </div>
              <div :class="$style.habitActions">
                <button :class="$style.editBtn" @click="openEditHabitModal(habit)">
                  <span class="material-symbols-rounded">edit</span>
                </button>
                <button :class="$style.deleteBtn" @click="confirmDeleteHabit(habit.id)">
                  <span class="material-symbols-rounded">delete</span>
                </button>
              </div>
            </div>

            <!-- Дни недели -->
            <div :class="$style.weekDays">
              <div
                v-for="(day, index) in weekDays"
                :key="index"
                :class="[
                  $style.weekDay,
                  { [$style.completed]: isHabitCompletedOnDate(habit.id, day.date) },
                  { [$style.isToday]: day.isToday },
                  { [$style.otherMonth]: !day.currentMonth }
                ]"
                @click="toggleHabit(habit.id, day.date)"
              >
                <div :class="$style.dayName">{{ day.name }}</div>
                <div :class="$style.dayNum">{{ day.dayNum }}</div>
                <div v-if="isHabitCompletedOnDate(habit.id, day.date)" :class="$style.checkmark">
                  <span class="material-symbols-rounded">check</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Модальное окно для добавления/редактирования привычки -->
    <div v-if="showModal" :class="$style.modalOverlay" @click="closeModal">
      <div :class="$style.modal" @click.stop>
        <div :class="$style.modalHeader">
          <h3>{{ isEditing ? 'Редактировать привычку' : 'Новая привычка' }}</h3>
          <button :class="$style.modalClose" @click="closeModal">×</button>
        </div>

        <div :class="$style.modalBody">
          <div :class="$style.formGroup">
            <label :class="$style.label">Название</label>
            <input
              v-model="formData.name"
              type="text"
              :class="$style.input"
              placeholder="Например: Спорт, Чтение"
            />
          </div>

          <div :class="$style.formGroup">
            <label :class="$style.label">Иконка</label>
            <div :class="$style.iconPicker">
              <button
                v-for="icon in habitIcons"
                :key="icon"
                :class="[$style.iconBtn, { [$style.selected]: formData.icon === icon }]"
                @click="formData.icon = icon"
              >
                {{ icon }}
              </button>
            </div>
          </div>

          <div :class="$style.formGroup">
            <label :class="$style.label">Цвет</label>
            <div :class="$style.colorPicker">
              <button
                v-for="color in habitColors"
                :key="color"
                :class="[$style.colorBtn, { [$style.selected]: formData.color === color }]"
                :style="{ backgroundColor: color }"
                @click="formData.color = color"
              ></button>
            </div>
          </div>

          <div :class="$style.formGroup">
            <label :class="$style.label">Частота</label>
            <select v-model="formData.frequency" :class="$style.select">
              <option value="daily">Ежедневно</option>
              <option value="weekly">Несколько раз в неделю</option>
            </select>
          </div>

          <div v-if="formData.frequency === 'weekly'" :class="$style.formGroup">
            <label :class="$style.label">Дни недели</label>
            <div :class="$style.daysPicker">
              <button
                v-for="(day, index) in weekDayNames"
                :key="index"
                :class="[$style.dayBtn, { [$style.selected]: formData.targetDays?.includes(index) }]"
                @click="toggleTargetDay(index)"
              >
                {{ day }}
              </button>
            </div>
          </div>
        </div>

        <div :class="$style.modalFooter">
          <div :class="$style.modalActions">
            <button :class="$style.btn" @click="closeModal">Отмена</button>
            <button :class="[$style.btn, $style.btnPrimary]" @click="saveHabit">Сохранить</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Подтверждение удаления -->
    <div v-if="showDeleteConfirm" :class="$style.modalOverlay" @click="showDeleteConfirm = false">
      <div :class="$style.modal" @click.stop>
        <div :class="$style.modalHeader">
          <h3>Удалить привычку?</h3>
        </div>
        <div :class="$style.modalBody">
          <p>Все данные о выполнении этой привычки будут удалены.</p>
        </div>
        <div :class="$style.modalFooter">
          <div :class="$style.modalActions">
            <button :class="$style.btn" @click="showDeleteConfirm = false">Отмена</button>
            <button :class="[$style.btn, $style.btnDanger]" @click="deleteHabit">Удалить</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useHabitsStore } from '@/stores'
import type { Habit } from '@/types'

const habitsStore = useHabitsStore()

const currentWeekStart = ref(getWeekStart(new Date()))
const showModal = ref(false)
const isEditing = ref(false)
const editingId = ref<string | null>(null)
const showDeleteConfirm = ref(false)
const deletingId = ref<string | null>(null)

const formData = ref<Partial<Habit>>({
  name: '',
  icon: '🏃',
  color: '#4a90d9',
  frequency: 'daily',
  targetDays: [],
})

const habitIcons = ['🏃', '📚', '💧', '🧘', '📝', '🎯', '💪', '🥗', '😴', '🎨', '🎵', '✈️']
const habitColors = [
  '#e74c3c', '#e67e22', '#f39c12', '#f1c40f',
  '#27ae60', '#2ecc71', '#4a90d9', '#9b59b6',
  '#e91e63', '#00bcd4', '#607d8b', '#795548',
]

const weekDayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб']

const habits = computed(() => habitsStore.habits)

const totalHabits = computed(() => habits.value.length)

const completedToday = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return habits.value.filter(h => h.completedDates.includes(today)).length
})

const currentStreak = computed(() => {
  const maxStreak = Math.max(...habits.value.map(h => habitsStore.getHabitStreak(h.id)), 0)
  return maxStreak
})

const weekCompletionRate = computed(() => {
  const stats = habitsStore.getWeeklyStats()
  const total = stats.reduce((sum, s) => sum + s.target, 0)
  const completed = stats.reduce((sum, s) => sum + s.completed, 0)
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
})

const weekDays = computed(() => {
  const days = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(currentWeekStart.value)
    date.setDate(date.getDate() + i)
    const dateStr = date.toISOString().split('T')[0]
    const today = new Date().toISOString().split('T')[0]
    days.push({
      date: dateStr,
      name: weekDayNames[date.getDay()],
      dayNum: date.getDate(),
      isToday: dateStr === today,
      currentMonth: date.getMonth() === new Date().getMonth(),
    })
  }
  return days
})

function getWeekStart(date: Date): string {
  const d = new Date(date)
  d.setDate(d.getDate() - d.getDay())
  return d.toISOString().split('T')[0]
}

function formatWeekRange(weekStart: string): string {
  const start = new Date(weekStart)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)

  const sameMonth = start.getMonth() === end.getMonth()
  const sameYear = start.getFullYear() === end.getFullYear()

  const startStr = start.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: sameMonth ? undefined : 'short',
    year: sameYear ? undefined : 'numeric',
  })

  const endStr = end.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return `${startStr} — ${endStr}`
}

function previousWeek() {
  const date = new Date(currentWeekStart.value)
  date.setDate(date.getDate() - 7)
  currentWeekStart.value = getWeekStart(date)
}

function nextWeek() {
  const date = new Date(currentWeekStart.value)
  date.setDate(date.getDate() + 7)
  currentWeekStart.value = getWeekStart(date)
}

function goToToday() {
  currentWeekStart.value = getWeekStart(new Date())
}

function isHabitCompletedOnDate(habitId: string, date: string): boolean {
  return habitsStore.isCompleted(habitId, date)
}

function toggleHabit(habitId: string, date: string) {
  habitsStore.toggleComplete(habitId, date)
}

function getHabitStreak(habitId: string): number {
  return habitsStore.getHabitStreak(habitId)
}

function getCompletionRate(habitId: string): number {
  return habitsStore.getCompletionRate(habitId, 30)
}

function openAddHabitModal() {
  isEditing.value = false
  editingId.value = null
  formData.value = {
    name: '',
    icon: '🏃',
    color: '#4a90d9',
    frequency: 'daily',
    targetDays: [],
  }
  showModal.value = true
}

function openEditHabitModal(habit: Habit) {
  isEditing.value = true
  editingId.value = habit.id
  formData.value = {
    name: habit.name,
    icon: habit.icon,
    color: habit.color,
    frequency: habit.frequency,
    targetDays: habit.targetDays ? [...habit.targetDays] : [],
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
}

function saveHabit() {
  if (!formData.value.name) return

  const now = new Date().toISOString()

  if (isEditing.value && editingId.value) {
    habitsStore.updateHabit(editingId.value, {
      name: formData.value.name!,
      icon: formData.value.icon!,
      color: formData.value.color!,
      frequency: formData.value.frequency!,
      targetDays: formData.value.targetDays,
    })
  } else {
    const newHabit: Habit = {
      id: crypto.randomUUID(),
      name: formData.value.name!,
      icon: formData.value.icon!,
      color: formData.value.color!,
      frequency: formData.value.frequency!,
      targetDays: formData.value.targetDays,
      completedDates: [],
      createdAt: now,
    }
    habitsStore.addHabit(newHabit)
  }

  closeModal()
}

function toggleTargetDay(index: number) {
  if (!formData.value.targetDays) {
    formData.value.targetDays = []
  }
  const idx = formData.value.targetDays.indexOf(index)
  if (idx === -1) {
    formData.value.targetDays.push(index)
  } else {
    formData.value.targetDays.splice(idx, 1)
  }
}

function confirmDeleteHabit(id: string) {
  deletingId.value = id
  showDeleteConfirm.value = true
}

function deleteHabit() {
  if (deletingId.value) {
    habitsStore.deleteHabit(deletingId.value)
    showDeleteConfirm.value = false
    deletingId.value = null
  }
}
</script>

<style lang="scss" module src="./HabitTrackerView.module.scss"></style>
