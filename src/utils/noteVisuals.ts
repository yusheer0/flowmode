import type { Note } from '@/types'

export const NOTE_COLORS = {
  default: '#8c8c94',
  low: '#98baff58',
  medium: '#b89565',
  high: '#b96464',
} as const

export function getNoteBackground(note: Note): string {
  if (note.criticality) {
    return NOTE_COLORS[note.criticality]
  }

  return note.backgroundColor || NOTE_COLORS.default
}
