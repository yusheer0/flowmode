import type { InjectionKey } from 'vue'
import type { useNotesSheets } from '@/composables/useNotesSheets'

export const NOTES_SHEETS_KEY: InjectionKey<ReturnType<typeof useNotesSheets>> = Symbol('notesSheets')
