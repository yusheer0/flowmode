import { ref } from 'vue'

type FieldName = 'login' | 'password'

export function useCopyFeedback(timeoutMs = 2000) {
  const isLoginCopied = ref(false)
  const isPasswordCopied = ref(false)
  const timers = ref<{ login: ReturnType<typeof setTimeout> | null; password: ReturnType<typeof setTimeout> | null }>({
    login: null,
    password: null,
  })

  function clearTimers(): void {
    if (timers.value.login) {
      clearTimeout(timers.value.login)
      timers.value.login = null
    }
    if (timers.value.password) {
      clearTimeout(timers.value.password)
      timers.value.password = null
    }
  }

  function resetState(): void {
    isLoginCopied.value = false
    isPasswordCopied.value = false
  }

  function activate(field: FieldName): void {
    if (timers.value[field]) {
      clearTimeout(timers.value[field] as ReturnType<typeof setTimeout>)
    }

    if (field === 'login') {
      isLoginCopied.value = true
    } else {
      isPasswordCopied.value = true
    }

    timers.value[field] = setTimeout(() => {
      if (field === 'login') {
        isLoginCopied.value = false
      } else {
        isPasswordCopied.value = false
      }
      timers.value[field] = null
    }, timeoutMs)
  }

  return {
    isLoginCopied,
    isPasswordCopied,
    activate,
    resetState,
    clearTimers,
  }
}
