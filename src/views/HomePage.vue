<template>
  <div :class="$style.page">
    <div :class="$style.container">
      <div :class="$style.profileCard">
        <div :class="$style.avatarWrapper">
          <div :class="$style.avatar">
            <a-spin v-if="weatherLoading" size="large" />
            <span v-else-if="weatherData" class="material-symbols-rounded">
              {{ getWeatherIcon(weatherData.weather[0].icon) }}
            </span>
            <span v-else class="material-symbols-rounded">partly_cloudy_day</span>
          </div>
        </div>

        <div :class="$style.nameBlock">
          <h1 :class="$style.displayName">
            <template v-if="weatherData">{{ Math.round(weatherData.main.temp) }}°</template>
            <template v-else>—</template>
          </h1>
          <span :class="$style.username">
            <template v-if="weatherData">{{ weatherData.weather[0].description }}</template>
            <template v-else-if="weatherLoading">Загрузка...</template>
            <template v-else>Введите город</template>
          </span>
        </div>

        <p :class="$style.bio">{{ todayFormatted }}</p>

        <div :class="$style.citySearchBlock">
          <div :class="$style.cityRow">
            <input
              v-model="cityInput"
              :class="$style.nativeInput"
              placeholder="Введите город"
              @keypress.enter="changeCity"
            />
            <select
              v-model="unitValue"
              :class="$style.nativeSelect"
              @change="saveWeatherSettings"
            >
              <option value="celsius">°C</option>
              <option value="fahrenheit">°F</option>
            </select>
          </div>
        </div>

        <div v-if="weatherError" :class="$style.weatherError">
          <a-alert type="warning" show-icon :message="weatherError" />
        </div>

        <ul :class="$style.infoList">
          <li v-if="weatherData" :class="$style.infoItem">
            <span class="material-symbols-rounded">location_on</span>
            {{ weatherData.name }}
          </li>
          <li :class="$style.infoItem">
            <span class="material-symbols-rounded">schedule</span>
            {{ currentTime }}
          </li>
          <li v-if="weatherData" :class="$style.infoItem">
            <span class="material-symbols-rounded">water_drop</span>
            Влажность {{ weatherData.main.humidity }}%
          </li>
          <li v-if="weatherData" :class="$style.infoItem">
            <span class="material-symbols-rounded">air</span>
            Ветер {{ Math.round(weatherData.wind.speed) }} м/с
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { useWeatherStore } from '@/stores'

interface WeatherResult {
  name: string
  country: string
  temp: number
  humidity: number
  wind_speed: number
  weather_code: number
}

const weatherStore = useWeatherStore()

const cityInput = ref('')
const weatherData = ref<any>(null)
const weatherLoading = ref(false)
const weatherError = ref('')

const unitValue = ref(weatherStore.weatherSettings.unit)

watch(unitValue, (val) => {
  weatherStore.updateWeatherSettings({ unit: val })
})

const weatherCity = computed({
  get: () => weatherStore.weatherSettings.city,
  set: (value: string) => {
    weatherStore.updateWeatherSettings({ city: value })
  },
})

const currentTime = ref('')
let timeInterval: ReturnType<typeof setInterval> | null = null

function updateTime() {
  const now = new Date()
  const offset = -now.getTimezoneOffset()
  const sign = offset >= 0 ? '+' : '-'
  const hours = String(Math.abs(Math.floor(offset / 60))).padStart(2, '0')
  const minutes = String(Math.abs(offset % 60)).padStart(2, '0')
  currentTime.value =
    now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }) +
    ` (UTC${sign}${hours}:${minutes})`
}

const todayFormatted = new Date().toLocaleDateString('ru-RU', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const weatherDescriptions: Record<number, { description: string; icon: string }> = {
  0: { description: 'Ясно', icon: 'clear_day' },
  1: { description: 'Преимущественно ясно', icon: 'partly_cloudy' },
  2: { description: 'Переменная облачность', icon: 'partly_cloudy' },
  3: { description: 'Пасмурно', icon: 'cloudy' },
  45: { description: 'Туман', icon: 'fog' },
  48: { description: 'Иней', icon: 'fog' },
  51: { description: 'Морось', icon: 'drizzle' },
  53: { description: 'Морось', icon: 'drizzle' },
  55: { description: 'Морось', icon: 'drizzle' },
  61: { description: 'Дождь', icon: 'rain' },
  63: { description: 'Дождь', icon: 'rain' },
  65: { description: 'Дождь', icon: 'rain' },
  71: { description: 'Снег', icon: 'snow' },
  73: { description: 'Снег', icon: 'snow' },
  75: { description: 'Снег', icon: 'snow' },
  80: { description: 'Ливень', icon: 'rain' },
  81: { description: 'Ливень', icon: 'rain' },
  82: { description: 'Ливень', icon: 'rain' },
  95: { description: 'Гроза', icon: 'thunderstorm' },
  96: { description: 'Гроза с градом', icon: 'thunderstorm' },
  99: { description: 'Гроза с градом', icon: 'thunderstorm' },
}

async function fetchWeather(city: string) {
  weatherLoading.value = true
  weatherError.value = ''

  try {
    const result = await invoke<WeatherResult>('fetch_weather', {
      city,
      unit: unitValue.value,
    })

    const weatherInfo = weatherDescriptions[result.weather_code] || {
      description: 'Неизвестно',
      icon: 'cloudy',
    }

    weatherData.value = {
      name: `${result.name}, ${result.country}`,
      main: {
        temp: result.temp,
        humidity: result.humidity,
      },
      weather: [{ description: weatherInfo.description, icon: weatherInfo.icon }],
      wind: {
        speed: result.wind_speed,
      },
    }
  } catch (error) {
    console.error('Ошибка загрузки погоды:', error)
    weatherError.value = typeof error === 'string' ? error : 'Неизвестная ошибка'
    weatherData.value = null
  } finally {
    weatherLoading.value = false
  }
}

function changeCity() {
  if (cityInput.value.trim()) {
    weatherCity.value = cityInput.value.trim()
    fetchWeather(cityInput.value.trim())
  }
}

function saveWeatherSettings() {
  weatherStore.saveWeatherSettings()
  if (weatherCity.value) {
    fetchWeather(weatherCity.value)
  }
}

function getWeatherIcon(icon: string): string {
  const iconMap: Record<string, string> = {
    clear_day: 'sunny',
    partly_cloudy: 'partly_cloudy_day',
    cloudy: 'cloud',
    fog: 'foggy',
    drizzle: 'rainy_light',
    rain: 'rainy',
    snow: 'snowing',
    thunderstorm: 'thunderstorm',
  }
  return iconMap[icon] || 'cloud'
}

onMounted(() => {
  cityInput.value = weatherCity.value
  if (weatherCity.value) {
    fetchWeather(weatherCity.value)
  }
  updateTime()
  timeInterval = setInterval(updateTime, 60000)
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
})
</script>

<style lang="scss" module src="./HomePage.module.scss"></style>
