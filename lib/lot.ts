/** LOT 번호 앞뒤 공백 제거 */
export function normalizeLot(value?: string): string {
  return value?.trim() ?? ''
}

/** 시작 LOT 기준으로 종료 순번을 전체 LOT 형식으로 조합 */
export function buildLotEnd(start: string, endSuffix: string): string {
  if (!start || !endSuffix) return ''

  const prefix = start.split('-')[0]
  const suffix = endSuffix.includes('-')
    ? endSuffix.trim().split('-').pop() ?? endSuffix.trim()
    : endSuffix.trim()

  return `${prefix}-${suffix}`
}
