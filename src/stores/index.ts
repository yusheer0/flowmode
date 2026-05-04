import { defineStore } from 'pinia'
import { ref } from 'vue'
import type {
  AppSettings,
  Note,
  MasterPasswordSettings,
  NoteSortOption,
  NotesLayer,
  VaultItem,
  VaultItemInput,
  VaultEvent,
  VaultEventsQuery,
} from '@/types'
import CryptoJS from 'crypto-js'
import { invoke } from '@tauri-apps/api/core'

const STORAGE_KEYS = {
  notes: 'notes',
  notesLayers: 'notesLayers',
  notesActiveLayer: 'notesActiveLayer',
} as const
const USER_DATA_OWNERSHIP_KEY = 'flowmodeUserDataOwned'

type StorageMap = Record<string, string>
type VaultDevItem = VaultItem & { password: string }
type StorageOperation = { type: 'set'; value: string } | { type: 'remove' }
type StoredNoteRecord = { id: string; payload: string; updatedAt?: number }

const DEV_VAULT_ITEMS_KEY = 'vaultItemsDev'
const DEV_VAULT_EVENTS_KEY = 'vaultEventsDev'
const NOTES_LEGACY_KEY = STORAGE_KEYS.notes
const STORAGE_FLUSH_DELAY_MS = 70
const NOTES_BATCH_LIMIT = 400
const DEFAULT_EVENTS_LIMIT = 200

const storageWriteQueue = new Map<string, StorageOperation>()
let storageFlushTimer: ReturnType<typeof setTimeout> | null = null
let storageFlushInFlight = false

function isClientSide(): boolean {
  return typeof window !== 'undefined'
}

function hasTauriInvokeRuntime(): boolean {
  if (!isClientSide()) return false
  const tauriInternals = (window as Window & {
    __TAURI_INTERNALS__?: { invoke?: unknown }
  }).__TAURI_INTERNALS__
  return typeof tauriInternals?.invoke === 'function'
}

function shouldUseVaultFallback(): boolean {
  return import.meta.env.DEV && !hasTauriInvokeRuntime() && import.meta.env.MODE !== 'test'
}

function readDevVaultItems(): VaultDevItem[] {
  if (!isClientSide()) return []
  const raw = localStorage.getItem(DEV_VAULT_ITEMS_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as VaultDevItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeDevVaultItems(items: VaultDevItem[]): void {
  if (!isClientSide()) return
  localStorage.setItem(DEV_VAULT_ITEMS_KEY, JSON.stringify(items))
}

function readDevVaultEvents(): VaultEvent[] {
  if (!isClientSide()) return []
  const raw = localStorage.getItem(DEV_VAULT_EVENTS_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as VaultEvent[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeDevVaultEvents(events: VaultEvent[]): void {
  if (!isClientSide()) return
  localStorage.setItem(DEV_VAULT_EVENTS_KEY, JSON.stringify(events))
}

function clearDevVaultFallbackStorage(): void {
  if (!isClientSide()) return
  localStorage.removeItem(DEV_VAULT_ITEMS_KEY)
  localStorage.removeItem(DEV_VAULT_EVENTS_KEY)
}

function maskPassword(password: string): string {
  const length = Math.max(8, Math.min(password.length, 16))
  return '*'.repeat(length)
}

function toVaultItem(devItem: VaultDevItem): VaultItem {
  const { password: _password, ...item } = devItem
  return item
}

function createVaultEvent(itemId: string, type: VaultEvent['type']): VaultEvent {
  return {
    id: crypto.randomUUID(),
    itemId,
    type,
    createdAt: new Date().toISOString(),
  }
}

function addDevVaultEvent(itemId: string, type: VaultEvent['type']): VaultEvent[] {
  const nextEvent = createVaultEvent(itemId, type)
  const nextEvents = [nextEvent, ...readDevVaultEvents()]
  writeDevVaultEvents(nextEvents)
  return nextEvents
}

function buildPasswordAlphabet(includeSymbols: boolean, includeDigits: boolean, avoidAmbiguous: boolean): string {
  let alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  if (includeDigits) alphabet += '0123456789'
  if (includeSymbols) alphabet += '!@#$%^&*()_+-=[]{}:;,.?/'

  if (!avoidAmbiguous) return alphabet

  const ambiguousChars = new Set(['0', 'O', 'o', '1', 'l', 'I', '|'])
  return [...alphabet].filter(char => !ambiguousChars.has(char)).join('')
}

function generateFallbackPassword(
  length: number,
  includeSymbols: boolean,
  includeDigits: boolean,
  avoidAmbiguous: boolean
): string {
  const targetLength = Math.max(4, Math.min(length, 128))
  const alphabet = buildPasswordAlphabet(includeSymbols, includeDigits, avoidAmbiguous)
  const safeAlphabet = alphabet.length > 0 ? alphabet : 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const values = crypto.getRandomValues(new Uint32Array(targetLength))
  return Array.from(values, value => safeAlphabet[value % safeAlphabet.length]).join('')
}

async function dbGetMany(keys: string[]): Promise<StorageMap> {
  try {
    const result = await invoke<StorageMap>('storage_get_many', { keys })
    return result || {}
  } catch (error) {
    console.error('Ошибка чтения из SQLite:', error)
    return {}
  }
}

function dbSet(key: string, value: string): void {
  storageWriteQueue.set(key, { type: 'set', value })
  scheduleStorageFlush()
}

function dbRemove(key: string): void {
  storageWriteQueue.set(key, { type: 'remove' })
  scheduleStorageFlush()
}

function dbSetJson<T>(key: string, value: T): void {
  dbSet(key, JSON.stringify(value))
}

function scheduleStorageFlush(): void {
  if (storageFlushTimer) return
  storageFlushTimer = setTimeout(() => {
    storageFlushTimer = null
    void flushStorageQueue()
  }, STORAGE_FLUSH_DELAY_MS)
}

async function flushStorageQueue(): Promise<void> {
  if (storageFlushInFlight || storageWriteQueue.size === 0) return
  storageFlushInFlight = true
  const queueSnapshot = new Map(storageWriteQueue)
  storageWriteQueue.clear()

  try {
    for (const [key, operation] of queueSnapshot.entries()) {
      if (operation.type === 'set') {
        await invoke<boolean>('storage_set', { key, value: operation.value })
      } else {
        await invoke<boolean>('storage_remove', { key })
      }
    }
  } catch (error) {
    console.error('Ошибка пакетной записи в SQLite:', error)
  } finally {
    storageFlushInFlight = false
    if (storageWriteQueue.size > 0) {
      scheduleStorageFlush()
    }
  }
}

async function notesList(): Promise<StoredNoteRecord[]> {
  try {
    const items = await invoke<StoredNoteRecord[]>('notes_list')
    return Array.isArray(items) ? items : []
  } catch (error) {
    console.error('Ошибка чтения notes_items из SQLite:', error)
    return []
  }
}

async function notesUpsert(note: Note): Promise<void> {
  try {
    await invoke<boolean>('notes_upsert', { id: note.id, payload: JSON.stringify(note) })
  } catch (error) {
    console.error(`Ошибка записи заметки ${note.id} в SQLite:`, error)
  }
}

async function notesRemove(id: string): Promise<void> {
  try {
    await invoke<boolean>('notes_remove', { id })
  } catch (error) {
    console.error(`Ошибка удаления заметки ${id} из SQLite:`, error)
  }
}

async function hashPassword(password: string, rounds: number): Promise<string> {
  return invoke<string>('hash_master_password', { password, rounds })
}

async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  return invoke<boolean>('verify_master_password', { password, storedHash })
}

function markUserDataOwned(): void {
  localStorage.setItem(USER_DATA_OWNERSHIP_KEY, '1')
}

export const useSettingsStore = defineStore('settings', () => {
  const SETTINGS_STORAGE_KEY = 'appSettings'
  const defaultSettings: AppSettings = {
    theme: 'light',
    language: 'en',
    canvasBackgroundImage: null,
    notificationsEnabled: false,
    backupEnabled: false,
    minimizeOnClose: false,
  }
  const settings = ref<AppSettings>({
    ...defaultSettings,
  })
  function init(): void {
    const storedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (!storedSettings) {
      document.documentElement.setAttribute('data-theme', settings.value.theme)
      return
    }

    try {
      const parsedRaw = JSON.parse(storedSettings) as Record<string, unknown>
      const parsed = parsedRaw as Partial<AppSettings>
      const parsedLanguage = typeof parsedRaw.language === 'string'
        ? parsedRaw.language
        : undefined
      const parsedCanvasBackgroundImage = typeof parsedRaw.canvasBackgroundImage === 'string'
        ? parsedRaw.canvasBackgroundImage
        : null
      settings.value = {
        ...defaultSettings,
        ...parsed,
        language: parsedLanguage === 'ko'
          ? 'en'
          : (parsed.language || defaultSettings.language),
        canvasBackgroundImage: parsedCanvasBackgroundImage,
      }
      document.documentElement.setAttribute('data-theme', settings.value.theme)
    } catch (e) {
      console.error('Ошибка загрузки настроек приложения:', e)
    }
  }

  function saveSettings(): void {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings.value))
  }

  function updateSettings(updates: Partial<AppSettings>): void {
    settings.value = {
      ...settings.value,
      ...updates,
    }

    if (updates.theme) {
      document.documentElement.setAttribute('data-theme', updates.theme)
    }

    saveSettings()
  }
  return {
    settings,
    init,
    updateSettings,
  }
})

export const useNotesStore = defineStore('notes', () => {
  const notes = ref<Note[]>([])
  const autoSaveTimers = ref<Map<string, ReturnType<typeof setTimeout>>>(new Map())
  const DEFAULT_NOTE_COLOR = '#8c8c94'
  const LAYERS_STORAGE_KEY = STORAGE_KEYS.notesLayers
  const ACTIVE_LAYER_STORAGE_KEY = STORAGE_KEYS.notesActiveLayer
  const MAX_LAYERS = 5
  const layers = ref<NotesLayer[]>([])
  const activeLayerId = ref<string>('')
  const initialized = ref(false)
  const persistedNoteIds = ref<Set<string>>(new Set())

  type NoteInput = {
    title?: string
    content: string
    layerId?: string
    backgroundColor?: string
    criticality?: Note['criticality']
  }

  function getLayerName(layerId: string): string {
    return layers.value.find(layer => layer.id === layerId)?.name || ''
  }

  function ensureLayers(maybeLayers: unknown): NotesLayer[] {
    const parsedLayers = Array.isArray(maybeLayers)
      ? maybeLayers.filter((layer): layer is NotesLayer => {
        return typeof layer === 'object'
          && layer !== null
          && typeof (layer as NotesLayer).id === 'string'
          && typeof (layer as NotesLayer).name === 'string'
          && typeof (layer as NotesLayer).isDefault === 'boolean'
          && typeof (layer as NotesLayer).createdAt === 'string'
      })
      : []

    const normalizedLayers = parsedLayers
      .slice(0, MAX_LAYERS)
      .map(layer => ({
        ...layer,
        id: layer.id.trim(),
        name: layer.name.trim(),
        isDefault: false,
      }))
      .filter(layer => layer.id.length > 0 && layer.name.length > 0)

    return normalizedLayers
  }

  function isExistingLayer(layerId: unknown): layerId is string {
    return typeof layerId === 'string' && layers.value.some(layer => layer.id === layerId)
  }

  function normalizeLayerId(raw: Partial<Note>, legacyPayload: Partial<NoteInput> | null): string {
    const oldLayerValue = typeof raw.layer === 'string'
      ? raw.layer
      : undefined
    const candidate = raw.layerId || oldLayerValue || legacyPayload?.layerId
    return isExistingLayer(candidate) ? candidate : ''
  }

  function normalizeNote(raw: Partial<Note>): Note {
    const legacyPayload = (
      typeof raw.content === 'object' &&
      raw.content !== null
    ) ? raw.content as Partial<NoteInput> : null

    const normalizedTitle = raw.title?.trim()
      || legacyPayload?.title?.trim()
      || 'Новая заметка'
    const normalizedContent = typeof raw.content === 'string'
      ? raw.content
      : (legacyPayload?.content || '')
    const normalizedColor = raw.backgroundColor
      || legacyPayload?.backgroundColor
      || DEFAULT_NOTE_COLOR
    const normalizedCriticality = raw.criticality
      || legacyPayload?.criticality
    const normalizedLayerId = normalizeLayerId(raw, legacyPayload)

    return {
      id: raw.id || crypto.randomUUID(),
      title: normalizedTitle,
      content: normalizedContent,
      layerId: normalizedLayerId,
      backgroundColor: normalizedColor,
      criticality: normalizedCriticality,
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString(),
      isImportant: raw.isImportant || false,
      deletedAt: raw.deletedAt,
    }
  }

  async function upsertNotesBatch(nextNotes: Note[]): Promise<void> {
    if (nextNotes.length === 0) return
    for (let index = 0; index < nextNotes.length; index += NOTES_BATCH_LIMIT) {
      const batch = nextNotes.slice(index, index + NOTES_BATCH_LIMIT)
      await Promise.all(batch.map(note => notesUpsert(note)))
    }
  }

  function saveToStorage(): void {
    const nextNotes = [...notes.value]
    const nextNoteIds = new Set(nextNotes.map(note => note.id))
    const removedIds = Array.from(persistedNoteIds.value).filter(id => !nextNoteIds.has(id))
    persistedNoteIds.value = nextNoteIds

    void (async () => {
      await upsertNotesBatch(nextNotes)
      await Promise.all(removedIds.map(id => notesRemove(id)))
    })()
  }

  function persistSingleNote(note: Note): void {
    persistedNoteIds.value.add(note.id)
    void notesUpsert(note)
  }

  function removeNoteFromStorage(noteId: string): void {
    persistedNoteIds.value.delete(noteId)
    void notesRemove(noteId)
  }

  async function migrateLegacyNotesIfNeeded(storedLegacyNotes?: string): Promise<Note[]> {
    if (!storedLegacyNotes) return []
    try {
      const parsed = JSON.parse(storedLegacyNotes) as Partial<Note>[]
      const normalized = parsed.map(note => normalizeNote(note))
      await upsertNotesBatch(normalized)
      dbRemove(NOTES_LEGACY_KEY)
      return normalized
    } catch (error) {
      console.error('Ошибка миграции legacy-заметок:', error)
      return []
    }
  }

  // Инициализация - загрузка из SQLite
  async function init(): Promise<void> {
    if (initialized.value) return
    const payload = await dbGetMany([LAYERS_STORAGE_KEY, ACTIVE_LAYER_STORAGE_KEY, NOTES_LEGACY_KEY])
    const storedLayers = payload[LAYERS_STORAGE_KEY]
    const storedLayerId = payload[ACTIVE_LAYER_STORAGE_KEY]
    const storedLegacyNotes = payload[NOTES_LEGACY_KEY]
    let shouldPersistLayers = false
    let shouldPersistActiveLayer = false

    if (storedLayers) {
      try {
        layers.value = ensureLayers(JSON.parse(storedLayers))
        shouldPersistLayers = JSON.stringify(layers.value) !== storedLayers
      } catch (e) {
        console.error('Ошибка загрузки слоев заметок:', e)
        layers.value = []
        shouldPersistLayers = true
      }
    } else {
      layers.value = []
      shouldPersistLayers = true
    }

    activeLayerId.value = isExistingLayer(storedLayerId) ? storedLayerId : (layers.value[0]?.id || '')
    shouldPersistActiveLayer = (storedLayerId || '') !== activeLayerId.value

    const granularNotes = await notesList()
    if (granularNotes.length > 0) {
      notes.value = granularNotes
        .map((entry) => {
          try {
            const parsed = JSON.parse(entry.payload) as Partial<Note>
            return normalizeNote(parsed)
          } catch (error) {
            console.error(`Ошибка загрузки заметки ${entry.id}:`, error)
            return null
          }
        })
        .filter((note): note is Note => note !== null)
    } else {
      notes.value = await migrateLegacyNotesIfNeeded(storedLegacyNotes)
    }
    persistedNoteIds.value = new Set(notes.value.map(note => note.id))

    if (shouldPersistLayers) {
      saveLayers()
    }
    if (shouldPersistActiveLayer) {
      saveActiveLayer()
    }
    initialized.value = true
  }

  function saveLayers(): void {
    dbSetJson(LAYERS_STORAGE_KEY, layers.value)
  }

  function saveActiveLayer(): void {
    if (!activeLayerId.value) {
      dbRemove(ACTIVE_LAYER_STORAGE_KEY)
      return
    }

    dbSet(ACTIVE_LAYER_STORAGE_KEY, activeLayerId.value)
  }

  function canCreateCustomLayer(): boolean {
    return layers.value.length < MAX_LAYERS
  }

  function createCustomLayer(name: string): { success: boolean; error?: string; code?: string } {
    const normalizedName = name.trim()

    if (!normalizedName) {
      return { success: false, error: 'Введите название слоя', code: 'LAYER_NAME_REQUIRED' }
    }

    if (!canCreateCustomLayer()) {
      return { success: false, error: 'Достигнут лимит: максимум 5 слоев', code: 'LAYER_LIMIT_REACHED' }
    }

    if (layers.value.some(layer => layer.name.toLowerCase() === normalizedName.toLowerCase())) {
      return { success: false, error: 'Слой с таким названием уже существует', code: 'LAYER_NAME_EXISTS' }
    }

    const newLayer: NotesLayer = {
      id: `custom-${crypto.randomUUID()}`,
      name: normalizedName,
      isDefault: false,
      createdAt: new Date().toISOString(),
    }

    layers.value.push(newLayer)
    if (!activeLayerId.value) {
      activeLayerId.value = newLayer.id
      saveActiveLayer()
    }
    saveLayers()
    return { success: true }
  }

  function deleteLayer(layerId: string): { success: boolean; error?: string; code?: string } {
    if (!isExistingLayer(layerId)) {
      return { success: false, error: 'Слой не найден', code: 'LAYER_NOT_FOUND' }
    }

    if (layers.value.length <= 1) {
      return { success: false, error: 'Нельзя удалить последний слой', code: 'LAYER_DELETE_LAST_BLOCKED' }
    }

    const fallbackLayer = layers.value.find(layer => layer.id !== layerId)
    if (!fallbackLayer) {
      return { success: false, error: 'Слой назначения не найден', code: 'LAYER_TARGET_NOT_FOUND' }
    }

    const now = new Date().toISOString()
    notes.value = notes.value.map((note) => {
      if (note.layerId !== layerId) return note
      return {
        ...note,
        layerId: fallbackLayer.id,
        updatedAt: now,
      }
    })

    layers.value = layers.value.filter(layer => layer.id !== layerId)

    if (activeLayerId.value === layerId) {
      activeLayerId.value = fallbackLayer.id
    }

    markUserDataOwned()
    saveLayers()
    saveActiveLayer()
    saveToStorage()
    return { success: true }
  }

  function addNote(input: string | NoteInput): void {
    const now = new Date().toISOString()
    const payload = typeof input === 'string'
      ? { content: input }
      : input
    const targetLayerId = payload.layerId || activeLayerId.value
    if (!isExistingLayer(targetLayerId)) return

    const newNote: Note = {
      id: crypto.randomUUID(),
      title: payload.title?.trim() || 'Новая заметка',
      content: payload.content,
      layerId: targetLayerId,
      backgroundColor: payload.backgroundColor || DEFAULT_NOTE_COLOR,
      criticality: payload.criticality,
      createdAt: now,
      updatedAt: now,
      isImportant: false,
    }
    notes.value.unshift(newNote)
    markUserDataOwned()
    persistSingleNote(newNote)
  }

  function updateNote(
    id: string,
    updates: Partial<Pick<Note, 'title' | 'content' | 'backgroundColor' | 'criticality' | 'layerId'>>
  ): void {
    const index = notes.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notes.value[index] = {
        ...notes.value[index],
        ...updates,
        title: updates.title?.trim() || notes.value[index].title,
        updatedAt: new Date().toISOString(),
      }
      persistSingleNote(notes.value[index])
    }
  }

  // Автосохранение (откладывает сохранение на 1 секунду)
  function autoSaveNote(id: string, content: string): void {
    // Очищаем предыдущий таймер
    const existingTimer = autoSaveTimers.value.get(id)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // Устанавливаем новый таймер
    const timer = setTimeout(() => {
      updateNote(id, { content })
      autoSaveTimers.value.delete(id)
    }, 1000)

    autoSaveTimers.value.set(id, timer)
  }

  function deleteNote(id: string): void {
    const index = notes.value.findIndex(n => n.id === id)
    if (index !== -1) {
      // Перемещаем в корзину вместо удаления
      const note = notes.value[index]
      note.deletedAt = new Date().toISOString()
      notes.value.splice(index, 1)
      notes.value.push(note)
      persistSingleNote(note)
    }
  }

  function permanentDeleteNote(id: string): void {
    notes.value = notes.value.filter(n => n.id !== id)
    removeNoteFromStorage(id)
  }

  function restoreNote(id: string): void {
    const index = notes.value.findIndex(n => n.id === id)
    if (index !== -1) {
      const note = notes.value[index]
      note.deletedAt = undefined
      note.updatedAt = new Date().toISOString()
      // Перемещаем в начало
      notes.value.splice(index, 1)
      notes.value.unshift(note)
      persistSingleNote(note)
    }
  }

  function toggleImportant(id: string): void {
    const index = notes.value.findIndex(n => n.id === id)
    if (index !== -1) {
      notes.value[index].isImportant = !notes.value[index].isImportant
      notes.value[index].updatedAt = new Date().toISOString()
      persistSingleNote(notes.value[index])
    }
  }

  function getNote(id: string): Note | undefined {
    return notes.value.find(n => n.id === id)
  }

  function getActiveNotes(): Note[] {
    return notes.value.filter(n => !n.deletedAt)
  }

  function getActiveNotesByLayer(layerId: string = activeLayerId.value): Note[] {
    return notes.value.filter(n => !n.deletedAt && n.layerId === layerId)
  }

  function getTrashedNotes(): Note[] {
    return notes.value.filter(n => n.deletedAt)
  }

  function clearTrash(): void {
    const trashedIds = notes.value.filter(note => note.deletedAt).map(note => note.id)
    notes.value = notes.value.filter(n => !n.deletedAt)
    trashedIds.forEach(id => removeNoteFromStorage(id))
  }

  function sortNotes(notesToSort: Note[], option: NoteSortOption): Note[] {
    const sorted = [...notesToSort]
    switch (option) {
      case 'oldest':
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      case 'important':
        return sorted.sort((a, b) => {
          if (a.isImportant && !b.isImportant) return -1
          if (!a.isImportant && b.isImportant) return 1
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })
      case 'newest':
      default:
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    }
  }

  function setActiveLayer(layerId: string): void {
    if (!isExistingLayer(layerId) || activeLayerId.value === layerId) return
    activeLayerId.value = layerId
    saveActiveLayer()
  }

  return {
    notes,
    layers,
    activeLayerId,
    MAX_CUSTOM_LAYERS: MAX_LAYERS,
    init,
    addNote,
    updateNote,
    autoSaveNote,
    deleteNote,
    permanentDeleteNote,
    restoreNote,
    toggleImportant,
    getNote,
    getActiveNotes,
    getActiveNotesByLayer,
    getTrashedNotes,
    clearTrash,
    sortNotes,
    setActiveLayer,
    getLayerName,
    canCreateCustomLayer,
    createCustomLayer,
    deleteLayer,
    saveToStorage,
  }
})

type RevealedPasswordCache = Record<string, { value: string; expiresAt: number }>

export const useVaultStore = defineStore('vault', () => {
  const items = ref<VaultItem[]>([])
  const events = ref<VaultEvent[]>([])
  const revealCache = ref<RevealedPasswordCache>({})
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const REVEAL_TTL_MS = 20000

  function clearError(): void {
    error.value = null
  }

  function clearExpiredReveals(): void {
    const now = Date.now()
    const nextCache: RevealedPasswordCache = {}
    Object.entries(revealCache.value).forEach(([itemId, value]) => {
      if (value.expiresAt > now) {
        nextCache[itemId] = value
      }
    })
    revealCache.value = nextCache
  }

  function normalizeInput(input: VaultItemInput): VaultItemInput {
    return {
      title: input.title.trim(),
      service: input.service.trim(),
      username: input.username.trim(),
      password: input.password,
      url: input.url?.trim(),
      notes: input.notes?.trim(),
      tags: input.tags.map(tag => tag.trim()).filter(Boolean),
    }
  }

  function isValidInput(input: VaultItemInput): boolean {
    return input.title.trim().length > 0
      && input.service.trim().length > 0
      && input.username.trim().length > 0
      && input.password.length > 0
  }

  async function init(): Promise<void> {
    if (hasTauriInvokeRuntime()) {
      clearDevVaultFallbackStorage()
    }
    await Promise.all([refreshItems(), refreshEvents()])
  }

  async function refreshItems(): Promise<void> {
    isLoading.value = true
    clearError()
    try {
      if (shouldUseVaultFallback()) {
        items.value = readDevVaultItems().map(toVaultItem)
        return
      }
      items.value = await invoke<VaultItem[]>('vault_list')
    } catch (e) {
      error.value = `Ошибка загрузки vault: ${e}`
    } finally {
      isLoading.value = false
      clearExpiredReveals()
    }
  }

  async function refreshEvents(query: VaultEventsQuery = {}): Promise<void> {
    clearError()
    const itemId = query.itemId
    const limit = query.limit ?? DEFAULT_EVENTS_LIMIT
    const offset = query.offset ?? 0
    try {
      if (shouldUseVaultFallback()) {
        const source = readDevVaultEvents()
        const filtered = itemId
          ? source.filter(entry => entry.itemId === itemId)
          : source
        events.value = filtered.slice(offset, offset + limit)
        return
      }
      events.value = await invoke<VaultEvent[]>('vault_list_events', { itemId, limit, offset })
    } catch (e) {
      error.value = `Ошибка загрузки истории vault: ${e}`
    }
  }

  async function createItem(input: VaultItemInput): Promise<boolean> {
    const normalized = normalizeInput(input)
    if (!isValidInput(normalized)) {
      error.value = 'Заполните обязательные поля'
      return false
    }

    clearError()
    try {
      if (shouldUseVaultFallback()) {
        const now = new Date().toISOString()
        const createdDevItem: VaultDevItem = {
          id: crypto.randomUUID(),
          title: normalized.title,
          service: normalized.service,
          username: normalized.username,
          password: normalized.password,
          passwordMasked: maskPassword(normalized.password),
          url: normalized.url,
          notes: normalized.notes,
          tags: normalized.tags,
          createdAt: now,
          updatedAt: now,
        }
        const nextItems = [createdDevItem, ...readDevVaultItems()]
        writeDevVaultItems(nextItems)
        items.value = nextItems.map(toVaultItem)
        events.value = addDevVaultEvent(createdDevItem.id, 'created')
        return true
      }
      const created = await invoke<VaultItem>('vault_create', { input: normalized })
      items.value = [created, ...items.value.filter(item => item.id !== created.id)]
      await refreshEvents({ itemId: created.id, limit: DEFAULT_EVENTS_LIMIT, offset: 0 })
      return true
    } catch (e) {
      error.value = `Ошибка создания записи: ${e}`
      return false
    }
  }

  async function updateItem(id: string, input: VaultItemInput): Promise<boolean> {
    const normalized = normalizeInput(input)
    if (!isValidInput(normalized)) {
      error.value = 'Заполните обязательные поля'
      return false
    }

    clearError()
    try {
      if (shouldUseVaultFallback()) {
        const source = readDevVaultItems()
        const existing = source.find(item => item.id === id)
        if (!existing) return false

        const nextItems = source.map((item) => {
          if (item.id !== id) return item
          return {
            ...item,
            title: normalized.title,
            service: normalized.service,
            username: normalized.username,
            password: normalized.password,
            passwordMasked: maskPassword(normalized.password),
            url: normalized.url,
            notes: normalized.notes,
            tags: normalized.tags,
            updatedAt: new Date().toISOString(),
          }
        })

        writeDevVaultItems(nextItems)
        items.value = nextItems.map(toVaultItem)
        delete revealCache.value[id]
        events.value = addDevVaultEvent(id, 'updated')
        return true
      }
      const updated = await invoke<VaultItem>('vault_update', { id, input: normalized })
      items.value = items.value.map(item => (item.id === id ? updated : item))
      delete revealCache.value[id]
      await refreshEvents({ itemId: id, limit: DEFAULT_EVENTS_LIMIT, offset: 0 })
      return true
    } catch (e) {
      error.value = `Ошибка обновления записи: ${e}`
      return false
    }
  }

  async function deleteItem(id: string): Promise<boolean> {
    clearError()
    try {
      if (shouldUseVaultFallback()) {
        const source = readDevVaultItems()
        const exists = source.some(item => item.id === id)
        if (!exists) return false

        const nextItems = source.filter(item => item.id !== id)
        writeDevVaultItems(nextItems)
        items.value = nextItems.map(toVaultItem)
        delete revealCache.value[id]
        events.value = addDevVaultEvent(id, 'deleted')
        return true
      }
      const deleted = await invoke<boolean>('vault_delete', { id })
      if (!deleted) return false
      items.value = items.value.filter(item => item.id !== id)
      delete revealCache.value[id]
      await refreshEvents({ itemId: id, limit: DEFAULT_EVENTS_LIMIT, offset: 0 })
      return true
    } catch (e) {
      error.value = `Ошибка удаления записи: ${e}`
      return false
    }
  }

  async function revealPassword(itemId: string, refreshHistory = true): Promise<string | null> {
    clearError()
    try {
      if (shouldUseVaultFallback()) {
        const item = readDevVaultItems().find(entry => entry.id === itemId)
        if (!item) return null
        revealCache.value[itemId] = {
          value: item.password,
          expiresAt: Date.now() + REVEAL_TTL_MS,
        }
        events.value = addDevVaultEvent(itemId, 'revealed')
        return item.password
      }
      const password = await invoke<string>('vault_reveal', { id: itemId })
      if (!password) return null
      revealCache.value[itemId] = {
        value: password,
        expiresAt: Date.now() + REVEAL_TTL_MS,
      }
      if (refreshHistory) {
        await refreshEvents({ itemId, limit: DEFAULT_EVENTS_LIMIT, offset: 0 })
      }
      return password
    } catch (e) {
      error.value = `Ошибка показа пароля: ${e}`
      return null
    }
  }

  function getVisiblePassword(itemId: string): string | null {
    const cached = revealCache.value[itemId]
    if (!cached) return null
    if (cached.expiresAt <= Date.now()) {
      return null
    }
    return cached.value
  }

  function hidePassword(itemId: string): void {
    delete revealCache.value[itemId]
  }

  async function copyUsername(itemId: string): Promise<boolean> {
    const item = items.value.find(entry => entry.id === itemId)
    if (!item) return false
    try {
      await navigator.clipboard.writeText(item.username)
      if (shouldUseVaultFallback()) {
        events.value = addDevVaultEvent(itemId, 'copied_login')
        return true
      }
      await invoke<boolean>('vault_log_copy', { itemId, field: 'username' })
      await refreshEvents({ itemId, limit: DEFAULT_EVENTS_LIMIT, offset: 0 })
      return true
    } catch (e) {
      error.value = `Ошибка копирования логина: ${e}`
      return false
    }
  }

  async function copyPassword(itemId: string): Promise<boolean> {
    const password = await revealPassword(itemId, false)
    if (!password) return false
    try {
      await navigator.clipboard.writeText(password)
      if (shouldUseVaultFallback()) {
        events.value = addDevVaultEvent(itemId, 'copied_password')
        return true
      }
      await invoke<boolean>('vault_log_copy', { itemId, field: 'password' })
      await refreshEvents({ itemId, limit: DEFAULT_EVENTS_LIMIT, offset: 0 })
      return true
    } catch (e) {
      error.value = `Ошибка копирования пароля: ${e}`
      return false
    }
  }

  async function generatePassword(
    length: number = 20,
    includeSymbols: boolean = true,
    includeDigits: boolean = true,
    avoidAmbiguous: boolean = true,
  ): Promise<string | null> {
    clearError()
    try {
      if (shouldUseVaultFallback()) {
        return generateFallbackPassword(length, includeSymbols, includeDigits, avoidAmbiguous)
      }
      return await invoke<string>('vault_generate_password', {
        length,
        includeSymbols,
        includeDigits,
        avoidAmbiguous,
      })
    } catch (e) {
      error.value = `Ошибка генерации пароля: ${e}`
      return null
    }
  }

  return {
    items,
    events,
    isLoading,
    error,
    init,
    clearError,
    refreshItems,
    refreshEvents,
    createItem,
    updateItem,
    deleteItem,
    revealPassword,
    hidePassword,
    getVisiblePassword,
    copyUsername,
    copyPassword,
    generatePassword,
  }
})

// Мастер-пароль store
export const useMasterPasswordStore = defineStore('masterPassword', () => {
  const masterPasswordSettings = ref<MasterPasswordSettings>({
    isSet: false,
  })
  const isUnlocked = ref(false)
  const encryptionKey = ref<string | null>(null)

  // Инициализация - загрузка из localStorage
  function init(): void {
    const stored = localStorage.getItem('masterPasswordSettings')
    if (stored) {
      try {
        masterPasswordSettings.value = JSON.parse(stored)
      } catch (e) {
        console.error('Ошибка загрузки настроек мастер-пароля:', e)
      }
    }

    cleanupLikelyPreinstalledData()
  }

  // Сохранение настроек
  function saveSettings(): void {
    localStorage.setItem('masterPasswordSettings', JSON.stringify(masterPasswordSettings.value))
  }

  // Установка мастер-пароля
  async function setMasterPassword(password: string, hint?: string): Promise<boolean> {
    try {
      const hash = await hashPassword(password, 10)
      masterPasswordSettings.value = {
        isSet: true,
        hash,
        hint: hint || '',
        createdAt: new Date().toISOString(),
      }
      saveSettings()
      markUserDataOwned()
      return true
    } catch (error) {
      console.error('Ошибка установки мастер-пароля:', error)
      return false
    }
  }

  // Проверка пароля
  async function verifyPassword(password: string): Promise<boolean> {
    if (!masterPasswordSettings.value.hash) return false

    try {
      const isValid = await comparePassword(password, masterPasswordSettings.value.hash)
      if (isValid) {
        isUnlocked.value = true
        encryptionKey.value = password
      }
      return isValid
    } catch (error) {
      console.error('Ошибка проверки пароля:', error)
      return false
    }
  }

  // Разблокировка
  async function unlock(password: string): Promise<boolean> {
    const isValid = await verifyPassword(password)
    return isValid
  }

  // Блокировка
  function lock(): void {
    isUnlocked.value = false
    encryptionKey.value = null
  }

  // Изменение пароля
  async function changePassword(oldPassword: string, newPassword: string): Promise<boolean> {
    const isValid = await verifyPassword(oldPassword)
    if (!isValid) return false

    try {
      const hash = await hashPassword(newPassword, 10)
      masterPasswordSettings.value.hash = hash
      masterPasswordSettings.value.hint = ''
      saveSettings()
      encryptionKey.value = newPassword
      return true
    } catch (error) {
      console.error('Ошибка изменения пароля:', error)
      return false
    }
  }

  // Сброс пароля (удаляет все данные!)
  function resetPassword(): void {
    masterPasswordSettings.value = { isSet: false }
    isUnlocked.value = false
    encryptionKey.value = null
    // Очищаем все локальные данные.
    localStorage.clear()
    // Дополнительно очищаем SQLite данные Notes/Vault.
    void invoke<boolean>('storage_clear_all').catch((error) => {
      console.error('Ошибка очистки SQLite:', error)
    })
  }

  function cleanupLikelyPreinstalledData(): void {
    const isOwnedByUser = localStorage.getItem(USER_DATA_OWNERSHIP_KEY) === '1'
    if (isOwnedByUser || !masterPasswordSettings.value.isSet) return

    const notesStore = useNotesStore()
    const activeNotes = notesStore.getActiveNotes()
    if (activeNotes.length !== 1) return

    const candidate = activeNotes[0]
    const normalizedTitle = candidate.title.trim().toLowerCase()
    const hasDefaultTitle = normalizedTitle === 'новая заметка'
      || normalizedTitle === 'new note'
      || normalizedTitle === '새 메모'
    const hasEmptyContent = candidate.content.trim().length === 0

    if (!hasDefaultTitle || !hasEmptyContent) return

    resetPassword()
    markUserDataOwned()
  }

  // Шифрование данных
  function encrypt(data: string): string {
    if (!encryptionKey.value) {
      throw new Error('Приложение заблокировано')
    }
    return CryptoJS.AES.encrypt(data, encryptionKey.value).toString()
  }

  // Расшифровка данных
  function decrypt(encrypted: string): string {
    if (!encryptionKey.value) {
      throw new Error('Приложение заблокировано')
    }
    const bytes = CryptoJS.AES.decrypt(encrypted, encryptionKey.value)
    return bytes.toString(CryptoJS.enc.Utf8)
  }

  // Проверка установлен ли пароль
  function isPasswordSet(): boolean {
    return masterPasswordSettings.value.isSet
  }

  // Получение подсказки
  function getHint(): string | undefined {
    return masterPasswordSettings.value.hint
  }

  return {
    masterPasswordSettings,
    isUnlocked,
    encryptionKey,
    init,
    setMasterPassword,
    verifyPassword,
    unlock,
    lock,
    changePassword,
    resetPassword,
    encrypt,
    decrypt,
    isPasswordSet,
    getHint,
  }
})

