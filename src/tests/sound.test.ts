import { describe, it, expect } from 'vitest'
import { soundService } from '../services/sound/soundService'

describe('Sound Service', () => {
  it('allows toggling enabled/disabled state', () => {
    soundService.setEnabled(false)
    expect(soundService.isEnabled()).toBe(false)

    soundService.setEnabled(true)
    expect(soundService.isEnabled()).toBe(true)
  })

  it('safely handles playTick and playWin without throwing in test environment', () => {
    expect(() => {
      soundService.playTick()
      soundService.playTick(1.2)
      soundService.playWin()
    }).not.toThrow()
  })

  it('does nothing when disabled', () => {
    soundService.setEnabled(false)
    expect(() => {
      soundService.playTick()
      soundService.playWin()
    }).not.toThrow()
    soundService.setEnabled(true)
  })
})
