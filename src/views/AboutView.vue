<template>
  <div :class="$style.aboutView">
    <div :class="$style.aboutContent">
      <div :class="$style.infoCard">
        <div :class="$style.logo">
          <h1 :class="$style.appName">FLOWMODE</h1>
        </div>
        <p :class="$style.description">
          Персональный помощник для организации задач, отслеживания привычек и настроения.
        </p>
        <div :class="$style.version">
          <span :class="$style.versionLabel">Версия:</span>
          <span :class="$style.versionValue">{{ appVersion }}</span>
        </div>
      </div>

      <div :class="$style.featuresSection">
        <h3 :class="$style.sectionTitle">Возможности</h3>
        <div :class="$style.featuresGrid">
          <div :class="$style.featureCard">
            <h4 :class="$style.featureTitle">Список задач</h4>
            <p :class="$style.featureDescription">
              Управление задачами с приоритетами, категориями и фильтрами
            </p>
          </div>

          <div :class="$style.featureCard">
            <h4 :class="$style.featureTitle">Календарь</h4>
            <p :class="$style.featureDescription">
              Просмотр и планирование задач по дням
            </p>
          </div>

          <div :class="$style.featureCard">
            <h4 :class="$style.featureTitle">Привычки</h4>
            <p :class="$style.featureDescription">
              Отслеживание ежедневных и еженедельных привычек
            </p>
          </div>

          <div :class="$style.featureCard">
            <h4 :class="$style.featureTitle">Настроение</h4>
            <p :class="$style.featureDescription">
              Дневник настроения с анализом факторов влияния
            </p>
          </div>

          <div :class="$style.featureCard">
            <h4 :class="$style.featureTitle">Обзор</h4>
            <p :class="$style.featureDescription">
              Сводная статистика и прогресс выполнения задач
            </p>
          </div>

          <div :class="$style.featureCard">
            <h4 :class="$style.featureTitle">Интеграции</h4>
            <p :class="$style.featureDescription">
              Синхронизация с Telegram для уведомлений
            </p>
          </div>
        </div>
      </div>

      <div :class="$style.footer">
        <p :class="$style.copyright">
          © {{ currentYear }} FLOWMODE. Все права защищены.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const appVersion = '0.2.1'
const currentYear = new Date().getFullYear()
</script>

<style lang="scss" module src="./AboutView.module.scss"></style>
