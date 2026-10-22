import type {
  AnimationType,
  AnimationPlan,
  AnimationStep,
  RouletteAnimationStrategy,
} from './types'

export type { AnimationType, AnimationPlan, AnimationStep, RouletteAnimationStrategy }

/**
 * Calculates step durations with smooth quadratic deceleration (ease-out)
 * so that early steps fly quickly and later steps slow down significantly.
 */
function generateDecelerationSchedule(
  targetDurationMs: number,
  minSteps = 28,
  maxSteps = 42
): number[] {
  const stepsCount = Math.max(minSteps, Math.min(maxSteps, Math.round(targetDurationMs / 100)))
  const initialDur = 45
  const finalDur = 480

  const rawDurations: number[] = []
  for (let i = 0; i < stepsCount; i++) {
    const progress = i / (stepsCount - 1) // 0 to 1
    // Quadratic ease-out curve for deceleration
    const dur = initialDur + (finalDur - initialDur) * Math.pow(progress, 2.2)
    rawDurations.push(dur)
  }

  // Scale durations proportionally to exactly match targetDurationMs
  const rawSum = rawDurations.reduce((acc, d) => acc + d, 0)
  const scale = targetDurationMs / rawSum

  return rawDurations.map((d) => Math.max(30, Math.round(d * scale)))
}

/**
 * Strategy 1: Sequential Animation (Default)
 * Cycles through candidates top-to-bottom, starting rapidly,
 * decelerating smoothly, and landing strictly on the predetermined winner.
 */
export const sequentialStrategy: RouletteAnimationStrategy = {
  type: 'sequential',
  name: 'Последовательная',
  description: 'Подсветка игр сверху вниз с постепенным замедлением',
  isAvailable: true,
  generatePlan: (candidatesCount, winnerIndex, totalDurationMs) => {
    if (candidatesCount <= 0) {
      return { steps: [], totalDurationMs: 0, winnerIndex: -1 }
    }

    if (totalDurationMs <= 0) {
      return {
        steps: [{ candidateIndex: winnerIndex, timeMs: 0, durationMs: 0 }],
        totalDurationMs: 0,
        winnerIndex,
      }
    }

    if (candidatesCount === 1) {
      return {
        steps: [{ candidateIndex: 0, timeMs: 0, durationMs: 700 }],
        totalDurationMs: 700,
        winnerIndex: 0,
      }
    }

    const durations = generateDecelerationSchedule(totalDurationMs)
    const K = durations.length

    // To guarantee that step K - 1 lands exactly on winnerIndex:
    // (startOffset + K - 1) % candidatesCount = winnerIndex
    let startOffset = (winnerIndex - (K - 1)) % candidatesCount
    while (startOffset < 0) {
      startOffset += candidatesCount
    }

    let currentTime = 0
    const steps: AnimationStep[] = []

    for (let stepIndex = 0; stepIndex < K; stepIndex++) {
      const candidateIndex = (startOffset + stepIndex) % candidatesCount
      const stepDuration = durations[stepIndex]

      steps.push({
        candidateIndex,
        timeMs: currentTime,
        durationMs: stepDuration,
      })

      currentTime += stepDuration
    }

    return {
      steps,
      totalDurationMs: currentTime,
      winnerIndex,
    }
  },
}

/**
 * Strategy 2: Random Animation
 * Highlights random candidate games with increasing delays,
 * finally coming to rest exactly on the predetermined winner.
 */
export const randomStrategy: RouletteAnimationStrategy = {
  type: 'random',
  name: 'Случайная',
  description: 'Случайная подсветка подходящих игр с плавным замедлением',
  isAvailable: true,
  generatePlan: (candidatesCount, winnerIndex, totalDurationMs) => {
    if (candidatesCount <= 0) {
      return { steps: [], totalDurationMs: 0, winnerIndex: -1 }
    }

    if (totalDurationMs <= 0) {
      return {
        steps: [{ candidateIndex: winnerIndex, timeMs: 0, durationMs: 0 }],
        totalDurationMs: 0,
        winnerIndex,
      }
    }

    if (candidatesCount === 1) {
      return {
        steps: [{ candidateIndex: 0, timeMs: 0, durationMs: 700 }],
        totalDurationMs: 700,
        winnerIndex: 0,
      }
    }

    const durations = generateDecelerationSchedule(totalDurationMs)
    const K = durations.length
    const steps: AnimationStep[] = []
    let currentTime = 0
    let lastIndex = -1

    for (let stepIndex = 0; stepIndex < K; stepIndex++) {
      let candidateIndex: number

      if (stepIndex === K - 1) {
        // Guaranteed landing on predetermined winner
        candidateIndex = winnerIndex
      } else {
        // Pick random index avoiding immediate repetition when candidates > 1
        let attempts = 0
        do {
          candidateIndex = Math.floor(Math.random() * candidatesCount)
          attempts++
        } while (candidateIndex === lastIndex && attempts < 10)
      }

      lastIndex = candidateIndex
      const stepDuration = durations[stepIndex]

      steps.push({
        candidateIndex,
        timeMs: currentTime,
        durationMs: stepDuration,
      })

      currentTime += stepDuration
    }

    return {
      steps,
      totalDurationMs: currentTime,
      winnerIndex,
    }
  },
}

/**
 * Strategy 3: Cases (CS:GO style case opening)
 */
export const casesStrategy: RouletteAnimationStrategy = {
  type: 'cases',
  name: 'Кейсы',
  description: 'Анимация открытия кейса с эффектным появлением выбранной игры',
  isAvailable: true,
  generatePlan: (count, winner, duration) => sequentialStrategy.generatePlan(count, winner, duration),
}

/**
 * Strategy 4: Horizontal Roulette (CS tape)
 */
export const horizontalWheelStrategy: RouletteAnimationStrategy = {
  type: 'horizontal_wheel',
  name: 'Горизонтальная рулетка',
  description: 'Карточки игр перемещаются в горизонтальной ленте с плавной остановкой',
  isAvailable: true,
  generatePlan: (count, winner, duration) => sequentialStrategy.generatePlan(count, winner, duration),
}

/**
 * Strategy 5: Vertical Roulette
 */
export const verticalWheelStrategy: RouletteAnimationStrategy = {
  type: 'vertical_wheel',
  name: 'Вертикальная рулетка',
  description: 'Вертикальное движение ленты карточек со стрелками указателя',
  isAvailable: true,
  generatePlan: (count, winner, duration) => sequentialStrategy.generatePlan(count, winner, duration),
}

export const ANIMATION_STRATEGIES: Record<AnimationType, RouletteAnimationStrategy> = {
  sequential: sequentialStrategy,
  random: randomStrategy,
  cases: casesStrategy,
  horizontal_wheel: horizontalWheelStrategy,
  vertical_wheel: verticalWheelStrategy,
}

export function getAnimationStrategy(type?: AnimationType): RouletteAnimationStrategy {
  if (type && ANIMATION_STRATEGIES[type] && ANIMATION_STRATEGIES[type].isAvailable) {
    return ANIMATION_STRATEGIES[type]
  }
  return sequentialStrategy
}

export function getAvailableAnimationStrategies(): RouletteAnimationStrategy[] {
  return Object.values(ANIMATION_STRATEGIES).filter((s) => s.isAvailable)
}
