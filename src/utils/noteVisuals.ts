import type { Note } from '@/types'

export const NOTE_COLORS = {
  default: '#7474747c',
  low: '#98baff81',
  medium: '#ddb37980',
  high: '#b964647c',
} as const

export function getNoteBackground(note: Note): string {
  if (note.criticality) {
    return NOTE_COLORS[note.criticality]
  }

  return note.backgroundColor || NOTE_COLORS.default
}
