import { describe, expect, it } from 'vitest'
import { classifyWorkType, isDelegable, leverageOf, WORK_TYPES } from './workType'

const c = (title: string, area?: string) => classifyWorkType({ title, area })

describe('classifying by leverage', () => {
  it('recognises the work only he can do', () => {
    expect(c('Decide 2027 pricing for the retainer')).toBe('ceo')
    expect(c('Rework DRYP positioning for AI automation')).toBe('ceo')
    expect(c('Interview a contractor for the build team')).toBe('ceo')
    expect(c('Partnership conversation with Hancock Whitney')).toBe('ceo')
  })

  it('recognises making the thing', () => {
    expect(c('Build the Fuel photo capture flow')).toBe('builder')
    expect(c('Fix the broken webhook on the CRM')).toBe('builder')
    expect(c('Deploy KalebOS to production')).toBe('builder')
  })

  it('recognises running people and clients', () => {
    expect(c('Follow up with the client about the proposal')).toBe('management')
    expect(c('Weekly sync with the team')).toBe('management')
    expect(c('Review and approve the EHM scope')).toBe('management')
  })

  it('recognises the pile that should be handed off', () => {
    expect(c('Send the September invoices')).toBe('admin')
    expect(c('File the 1099s')).toBe('admin')
    expect(c('Renew the Figma subscription')).toBe('admin')
  })

  it('puts the more specific rule first', () => {
    // Both "invoice" and "client" appear. Invoicing is admin, not management —
    // it is the thing you want off his desk.
    expect(c('Invoice the client for August')).toBe('admin')
  })

  it('falls back to the area only when the words say nothing', () => {
    expect(c('Q3', 'clients')).toBe('management')
    expect(c('Thing', 'kaleb-os')).toBe('builder')
  })

  it('returns null rather than guessing', () => {
    // A task the rules cannot place is better left unclassified than pushed
    // into a bucket that will then be counted, charted and acted on.
    expect(c('Misc')).toBeNull()
    expect(c('', undefined)).toBeNull()
    expect(classifyWorkType({ title: null, description: null, area: null })).toBeNull()
  })

  it('only ever returns a valid value for the CHECK constraint', () => {
    const samples = ['Send invoices', 'Build the thing', 'Client call', 'Decide pricing', 'Misc', '']
    for (const s of samples) {
      const t = c(s)
      if (t !== null) expect(WORK_TYPES).toContain(t)
    }
  })
})

describe('what can be handed off', () => {
  it('flags admin and management, never CEO', () => {
    expect(isDelegable('admin')).toBe(true)
    expect(isDelegable('management')).toBe(true)
    expect(isDelegable('ceo')).toBe(false)
    // Builder work is delegable in principle but is where his leverage is now.
    expect(isDelegable('builder')).toBe(false)
    expect(isDelegable(null)).toBeNull()
  })
})

describe('reading the office day', () => {
  it('reports leverage and what could be handed off', () => {
    const l = leverageOf([
      { work_type: 'ceo' }, { work_type: 'builder' }, { work_type: 'builder' },
      { work_type: 'admin' }, { work_type: 'management' }, { work_type: null },
    ])
    expect(l.classified).toBe(5)
    expect(l.delegable).toBe(2)
    expect(l.leveragePct).toBe(60)
    expect(l.delegablePct).toBe(40)
  })

  it('says nothing rather than dividing by zero', () => {
    const l = leverageOf([{ work_type: null }, { work_type: null }])
    expect(l.leveragePct).toBeNull()
    expect(l.counts.unclassified).toBe(2)
  })

  it('treats an unknown stored value as unclassified, not as a category', () => {
    const l = leverageOf([{ work_type: 'nonsense' }])
    expect(l.counts.unclassified).toBe(1)
    expect(l.classified).toBe(0)
  })
})
