import { Flower2, NotebookPen, Dumbbell, TrendingUp, Beef, BookOpen, Clapperboard, Wine, CheckCircle2 } from 'lucide-react'

export function habitIcon(key?: string) {
  switch (key) {
    case 'meditate': return Flower2
    case 'journal': return NotebookPen
    case 'gym': return Dumbbell
    case 'trade': return TrendingUp
    case 'protein': return Beef
    case 'read': return BookOpen
    case 'content': return Clapperboard
    case 'alcohol': return Wine
    default: return CheckCircle2
  }
}
