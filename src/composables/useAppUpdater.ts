import { onBeforeUnmount, ref } from 'vue'
import { getVersion } from '@tauri-apps/api/app'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

type UpdateCheckResult = {
  available: boolean
  currentVersion: string
  targetVersion: string | null
}

type UpdateDownloadProgress = {
  downloaded: number
  contentLength: number | null
  progress: number | null
  version: string
}

type TranslateFn = (key: string) => string

export function useAppUpdater(t: TranslateFn) {
  const isCheckingUpdates = ref(false)
  const isInstallingUpdate = ref(false)
  const isUpdateModalOpen = ref(false)
  const updateStatus = ref('')
  const updateError = ref('')
  const settingsUpdateMessage = ref('')
  const settingsUpdateType = ref<'neutral' | 'success' | 'error'>('neutral')
  const updateCurrentVersion = ref('')
  const updateTargetVersion = ref('')
  const updateProgress = ref<number | null>(null)
  const updateDownloadedBytes = ref('')
  const appVersion = ref('')

  let unlistenUpdateProgress: UnlistenFn | null = null

  function formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    if (bytes <= 0) return `0 ${units[0]}`
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
    const normalized = bytes / (1024 ** index)
    const fractionDigits = index === 0 ? 0 : 1
    return `${normalized.toFixed(fractionDigits)} ${units[index]}`
  }

  async function ensureUpdateProgressListener(): Promise<void> {
    if (unlistenUpdateProgress) return
    unlistenUpdateProgress = await listen<UpdateDownloadProgress>('update_download_progress', (event) => {
      const payload = event.payload
      updateTargetVersion.value = payload.version
      updateProgress.value = payload.progress === null ? null : Math.min(Math.max(payload.progress, 0), 100)
      if (payload.contentLength && payload.contentLength > 0) {
        updateDownloadedBytes.value = `${formatBytes(payload.downloaded)} / ${formatBytes(payload.contentLength)}`
      } else {
        updateDownloadedBytes.value = formatBytes(payload.downloaded)
      }
    })
  }

  async function checkAndInstallUpdate(): Promise<void> {
    if (isCheckingUpdates.value || isInstallingUpdate.value) return
    isUpdateModalOpen.value = true
    updateError.value = ''
    settingsUpdateMessage.value = t('updateChecking')
    settingsUpdateType.value = 'neutral'
    updateProgress.value = null
    updateDownloadedBytes.value = ''
    updateTargetVersion.value = ''
    updateStatus.value = t('updateChecking')
    isCheckingUpdates.value = true

    try {
      const result = await invoke<UpdateCheckResult>('check_for_updates')
      updateCurrentVersion.value = result.currentVersion
      if (!result.available || !result.targetVersion) {
        updateStatus.value = t('updateNotFound')
        settingsUpdateMessage.value = `${t('updateNotFound')} (${result.currentVersion})`
        settingsUpdateType.value = 'success'
        return
      }

      updateTargetVersion.value = result.targetVersion
      updateStatus.value = `${t('updateFound')}: ${result.targetVersion}`
      settingsUpdateMessage.value = `${t('updateFound')}: ${result.targetVersion}`
      settingsUpdateType.value = 'neutral'
      await ensureUpdateProgressListener()

      isInstallingUpdate.value = true
      updateStatus.value = t('updateDownloading')
      await invoke<void>('download_and_install_update')
      updateStatus.value = t('updateInstalling')
    } catch (error) {
      updateError.value = `${t('updateError')}: ${String(error)}`
      settingsUpdateMessage.value = updateError.value
      settingsUpdateType.value = 'error'
    } finally {
      isCheckingUpdates.value = false
      isInstallingUpdate.value = false
    }
  }

  async function loadAppVersion(): Promise<void> {
    try {
      const version = await getVersion()
      appVersion.value = version
      updateCurrentVersion.value = version
    } catch (error) {
      console.error('Не удалось получить версию приложения:', error)
      appVersion.value = ''
    }
  }

  function closeUpdateModal(): void {
    if (isInstallingUpdate.value) return
    isUpdateModalOpen.value = false
  }

  onBeforeUnmount(() => {
    if (!unlistenUpdateProgress) return
    void unlistenUpdateProgress()
    unlistenUpdateProgress = null
  })

  return {
    appVersion,
    checkAndInstallUpdate,
    closeUpdateModal,
    isCheckingUpdates,
    isInstallingUpdate,
    isUpdateModalOpen,
    loadAppVersion,
    settingsUpdateMessage,
    settingsUpdateType,
    updateCurrentVersion,
    updateDownloadedBytes,
    updateError,
    updateProgress,
    updateStatus,
    updateTargetVersion,
  }
}
