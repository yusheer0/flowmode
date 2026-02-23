<template>
  <div class="calendar-view">
    <header class="view-header">
      <h2 class="view-title">Календарь</h2>
      <div class="header-actions">
        <button class="btn-icon" @click="previousMonth">‹</button>
        <span class="current-month">{{ formatMonth(currentDate) }}</span>
        <button class="btn-icon" @click="nextMonth">›</button>
        <button class="btn" @click="goToToday">Сегодня</button>
      </div>
    </header>
    
    <div class="calendar-content">
      <div class="calendar-grid">
        <div class="weekday-header" v-for="day in weekDays" :key="day">
          {{ day }}
        </div>
        
        <div 
          v-for="day in calendarDays" 
          :key="day.date"
          class="calendar-day"
          :class="{ 
            'other-month': !day.currentMonth,
            'today': day.isToday,
            'selected': day.date === selectedDate,
            'has-entries': day.hasEntries
          }"
          @click="selectDate(day.date)"
        >
          <span class="day-number">{{ day.dayOfMonth }}</span>
          <span v-if="day.hasEntries" class="entries-indicator"></span>
        </div>
      </div>
      
      <div class="selected-date-info">
        <h3>Записи на {{ formatDate(selectedDate) }}</h3>
        <div class="entries-preview">
          <div v-if="selectedEntries.length === 0" class="no-entries">
            Нет записей
          </div>
          <div v-else class="entries-list">
            <div 
              v-for="entry in selectedEntries" 
              :key="entry.id" 
              class="entry-item"
              @click="selectDateAndOpen(entry.date)"
            >
              <span class="entry-title">{{ entry.title }}</span>
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

<style lang="scss">
.calendar-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.view-header {
  height: 80px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 12px;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.view-title {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-text);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.current-month {
  font-size: 1.125rem;
  font-weight: 500;
  text-transform: capitalize;
  min-width: 180px;
  text-align: center;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  color: var(--color-text);
  background-color: var(--color-bg);
  border: none;
  cursor: pointer;
  transition: background-color var(--transition-fast);

  &:hover {
    background-color: var(--color-border);
  }
}

.btn {
  padding: 8px 16px;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 500;
  background-color: var(--color-primary);
  color: white;
  border: none;
  cursor: pointer;

  &:hover {
    background-color: var(--color-primary-hover);
  }
}

.calendar-content {
  flex: 1;
  padding: 8px;
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 8px;
  overflow: hidden;
  min-height: 0;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 4px;
  box-shadow: var(--shadow-sm);
  height: fit-content;
}

.weekday-header {
  text-align: center;
  font-weight: 600;
  color: var(--color-text-secondary);
  padding: 10px 0;
  font-size: 0.8125rem;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-fast);
  position: relative;
  min-width: 0;

  &:hover {
    background-color: var(--color-bg);
  }

  &.other-month {
    opacity: 0.4;
  }

  &.today {
    background-color: var(--color-primary);
    color: white;

    .day-number {
      color: white;
    }
  }

  &.selected {
    border: 2px solid var(--color-primary);
  }

  &.has-entries::after {
    content: '';
    position: absolute;
    bottom: 4px;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background-color: var(--color-success);
  }
}

.day-number {
  font-size: 0.9375rem;
  font-weight: 500;
  color: var(--color-text);
}

.selected-date-info {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100%;
}

.selected-date-info h3 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--color-text);
  flex-shrink: 0;
}

.entries-preview {
  flex: 1;
  overflow: auto;
  min-height: 0;
}

.no-entries {
  color: var(--color-text-secondary);
  text-align: center;
  padding: 24px 12px;
  font-size: 0.875rem;
}

.entries-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.entry-item {
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background-color var(--transition-fast);
  background-color: var(--color-bg);

  &:hover {
    background-color: var(--color-border);
  }
}

.entry-title {
  font-weight: 500;
  color: var(--color-text);
  font-size: 0.875rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}
</style>
