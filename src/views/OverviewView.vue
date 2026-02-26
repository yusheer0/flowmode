<template>
  <div :class="$style.overviewView">
    <div :class="$style.overviewContent">
      <div :class="$style.header">
        <h2 :class="$style.pageTitle">Обзор</h2>
        <p :class="$style.currentDate">{{ currentDateFormatted }}</p>
      </div>

      <!-- Основные показатели -->
      <div :class="$style.statsCards">
        <div :class="$style.statCard">
          <div :class="$style.statIcon">📋</div>
          <div :class="$style.statValue">{{ totalEntries }}</div>
          <div :class="$style.statLabel">Всего задач</div>
        </div>

        <div :class="$style.statCard">
          <div :class="$style.statIcon">✅</div>
          <div :class="$style.statValue">{{ completedEntries }}</div>
          <div :class="$style.statLabel">Выполнено</div>
        </div>

        <div :class="$style.statCard">
          <div :class="$style.statIcon">⏳</div>
          <div :class="$style.statValue">{{ pendingEntries }}</div>
          <div :class="$style.statLabel">В процессе</div>
        </div>

        <div :class="$style.statCard">
          <div :class="$style.statIcon">📊</div>
          <div :class="$style.statValue">{{ completionRate }}%</div>
          <div :class="$style.statLabel">Процент выполнения</div>
        </div>
      </div>

      <!-- Прогресс выполнения -->
      <div :class="$style.progressSection">
        <h3 :class="$style.sectionTitle">Общий прогресс</h3>
        <div :class="$style.progressContainer">
          <div :class="$style.progressBar">
            <div
              :class="[
                $style.progressFill,
                { [$style.lowProgress]: completionRate < 30 },
                { [$style.mediumProgress]: completionRate >= 30 && completionRate < 70 },
                { [$style.highProgress]: completionRate >= 70 }
              ]"
              :style="{ width: `${completionRate}%` }"
            ></div>
          </div>
          <span :class="$style.progressText">{{ completedEntries }} из {{ totalEntries }}</span>
        </div>
      </div>

      <!-- Задачи по дням -->
      <div :class="$style.tasksByDays">
        <!-- Вчера -->
        <div :class="$style.daySection">
          <div :class="$style.dayHeader">
            <h3 :class="$style.dayTitle">
              <span>Вчера</span>
              <span :class="$style.dayDate">{{ yesterdayFormatted }}</span>
            </h3>
            <span :class="[$style.dayCount, $style.countYesterday]">{{ yesterdayTasks.length }}</span>
          </div>
          <div :class="$style.taskList">
            <div v-if="yesterdayTasks.length === 0" :class="$style.emptyDay">
              Нет задач
            </div>
            <div
              v-else
              v-for="task in yesterdayTasks"
              :key="task.id"
              :class="[
                $style.taskItem,
                { [$style.taskCompleted]: task.completed },
                $style['priority' + capitalize(task.priority || 'medium')]
              ]"
              @click="toggleComplete(task)"
            >
              <input
                type="checkbox"
                :checked="!!task.completed"
                @click.stop="toggleComplete(task)"
                :class="$style.taskCheckbox"
              />
              <span :class="$style.taskTitle">{{ task.title }}</span>
            </div>
          </div>
        </div>

        <!-- Сегодня -->
        <div :class="$style.daySection">
          <div :class="$style.dayHeader">
            <h3 :class="$style.dayTitle">
              <span>Сегодня</span>
              <span :class="$style.dayDate">{{ todayFormatted }}</span>
            </h3>
            <span :class="[$style.dayCount, $style.countToday]">{{ todayTasks.length }}</span>
          </div>
          <div :class="$style.taskList">
            <div v-if="todayTasks.length === 0" :class="$style.emptyDay">
              Нет задач
            </div>
            <div
              v-else
              v-for="task in todayTasks"
              :key="task.id"
              :class="[
                $style.taskItem,
                { [$style.taskCompleted]: task.completed },
                $style['priority' + capitalize(task.priority || 'medium')]
              ]"
              @click="toggleComplete(task)"
            >
              <input
                type="checkbox"
                :checked="!!task.completed"
                @click.stop="toggleComplete(task)"
                :class="$style.taskCheckbox"
              />
              <span :class="$style.taskTitle">{{ task.title }}</span>
            </div>
          </div>
        </div>

        <!-- Завтра -->
        <div :class="$style.daySection">
          <div :class="$style.dayHeader">
            <h3 :class="$style.dayTitle">
              <span>Завтра</span>
              <span :class="$style.dayDate">{{ tomorrowFormatted }}</span>
            </h3>
            <span :class="[$style.dayCount, $style.countTomorrow]">{{ tomorrowTasks.length }}</span>
          </div>
          <div :class="$style.taskList">
            <div v-if="tomorrowTasks.length === 0" :class="$style.emptyDay">
              Нет задач
            </div>
            <div
              v-else
              v-for="task in tomorrowTasks"
              :key="task.id"
              :class="[
                $style.taskItem,
                { [$style.taskCompleted]: task.completed },
                $style['priority' + capitalize(task.priority || 'medium')]
              ]"
              @click="toggleComplete(task)"
            >
              <input
                type="checkbox"
                :checked="!!task.completed"
                @click.stop="toggleComplete(task)"
                :class="$style.taskCheckbox"
              />
              <span :class="$style.taskTitle">{{ task.title }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Серии и достижения -->
      <div :class="$style.streakSection">
        <h3 :class="$style.sectionTitle">Достижения</h3>
        <div :class="$style.streakCard">
          <div :class="$style.streakIcon">🔥</div>
          <div :class="$style.streakValue">{{ streak }}</div>
          <div :class="$style.streakLabel">Дней подряд с задачами</div>
        </div>
      </div>

      <!-- Пустое состояние -->
      <div v-if="totalEntries === 0" :class="$style.emptyState">
        <p>Пока нет задач. Добавьте первую задачу в разделе "Список"</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDiaryStore } from '@/stores'
import type { DiaryEntry } from '@/types'

const diaryStore = useDiaryStore()

// Получаем данные из store
const totalEntries = computed(() => diaryStore.getTotalEntries())
const completedEntries = computed(() => diaryStore.getCompletedEntries())
const pendingEntries = computed(() => diaryStore.getPendingEntries())
const completionRate = computed(() => diaryStore.getCompletionRate())
const streak = computed(() => diaryStore.getStreak())

// Задачи по дням
const yesterdayTasks = computed(() => diaryStore.getTasksForYesterday())
const todayTasks = computed(() => diaryStore.getTasksForToday())
const tomorrowTasks = computed(() => diaryStore.getTasksForTomorrow())

// Форматирование дат
const today = new Date()
const yesterday = new Date(today)
yesterday.setDate(yesterday.getDate() - 1)
const tomorrow = new Date(today)
tomorrow.setDate(tomorrow.getDate() + 1)

const currentDateFormatted = today.toLocaleDateString('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const yesterdayFormatted = computed(() => {
  return yesterday.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'numeric',
  })
})

const todayFormatted = computed(() => {
  return today.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'numeric',
  })
})

const tomorrowFormatted = computed(() => {
  return tomorrow.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'numeric',
  })
})

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

function toggleComplete(entry: DiaryEntry): void {
  diaryStore.toggleComplete(entry.id)
}
</script>

<style lang="scss" module src="./OverviewView.module.scss"></style>
