class SoundService {
  private ctx: AudioContext | null = null
  private enabled: boolean = true
  private notificationSoundEnabled: boolean = true
  private lastNotificationSoundTime: number = 0

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  public isEnabled(): boolean {
    return this.enabled
  }

  public setNotificationSoundEnabled(enabled: boolean): void {
    this.notificationSoundEnabled = enabled
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        if (AudioCtx) {
          this.ctx = new AudioCtx()
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        void this.ctx.resume()
      }
      return this.ctx
    } catch {
      return null
    }
  }

  /**
   * Crisp mechanical click/tick sound for sequential/random step
   */
  public playTick(pitchMod = 1): void {
    if (!this.enabled) return
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const now = ctx.currentTime

      // Short high-frequency click with fast pitch drop
      osc.type = 'triangle'
      osc.frequency.setValueAtTime(850 * pitchMod, now)
      osc.frequency.exponentialRampToValueAtTime(180 * pitchMod, now + 0.028)

      gain.gain.setValueAtTime(0.18, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.032)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.035)
    } catch {
      // Audio errors should never crash or break UX
    }
  }

  /**
   * Resonant celebratory chime when the winner is chosen
   */
  public playWin(): void {
    if (!this.enabled) return
    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const notes = [523.25, 659.25, 783.99, 1046.50] // C5, E5, G5, C6 (major chord arpeggio)

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const noteStart = now + idx * 0.09

        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, noteStart)

        gain.gain.setValueAtTime(0, noteStart)
        gain.gain.linearRampToValueAtTime(0.2, noteStart + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.45)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(noteStart)
        osc.stop(noteStart + 0.46)
      })
    } catch {
      // Safe fallback
    }
  }

  /**
   * Gentle, subtle non-intrusive sound for error alerts
   */
  public playNotificationError(volume = 0.35): void {
    if (!this.notificationSoundEnabled || !this.enabled) return
    const nowMs = Date.now()
    if (nowMs - this.lastNotificationSoundTime < 3000) return
    this.lastNotificationSoundTime = nowMs

    try {
      const ctx = this.getContext()
      if (!ctx) return

      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(380, now)
      osc.frequency.exponentialRampToValueAtTime(290, now + 0.12)

      const masterVol = Math.max(0.01, Math.min(0.8, volume * 0.15))
      gain.gain.setValueAtTime(0, now)
      gain.gain.linearRampToValueAtTime(masterVol, now + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.15)
    } catch {
      // Safe fallback
    }
  }
}

export const soundService = new SoundService()
