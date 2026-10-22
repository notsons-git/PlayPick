export type AnimationType =
  | 'sequential'
  | 'random'
  | 'cases'
  | 'horizontal_wheel'
  | 'vertical_wheel'

export interface AnimationStep {
  /** Index in the candidate array to highlight at this step */
  candidateIndex: number
  /** Cumulative delay from start of animation (in milliseconds) */
  timeMs: number
  /** Duration of this step before the next step (in milliseconds) */
  durationMs: number
}

export interface AnimationPlan {
  steps: AnimationStep[]
  totalDurationMs: number
  winnerIndex: number
}

export interface RouletteAnimationStrategy {
  type: AnimationType
  name: string
  description: string
  isAvailable: boolean
  generatePlan: (
    candidatesCount: number,
    winnerIndex: number,
    totalDurationMs: number
  ) => AnimationPlan
}
