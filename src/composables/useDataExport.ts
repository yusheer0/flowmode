import { invoke } from '@tauri-apps/api/core'
import { save } from '@tauri-apps/plugin-dialog'
import { writeTextFile } from '@tauri-apps/plugin-fs'
import { ref } from 'vue'
import type {
  AppSettings,
  Habit,
  MasterPasswordSettings,
  Note,
  NotesLayer,
  VaultEvent,
  VaultItem,
} from '@/types'

const SETTINGS_STORAGE_KEY = 'appSettings'
const MASTER_PASSWORD_STORAGE_KEY = 'masterPasswordSettings'
const HABITS_STORAGE_KEY = 'habitsTrackerItems'
const NOTES_LEGACY_STORAGE_KEY = 'notes'
const DEV_VAULT_ITEMS_KEY = 'vaultItemsDev'
const DEV_VAULT_EVENTS_KEY = 'vaultEventsDev'
const STORAGE_KEYS = {
  notesLayers: 'notesLayers',
  notesActiveLayer: 'notesActiveLayer',
} as const
const VAULT_EVENTS_BATCH_SIZE = 1000

type StorageMap = Record<string, string>
type StoredNoteRecord = { id: string; payload: string; updatedAt?: number }
type ExportResult = { status: 'success'; path: string } | { status: 'cancelled' } | { status: 'error' }

type ExportPayload = {
  schemaVersion: 1
  exportedAt: string
  source: 'flowmode'
  settings: AppSettings | null
  masterPasswordSettings: MasterPasswordSettings | null
  notes: {
    items: Note[]
    layers: NotesLayer[]
    activeLayerId: string
  }
  habits: Habit[]
  vault: {
    items: VaultItem[]
    events: VaultEvent[]
  }
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

async function readNotesItems(): Promise<Note[]> {
  try {
    const records = await invoke<StoredNoteRecord[]>('notes_list')
    if (!Array.isArray(records) || records.length === 0) {
      return parseJson<Note[]>(localStorage.getItem(NOTES_LEGACY_STORAGE_KEY), [])
    }
    return records
      .map((entry) => {
        try {
          return JSON.parse(entry.payload) as Note
        } catch {
          return null
        }
      })
      .filter((note): note is Note => note !== null)
  } catch {
    return parseJson<Note[]>(localStorage.getItem(NOTES_LEGACY_STORAGE_KEY), [])
  }
}

async function readNotesMeta(): Promise<{ layers: NotesLayer[]; activeLayerId: string }> {
  try {
    const values = await invoke<StorageMap>('storage_get_many', {
      keys: [STORAGE_KEYS.notesLayers, STORAGE_KEYS.notesActiveLayer],
    })
    return {
      layers: parseJson<NotesLayer[]>(values[STORAGE_KEYS.notesLayers] || null, []),
      activeLayerId: values[STORAGE_KEYS.notesActiveLayer] || '',
    }
  } catch {
    return {
      layers: [],
      activeLayerId: '',
    }
  }
}

async function readVaultEvents(): Promise<VaultEvent[]> {
  try {
    const allEvents: VaultEvent[] = []
    let offset = 0
    while (true) {
      const batch = await invoke<VaultEvent[]>('vault_list_events', {
        limit: VAULT_EVENTS_BATCH_SIZE,
        offset,
      })
      if (!Array.isArray(batch) || batch.length === 0) break
      allEvents.push(...batch)
      if (batch.length < VAULT_EVENTS_BATCH_SIZE) break
      offset += VAULT_EVENTS_BATCH_SIZE
    }
    return allEvents
  } catch {
    return parseJson<VaultEvent[]>(localStorage.getItem(DEV_VAULT_EVENTS_KEY), [])
  }
}

async function createPayload(): Promise<ExportPayload> {
  const [notes, notesMeta, vaultItems, vaultEvents] = await Promise.all([
    readNotesItems(),
    readNotesMeta(),
    invoke<VaultItem[]>('vault_list').catch(() => parseJson<VaultItem[]>(localStorage.getItem(DEV_VAULT_ITEMS_KEY), [])),
    readVaultEvents(),
  ])

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    source: 'flowmode',
    settings: parseJson<AppSettings | null>(localStorage.getItem(SETTINGS_STORAGE_KEY), null),
    masterPasswordSettings: parseJson<MasterPasswordSettings | null>(
      localStorage.getItem(MASTER_PASSWORD_STORAGE_KEY),
      null
    ),
    notes: {
      items: notes,
      layers: notesMeta.layers,
      activeLayerId: notesMeta.activeLayerId,
    },
    habits: parseJson<Habit[]>(localStorage.getItem(HABITS_STORAGE_KEY), []),
    vault: {
      items: vaultItems,
      events: vaultEvents,
    },
  }
}

function buildDefaultExportName(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  return `flowmode-export-${stamp}.json`
}

export function useDataExport() {
  const isExporting = ref(false)

  async function exportAllData(): Promise<ExportResult> {
    if (isExporting.value) return { status: 'cancelled' }
    isExporting.value = true
    try {
      const payload = await createPayload()
      const targetPath = await save({
        defaultPath: buildDefaultExportName(),
        filters: [{ name: 'JSON', extensions: ['json'] }],
      })

      if (!targetPath) {
        return { status: 'cancelled' }
      }

      await writeTextFile(targetPath, JSON.stringify(payload, null, 2))
      return { status: 'success', path: targetPath }
    } catch (error) {
      console.error('Ошибка экспорта данных:', error)
      return { status: 'error' }
    } finally {
      isExporting.value = false
    }
  }

  return {
    isExporting,
    exportAllData,
  }
}
