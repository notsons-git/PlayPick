import { describe, it, expect } from 'vitest'
import { parseDurationToMs, formatMsToDisplay } from '../utils/durationParser'
import { parsePercentage, formatPercentage } from '../utils/percentageParser'
import { parseCountdownSeconds, formatCountdownDisplay } from '../utils/countdownParser'

describe('Duration Parser & Formatter', () => {
  it('parses plain numbers as seconds', () => {
    expect(parseDurationToMs('5')).toBe(5000)
    expect(parseDurationToMs('0')).toBe(0)
    expect(parseDurationToMs('10')).toBe(10000)
  })

  it('parses decimals with both comma and dot', () => {
    expect(parseDurationToMs('5.5')).toBe(5500)
    expect(parseDurationToMs('5,5')).toBe(5500)
    expect(parseDurationToMs('0.5')).toBe(500)
    expect(parseDurationToMs('0,25')).toBe(250)
  })

  it('parses units in seconds and milliseconds', () => {
    expect(parseDurationToMs('5 сек')).toBe(5000)
    expect(parseDurationToMs('5.5сек')).toBe(5500)
    expect(parseDurationToMs('5.5 с')).toBe(5500)
    expect(parseDurationToMs('2500 мс')).toBe(2500)
    expect(parseDurationToMs('2500ms')).toBe(2500)
    expect(parseDurationToMs('0 сек')).toBe(0)
  })

  it('returns null for invalid inputs', () => {
    expect(parseDurationToMs('')).toBeNull()
    expect(parseDurationToMs('   ')).toBeNull()
    expect(parseDurationToMs('abc')).toBeNull()
    expect(parseDurationToMs('-5 сек')).toBeNull()
  })

  it('formats milliseconds to clean display strings', () => {
    expect(formatMsToDisplay(5000)).toBe('5 сек')
    expect(formatMsToDisplay(5500)).toBe('5.5 сек')
    expect(formatMsToDisplay(2500)).toBe('2.5 сек')
    expect(formatMsToDisplay(0)).toBe('0 сек')
  })
})

describe('Percentage Parser & Formatter', () => {
  it('parses numbers and percentage strings', () => {
    expect(parsePercentage('50')).toBe(50)
    expect(parsePercentage('50%')).toBe(50)
    expect(parsePercentage('+50%')).toBe(50)
    expect(parsePercentage('-25%')).toBe(-25)
    expect(parsePercentage('-100%')).toBe(-100)
    expect(parsePercentage('0%')).toBe(0)
  })

  it('parses decimal percentages with comma and dot', () => {
    expect(parsePercentage('12.5%')).toBe(12.5)
    expect(parsePercentage('12,5%')).toBe(12.5)
    expect(parsePercentage('-12,5')).toBe(-12.5)
  })

  it('rejects values below -100%', () => {
    expect(parsePercentage('-101%')).toBeNull()
    expect(parsePercentage('-150')).toBeNull()
  })

  it('returns null for invalid inputs', () => {
    expect(parsePercentage('')).toBeNull()
    expect(parsePercentage('hello')).toBeNull()
  })

  it('formats percentages cleanly with +/- signs', () => {
    expect(formatPercentage(0)).toBe('0%')
    expect(formatPercentage(50)).toBe('+50%')
    expect(formatPercentage(-25)).toBe('-25%')
    expect(formatPercentage(12.5)).toBe('+12.5%')
  })
})

describe('Countdown Delay Parser & Formatter', () => {
  it('parses plain numbers, decimals, and comma-separated seconds', () => {
    expect(parseCountdownSeconds('5')).toBe(5)
    expect(parseCountdownSeconds('3.5')).toBe(3.5)
    expect(parseCountdownSeconds('2,5 сек')).toBe(2.5)
    expect(parseCountdownSeconds('10 с')).toBe(10)
    expect(parseCountdownSeconds('5000 мс')).toBe(5)
  })

  it('rejects values out of 1-30s range or invalid strings', () => {
    expect(parseCountdownSeconds('0')).toBeNull()
    expect(parseCountdownSeconds('-2')).toBeNull()
    expect(parseCountdownSeconds('35')).toBeNull()
    expect(parseCountdownSeconds('invalid')).toBeNull()
  })

  it('formats seconds cleanly', () => {
    expect(formatCountdownDisplay(5)).toBe('5 сек')
    expect(formatCountdownDisplay(3.5)).toBe('3.5 сек')
  })
})
