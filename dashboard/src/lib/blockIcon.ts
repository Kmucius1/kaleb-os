import {
  Sunrise, TrendingUp, NotebookPen, Flower2, Dumbbell, Waves, UtensilsCrossed,
  Moon, Shirt, Headphones, Briefcase, BookOpen, Boxes, Clapperboard, RotateCcw,
  PartyPopper, Sparkles,
} from 'lucide-react'

// Map a schedule block title to a fitting line icon (mockup uses per-activity glyphs).
export function blockIcon(title: string) {
  const t = title.toLowerCase()
  if (t.includes('wake')) return Sunrise
  if (t.includes('journal') || t.includes('debrief')) return NotebookPen
  if (t.includes('trad')) return TrendingUp
  if (t.includes('medit')) return Flower2
  if (t.includes('gym')) return Dumbbell
  if (t.includes('beach') || t.includes('walk')) return Waves
  if (t.includes('breakfast') || t.includes('dinner') || t.includes('lunch') || t.includes('eat')) return UtensilsCrossed
  if (t.includes('sleep') || t.includes('recovery')) return Moon
  if (t.includes('prepare') || t.includes('shower')) return Shirt
  if (t.includes('commute')) return Headphones
  if (t.includes('dryp') || t.includes('work')) return Briefcase
  if (t.includes('study') || t.includes('deep')) return BookOpen
  if (t.includes('asset') || t.includes('build')) return Boxes
  if (t.includes('content')) return Clapperboard
  if (t.includes('review') || t.includes('reset')) return RotateCcw
  if (t.includes('enjoy') || t.includes('life') || t.includes('rest')) return PartyPopper
  return Sparkles
}
