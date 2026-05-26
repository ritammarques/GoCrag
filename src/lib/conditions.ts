// lib/conditions.ts
// Lógica de cálculo do score de condições por spot
// Baseado em: temperatura, humidade, precipitação, vento

import type { WeatherData, ConditionScore, ConditionStatus } from '@/types'

/**
 * Calcula o score de condições de escalada para um spot.
 *
 * Algoritmo:
 * - Começa com 100 pontos (condições perfeitas)
 * - Subtrai pontos por cada condição adversa
 * - Classifica o resultado: ≥70 Bom | ≥40 Ok | <40 Mau
 */
export function calculateConditionScore(weather: WeatherData): ConditionScore {
  let score = 100
  const reasons: string[] = []

  // ── Precipitação (penalização máxima) ────────────────
  // A chuva é o factor mais crítico: molha a rocha e os crash pads
  if (weather.rain_1h > 2) {
    score -= 60
    reasons.push('Chuva intensa')
  } else if (weather.rain_1h > 0) {
    score -= 35
    reasons.push('Chuva ligeira')
  }

  // ── Humidade (rocha molhada = aderência fraca) ────────
  if (weather.humidity > 85) {
    score -= 20
    reasons.push('Humidade muito alta')
  } else if (weather.humidity > 70) {
    score -= 10
    reasons.push('Humidade elevada')
  }

  // ── Temperatura ───────────────────────────────────────
  // <5°C: demasiado frio, dedos perdem sensibilidade
  // >35°C: demasiado calor, suor, aderência fraca
  if (weather.temp < 5 || weather.temp > 35) {
    score -= 20
    reasons.push(weather.temp < 5 ? 'Muito frio' : 'Muito calor')
  } else if (weather.temp < 10 || weather.temp > 30) {
    score -= 8
    reasons.push(weather.temp < 10 ? 'Frio' : 'Calor')
  }

  // ── Vento ─────────────────────────────────────────────
  // Perigoso em blocos altos, dificulta movimentos
  if (weather.wind_speed > 40) {
    score -= 20
    reasons.push('Vento muito forte')
  } else if (weather.wind_speed > 25) {
    score -= 10
    reasons.push('Vento forte')
  }

  // Garante que o score não é negativo
  score = Math.max(0, Math.round(score))

  // ── Classificação final ───────────────────────────────
  let status: ConditionStatus
  let label: string
  let labelShort: string

  if (score >= 70) {
    status = 'good'
    label = 'Bom para escalar'
    labelShort = 'Bom'
  } else if (score >= 40) {
    status = 'ok'
    label = 'Condições razoáveis'
    labelShort = 'Ok'
  } else {
    status = 'bad'
    label = 'Condições adversas'
    labelShort = 'Mau'
  }

  // Se não há razões negativas, acrescenta razão positiva
  if (reasons.length === 0) {
    reasons.push('Ótimas condições de escalada')
  }

  return { status, score, label, labelShort, reasons }
}

/**
 * Devolve o emoji correspondente ao estado de condições.
 */
export function conditionEmoji(status: ConditionStatus): string {
  return { good: '☀️', ok: '⛅', bad: '🌧️' }[status]
}

/**
 * Devolve as classes Tailwind para cor de fundo e texto por estado.
 */
export function conditionColors(status: ConditionStatus) {
  return {
    good: { bg: 'bg-good-bg', text: 'text-good-text', dot: 'bg-good', border: 'border-good' },
    ok:   { bg: 'bg-ok-bg',   text: 'text-ok-text',   dot: 'bg-ok',   border: 'border-ok' },
    bad:  { bg: 'bg-bad-bg',  text: 'text-bad-text',  dot: 'bg-bad',  border: 'border-bad' },
  }[status]
}
