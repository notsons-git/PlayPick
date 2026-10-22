import { describe, it, expect } from 'vitest'
import {
  sequentialStrategy,
  randomStrategy,
  getAnimationStrategy,
  getAvailableAnimationStrategies,
} from '../services/animation'

describe('Roulette Animation Strategies', () => {
  describe('Sequential Strategy', () => {
    it('always stops strictly on the predetermined winnerIndex for various candidate counts', () => {
      const testCases = [
        { count: 10, winner: 4 },
        { count: 10, winner: 0 },
        { count: 10, winner: 9 },
        { count: 3, winner: 1 },
        { count: 25, winner: 17 },
        { count: 2, winner: 0 },
        { count: 2, winner: 1 },
      ]

      for (const { count, winner } of testCases) {
        const plan = sequentialStrategy.generatePlan(count, winner, 4000)
        expect(plan.steps.length).toBeGreaterThan(15)

        const lastStep = plan.steps[plan.steps.length - 1]
        expect(lastStep.candidateIndex).toBe(winner)
        expect(plan.winnerIndex).toBe(winner)
      }
    })

    it('exhibits deceleration (later steps have longer durations than early steps)', () => {
      const plan = sequentialStrategy.generatePlan(8, 3, 4000)
      const firstQuarter = plan.steps.slice(0, 5)
      const lastQuarter = plan.steps.slice(-5)

      const avgFirst = firstQuarter.reduce((acc, s) => acc + s.durationMs, 0) / firstQuarter.length
      const avgLast = lastQuarter.reduce((acc, s) => acc + s.durationMs, 0) / lastQuarter.length

      expect(avgLast).toBeGreaterThan(avgFirst * 2)
    })

    it('handles single candidate gracefully', () => {
      const plan = sequentialStrategy.generatePlan(1, 0, 4000)
      expect(plan.steps.length).toBe(1)
      expect(plan.steps[0].candidateIndex).toBe(0)
      expect(plan.winnerIndex).toBe(0)
    })

    it('handles 0 duration gracefully by returning immediate winner landing', () => {
      const plan = sequentialStrategy.generatePlan(5, 2, 0)
      expect(plan.totalDurationMs).toBe(0)
      expect(plan.winnerIndex).toBe(2)
      expect(plan.steps).toHaveLength(1)
      expect(plan.steps[0].candidateIndex).toBe(2)
    })

    it('handles 0 candidates without errors', () => {
      const plan = sequentialStrategy.generatePlan(0, -1, 4000)
      expect(plan.steps.length).toBe(0)
    })
  })

  describe('Random Strategy', () => {
    it('always finishes on the predetermined winner on the final step', () => {
      for (let i = 0; i < 10; i++) {
        const winner = Math.floor(Math.random() * 8)
        const plan = randomStrategy.generatePlan(8, winner, 4000)
        const lastStep = plan.steps[plan.steps.length - 1]
        expect(lastStep.candidateIndex).toBe(winner)
      }
    })

    it('handles single candidate in random strategy', () => {
      const plan = randomStrategy.generatePlan(1, 0, 4000)
      expect(plan.steps.length).toBe(1)
      expect(plan.steps[0].candidateIndex).toBe(0)
    })

    it('handles 0 duration gracefully for random strategy', () => {
      const plan = randomStrategy.generatePlan(5, 3, 0)
      expect(plan.totalDurationMs).toBe(0)
      expect(plan.winnerIndex).toBe(3)
      expect(plan.steps).toHaveLength(1)
      expect(plan.steps[0].candidateIndex).toBe(3)
    })
  })

  describe('Animation Registry & Future Extension Points', () => {
    it('provides sequential strategy as default', () => {
      const strat = getAnimationStrategy()
      expect(strat.type).toBe('sequential')
    })

    it('returns random strategy when requested', () => {
      const strat = getAnimationStrategy('random')
      expect(strat.type).toBe('random')
    })

    it('returns cases, horizontal_wheel, and vertical_wheel strategies when requested', () => {
      expect(getAnimationStrategy('cases').type).toBe('cases')
      expect(getAnimationStrategy('horizontal_wheel').type).toBe('horizontal_wheel')
      expect(getAnimationStrategy('vertical_wheel').type).toBe('vertical_wheel')
    })

    it('falls back to default sequential for unknown animation modes', () => {
      // @ts-expect-error testing invalid mode
      const strat = getAnimationStrategy('unknown_mode')
      expect(strat.type).toBe('sequential')
    })

    it('lists all 5 available animation modes', () => {
      const available = getAvailableAnimationStrategies()
      const types = available.map((s) => s.type)
      expect(types).toEqual([
        'sequential',
        'random',
        'cases',
        'horizontal_wheel',
        'vertical_wheel',
      ])
    })
  })
})
