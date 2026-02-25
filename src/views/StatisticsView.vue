<template>
  <div :class="$style.statisticsView">
    <div :class="$style.statisticsContent">
      <!-- Основные показатели -->
      <div :class="$style.statsCards">
        <div :class="$style.statCard">
          <div :class="$style.statValue">{{ totalEntries }}</div>
          <div :class="$style.statLabel">Записей</div>
        </div>

        <div :class="$style.statCard">
          <div :class="$style.statValue">{{ completedEntries }}</div>
          <div :class="$style.statLabel">Выполнено</div>
        </div>

        <div :class="$style.statCard">
          <div :class="$style.statValue">{{ pendingEntries }}</div>
          <div :class="$style.statLabel">В процессе</div>
        </div>

        <div :class="$style.statCard">
          <div :class="$style.statValue">{{ streak }}</div>
          <div :class="$style.statLabel">Дней подряд</div>
        </div>
      </div>

      <!-- Прогресс выполнения -->
      <div :class="$style.progressSection">
        <h3 :class="$style.sectionTitle">Прогресс</h3>
        <div :class="$style.progressContainer">
          <div :class="$style.progressBar">
            <div
              :class="[
                $style.progressFill,
                { [$style.lowProgress]: completionRate < 30 },
                { [$style.mediumProgress]: completionRate >= 30 && completionRate < 70 }
              ]"
              :style="{ width: `${completionRate}%` }"
            ></div>
          </div>
        </div>
      </div>

      <!-- Статистика по месяцам -->
      <div :class="$style.statsSection">
        <h3 :class="$style.sectionTitle">Активность по месяцам</h3>
        <div :class="$style.monthlyChart">
          <div
            v-for="month in monthlyStats"
            :key="`${month.year}-${month.monthNum}`"
            :class="$style.monthBar"
          >
            <div :class="$style.monthLabel">{{ month.month }}</div>
            <div :class="$style.barContainer">
              <div :class="$style.bar">
                <div
                  :class="[$style.barFill, $style.completed]"
                  :style="{ height: `${getBarHeight(month.completed, month.total)}%` }"
                  :title="`Выполнено: ${month.completed}`"
                ></div>
                <div
                  :class="[$style.barFill, $style.pending]"
                  :style="{ height: `${getBarHeight(month.total - month.completed, month.total)}%` }"
                  :title="`В процессе: ${month.total - month.completed}`"
                ></div>
              </div>
            </div>
            <div :class="$style.monthValue">{{ month.total }}</div>
          </div>
        </div>
      </div>

      <!-- Статистика по категориям -->
      <div :class="$style.statsSection" v-if="categoriesStats.length > 0">
        <h3 :class="$style.sectionTitle">По категориям</h3>
        <div :class="$style.categoriesList">
          <div
            v-for="category in categoriesStats"
            :key="category.name"
            :class="$style.categoryItem"
          >
            <div :class="$style.categoryInfo">
              <span
                :class="$style.categoryColor"
                :style="{ backgroundColor: category.color }"
              ></span>
              <span :class="$style.categoryName">{{ category.name }}</span>
            </div>
            <span :class="$style.categoryCount">{{ category.count }}</span>
          </div>
        </div>
      </div>

      <!-- Пустое состояние -->
      <div v-if="totalEntries === 0" :class="$style.emptyState">
        <p>Пока нет записей для статистики</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useDiaryStore } from '@/stores'

const diaryStore = useDiaryStore()

const totalEntries = computed(() => diaryStore.getTotalEntries())
const completedEntries = computed(() => diaryStore.getCompletedEntries())
const pendingEntries = computed(() => diaryStore.getPendingEntries())
const completionRate = computed(() => diaryStore.getCompletionRate())
const streak = computed(() => diaryStore.getStreak())
const categoriesStats = computed(() => diaryStore.getEntriesByCategory())
const monthlyStats = computed(() => diaryStore.getMonthlyStats())

function getBarHeight(value: number, total: number): number {
  if (total === 0) return 0
  return Math.max((value / total) * 100, 5)
}
</script>

<style lang="scss" module src="./StatisticsView.module.scss"></style>
