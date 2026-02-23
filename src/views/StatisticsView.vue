<template>
  <div class="statistics-view">
    <header class="view-header">
      <h2 class="view-title">Статистика</h2>
    </header>

    <div class="statistics-content">
      <!-- Основные показатели -->
      <div class="stats-cards">
        <div class="stat-card">
          <div class="stat-value">{{ totalEntries }}</div>
          <div class="stat-label">Всего записей</div>
        </div>

        <div class="stat-card">
          <div class="stat-value">{{ completedEntries }}</div>
          <div class="stat-label">Выполнено</div>
        </div>

        <div class="stat-card">
          <div class="stat-value">{{ pendingEntries }}</div>
          <div class="stat-label">В процессе</div>
        </div>

        <div class="stat-card">
          <div class="stat-value">{{ streak }}</div>
          <div class="stat-label">Дней подряд</div>
        </div>
      </div>

      <!-- Прогресс выполнения -->
      <div class="progress-section">
        <h3 class="section-title">Общий прогресс</h3>
        <div class="progress-container">
          <div class="progress-bar">
            <div 
              class="progress-fill" 
              :style="{ width: `${completionRate}%` }"
              :class="{ 'low-progress': completionRate < 30, 'medium-progress': completionRate >= 30 && completionRate < 70 }"
            ></div>
          </div>
          <div class="progress-text">{{ completionRate }}%</div>
        </div>
      </div>

      <!-- Статистика по месяцам -->
      <div class="stats-section">
        <h3 class="section-title">Активность по месяцам</h3>
        <div class="monthly-chart">
          <div 
            v-for="month in monthlyStats" 
            :key="`${month.year}-${month.monthNum}`"
            class="month-bar"
          >
            <div class="month-label">{{ month.month }}</div>
            <div class="bar-container">
              <div class="bar">
                <div 
                  class="bar-fill completed"
                  :style="{ height: `${getBarHeight(month.completed, month.total)}%` }"
                  :title="`Выполнено: ${month.completed}`"
                ></div>
                <div 
                  class="bar-fill pending"
                  :style="{ height: `${getBarHeight(month.total - month.completed, month.total)}%` }"
                  :title="`В процессе: ${month.total - month.completed}`"
                ></div>
              </div>
            </div>
            <div class="month-value">{{ month.total }}</div>
          </div>
        </div>
      </div>

      <!-- Статистика по категориям -->
      <div class="stats-section" v-if="categoriesStats.length > 0">
        <h3 class="section-title">По категориям</h3>
        <div class="categories-list">
          <div 
            v-for="category in categoriesStats" 
            :key="category.name"
            class="category-item"
          >
            <div class="category-info">
              <span 
                class="category-color" 
                :style="{ backgroundColor: category.color }"
              ></span>
              <span class="category-name">{{ category.name }}</span>
            </div>
            <span class="category-count">{{ category.count }}</span>
          </div>
        </div>
      </div>

      <!-- Пустое состояние -->
      <div v-if="totalEntries === 0" class="empty-state">
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

<style lang="scss">
.statistics-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.view-header {
  padding: 0 10px;
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.view-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--color-text);
  padding-left: 12px;
}

.statistics-content {
  flex: 1;
  padding: 8px;
  overflow: auto;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.stat-card {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  text-align: center;
  box-shadow: var(--shadow-sm);
  transition: transform var(--transition-fast), box-shadow var(--transition-fast);

  &:hover {
    box-shadow: var(--shadow-md);
  }
}

.stat-icon {
  font-size: 2rem;
  margin-bottom: 8px;
}

.stat-value {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-primary);
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.progress-section {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 8px;
  box-shadow: var(--shadow-sm);
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 16px;
}

.progress-container {
  display: flex;
  align-items: center;
  gap: 16px;
}

.progress-bar {
  flex: 1;
  height: 24px;
  background-color: var(--color-bg);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-hover));
  border-radius: var(--radius-md);
  transition: width var(--transition-normal);

  &.low-progress {
    background: linear-gradient(90deg, #e74c3c, #c0392b);
  }

  &.medium-progress {
    background: linear-gradient(90deg, #f39c12, #e67e22);
  }
}

.progress-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  min-width: 50px;
  text-align: right;
}

.stats-section {
  background-color: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 20px;
  margin-bottom: 8px;
  box-shadow: var(--shadow-sm);
}

.monthly-chart {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding-bottom: 8px;
}

.month-bar {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 50px;
}

.month-label {
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
  text-transform: capitalize;
  margin-bottom: 8px;
  text-align: center;
}

.bar-container {
  width: 40px;
  height: 120px;
  display: flex;
  align-items: flex-end;
}

.bar {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.bar-fill {
  border-radius: var(--radius-sm);
  transition: height var(--transition-normal);

  &.completed {
    background-color: var(--color-success);
  }

  &.pending {
    background-color: var(--color-bg);
    border: 1px solid var(--color-border);
  }
}

.month-value {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin-top: 8px;
}

.categories-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.category-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--color-bg);
  border-radius: var(--radius-md);
}

.category-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.category-color {
  width: 12px;
  height: 12px;
  border-radius: 50%;
}

.category-name {
  font-weight: 500;
  color: var(--color-text);
}

.category-count {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-primary);
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

.empty-state p {
  color: var(--color-text-secondary);
  font-size: 1.1rem;
  margin-bottom: 24px;
}

.btn {
  padding: 12px 24px;
  border-radius: var(--radius-md);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);

  &.btn-primary {
    background-color: var(--color-primary);
    color: white;

    &:hover {
      background-color: var(--color-primary-hover);
    }
  }
}
</style>
