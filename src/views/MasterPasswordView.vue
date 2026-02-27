<template>
  <div :class="$style.masterPasswordView">
    <!-- Анимированный фон -->
    <div :class="$style.backgroundAnimation">
      <div :class="[$style.floatingShape, $style.shape1]"></div>
      <div :class="[$style.floatingShape, $style.shape2]"></div>
      <div :class="[$style.floatingShape, $style.shape3]"></div>
      <div :class="[$style.floatingShape, $style.shape4]"></div>
      <div :class="[$style.floatingShape, $style.shape5]"></div>
      <div :class="[$style.floatingShape, $style.shape6]"></div>
    </div>

    <div :class="$style.card">
      <div :class="$style.header">
        <h1 :class="$style.title">FLOWMODE</h1>
        <p :class="$style.subtitle">
          {{ isSettingPassword ? 'Установка мастер-пароля' : 'Введите мастер-пароль' }}
        </p>
      </div>

      <!-- Установка пароля -->
      <div v-if="isSettingPassword" :class="$style.form">
        <div :class="$style.formItem">
          <label :class="$style.label">Мастер-пароль</label>
          <a-input-password
            v-model:value="formData.password"
            placeholder="Придумайте надёжный пароль (минимум 6 символов)"
            size="large"
            :status="errors.password ? 'error' : ''"
          />
          <div v-if="errors.password" :class="$style.errorText">{{ errors.password }}</div>
        </div>

        <div :class="$style.formItem">
          <label :class="$style.label">Подтверждение пароля</label>
          <a-input-password
            v-model:value="formData.confirmPassword"
            placeholder="Повторите пароль"
            size="large"
            :status="errors.confirmPassword ? 'error' : ''"
          />
          <div v-if="errors.confirmPassword" :class="$style.errorText">{{ errors.confirmPassword }}</div>
        </div>

        <div :class="$style.formItem">
          <label :class="$style.label">Подсказка (необязательно)</label>
          <a-input
            v-model:value="formData.hint"
            placeholder="Подсказка для пароля"
            size="large"
          />
        </div>

        <a-alert
          type="warning"
          show-icon
          :class="$style.warning"
        >
          <template #message>
            <div>
              <strong>Важно!</strong> Если вы забудете мастер-пароль,
              данные будут потеряны. Восстановление невозможно.
            </div>
          </template>
        </a-alert>

        <a-button type="primary" size="large" :loading="loading" block @click="handleSetPassword">
          Установить пароль
        </a-button>
      </div>

      <!-- Ввод пароля -->
      <div v-else :class="$style.form">
        <div :class="$style.formItem">
          <label :class="$style.label">Мастер-пароль</label>
          <a-input-password
            v-model:value="formData.password"
            placeholder="Введите пароль"
            size="large"
            :status="errors.password ? 'error' : ''"
            @keypress.enter="handleUnlock"
            autofocus
          />
          <div v-if="errors.password" :class="$style.errorText">{{ errors.password }}</div>
        </div>

        <div v-if="hint" :class="$style.hint">
          <a-alert type="info" show-icon>
            <template #message>
              <div>Подсказка: {{ hint }}</div>
            </template>
          </a-alert>
        </div>

        <div :class="$style.hintText">Нажмите Enter для разблокировки</div>

        <a-button danger size="large" block @click="showResetConfirm = true" style="margin-top: 12px;">
          Сбросить пароль и все данные
        </a-button>
      </div>
    </div>

    <!-- Подтверждение сброса -->
    <a-modal
      v-model:open="showResetConfirm"
      title="Подтверждение сброса"
      :footer="null"
      width="500px"
    >
      <a-alert
        type="error"
        show-icon
        :class="$style.dangerAlert"
      >
        <template #message>
          <div>
            <strong>Внимание!</strong> Это действие необратимо удалит все данные!
          </div>
        </template>
        <template #description>
          <div style="margin-top: 12px;">
            Вы уверены, что хотите сбросить мастер-пароль и удалить все заметки,
            настройки и данные приложения?
          </div>
        </template>
      </a-alert>

      <div :class="$style.modalFooter">
        <a-input
          v-model:value="resetConfirmText"
          placeholder="Введите 'СБРОСИТЬ' для подтверждения"
          size="large"
        />
        <div style="margin-top: 16px; display: flex; gap: 12px; justify-content: flex-end;">
          <a-button size="large" @click="showResetConfirm = false">
            Отмена
          </a-button>
          <a-button
            danger
            size="large"
            @click="handleReset"
            :disabled="resetConfirmText !== 'СБРОСИТЬ'"
          >
            Сбросить всё
          </a-button>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useMasterPasswordStore } from '@/stores'

const router = useRouter()
const masterPasswordStore = useMasterPasswordStore()

const loading = ref(false)
const isSettingPassword = ref(false)
const hint = ref<string | undefined>()
const showResetConfirm = ref(false)
const resetConfirmText = ref('')

const formData = reactive({
  password: '',
  confirmPassword: '',
  hint: '',
})

const errors = reactive({
  password: '',
  confirmPassword: '',
})

// Валидация
function validate(): boolean {
  errors.password = ''
  errors.confirmPassword = ''

  if (!formData.password) {
    errors.password = 'Введите пароль'
    return false
  }

  if (isSettingPassword.value) {
    if (formData.password.length < 6) {
      errors.password = 'Минимум 6 символов'
      return false
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Подтвердите пароль'
      return false
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Пароли не совпадают'
      return false
    }
  }

  return true
}

// Установка пароля
async function handleSetPassword() {
  if (!validate()) return

  loading.value = true
  try {
    const success = await masterPasswordStore.setMasterPassword(formData.password, formData.hint || '')
    if (success) {
      await masterPasswordStore.unlock(formData.password)
      router.push('/home')
    } else {
      alert('Ошибка установки пароля')
    }
  } catch (error) {
    console.error('Ошибка установки пароля:', error)
    alert('Ошибка установки пароля')
  } finally {
    loading.value = false
  }
}

// Разблокировка
async function handleUnlock() {
  if (!validate()) return

  loading.value = true
  try {
    const success = await masterPasswordStore.unlock(formData.password)
    if (success) {
      router.push('/home')
    } else {
      alert('Неверный пароль')
    }
  } catch (error) {
    console.error('Ошибка разблокировки:', error)
    alert('Ошибка разблокировки')
  } finally {
    loading.value = false
  }
}

// Сброс пароля
function handleReset() {
  masterPasswordStore.resetPassword()
  showResetConfirm.value = false
  resetConfirmText.value = ''
  alert('Пароль сброшен. Все данные удалены.')
}

onMounted(() => {
  masterPasswordStore.init()
  hint.value = masterPasswordStore.getHint()
  isSettingPassword.value = !masterPasswordStore.isPasswordSet()
})
</script>

<style lang="scss" module src="./MasterPasswordView.module.scss"></style>
