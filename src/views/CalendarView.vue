<template>
  <div :class="$style.calendarView">
    <div :class="$style.calendarContent">
      <!-- Заголовок и навигация -->
      <div :class="$style.calendarHeader">
        <div :class="$style.headerActions">
          <button :class="$style.btnIcon" @click="previousMonth">‹</button>
          <span :class="$style.currentMonth">{{ formatMonth(currentDate) }}</span>
          <button :class="$style.btnIcon" @click="nextMonth">›</button>
          <button :class="$style.btn" @click="goToToday">Сегодня</button>
        </div>
      </div>

      <div :class="$style.calendarGrid">
        <div :class="$style.weekdayHeader" v-for="day in weekDays" :key="day">
          {{ day }}
        </div>

        <div
          v-for="day in calendarDays"
          :key="day.date"
          :class="[
            $style.calendarDay,
            { [$style.otherMonth]: !day.currentMonth },
            { [$style.today]: day.isToday },
            { [$style.selected]: day.date === selectedDate },
            { [$style.hasEntries]: day.hasEntries }
          ]"
          @click="selectDate(day.date)"
        >
          <span :class="$style.dayNumber">{{ day.dayOfMonth }}</span>
          <span v-if="day.hasEntries" :class="$style.entriesIndicator"></span>
        </div>
      </div>

      <div :class="$style.selectedDateInfo">
        <h3>Записи на {{ formatDate(selectedDate) }}</h3>
        <div :class="$style.entriesPreview">
          <div v-if="selectedEntries.length === 0" :class="$style.noEntries">
            Нет записей
          </div>
          <div v-else :class="$style.entriesList">
            <div
              v-for="entry in selectedEntries"
              :key="entry.id"
              :class="$style.entryItem"
              @click="selectDateAndOpen(entry.date)"
            >
              <span :class="$style.entryTitle">{{ entry.title }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useDiaryStore } from '@/stores'

const diaryStore = useDiaryStore()

const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
const currentDate = ref(new Date())
const selectedDate = ref(new Date().toISOString().split('T')[0])

const calendarDays = computed(() => {
  const year = currentDate.value.getFullYear()
  const month = currentDate.value.getMonth()

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const startDayOfWeek = firstDay.getDay() || 7
  const daysBeforeMonth = startDayOfWeek - 1

  const days: Array<{
    date: string
    dayOfMonth: number
    currentMonth: boolean
    isToday: boolean
    hasEntries: boolean
  }> = []

  const today = new Date().toISOString().split('T')[0]

  for (let i = daysBeforeMonth; i > 0; i--) {
    const date = new Date(year, month, -i + 1)
    const dateStr = date.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      dayOfMonth: date.getDate(),
      currentMonth: false,
      isToday: dateStr === today,
      hasEntries: diaryStore.getEntriesByDate(dateStr).length > 0,
    })
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(year, month, i)
    const dateStr = date.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      dayOfMonth: i,
      currentMonth: true,
      isToday: dateStr === today,
      hasEntries: diaryStore.getEntriesByDate(dateStr).length > 0,
    })
  }

  const daysAfterMonth = 42 - days.length
  for (let i = 1; i <= daysAfterMonth; i++) {
    const date = new Date(year, month + 1, i)
    const dateStr = date.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      dayOfMonth: i,
      currentMonth: false,
      isToday: dateStr === today,
      hasEntries: diaryStore.getEntriesByDate(dateStr).length > 0,
    })
  }

  return days
})

const selectedEntries = computed(() => {
  return diaryStore.getEntriesByDate(selectedDate.value)
})

function formatMonth(date: Date): string {
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

function previousMonth(): void {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() - 1,
    1
  )
}

function nextMonth(): void {
  currentDate.value = new Date(
    currentDate.value.getFullYear(),
    currentDate.value.getMonth() + 1,
    1
  )
}

function goToToday(): void {
  currentDate.value = new Date()
  selectedDate.value = new Date().toISOString().split('T')[0]
}

function selectDate(date: string): void {
  selectedDate.value = date
  diaryStore.selectedDate = date
}

function selectDateAndOpen(date: string): void {
  selectDate(date)
}
</script>

<style lang="scss" module src="./CalendarView.module.scss"></style>
