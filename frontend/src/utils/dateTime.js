const KST_TIME_ZONE = 'Asia/Seoul'
const HAS_TIME_ZONE_SUFFIX = /[zZ]|[+-]\d{2}:\d{2}$/

function normalizeDateTimeValue(value) {
  if (typeof value !== 'string') {
    return value
  }

  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return trimmedValue
  }

  const isoLikeValue = trimmedValue.includes(' ') ? trimmedValue.replace(' ', 'T') : trimmedValue
  if (isoLikeValue.includes('T') && !HAS_TIME_ZONE_SUFFIX.test(isoLikeValue)) {
    return `${isoLikeValue}Z`
  }

  return isoLikeValue
}

export function parseApiDateTime(value) {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const parsedDate = new Date(normalizeDateTimeValue(value))
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

export function formatDateTimeKst(value, options = {}) {
  const date = parseApiDateTime(value)
  if (!date) return '-'

  return date.toLocaleString('ko-KR', {
    timeZone: KST_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  })
}

export function formatTimeKst(value, options = {}) {
  const date = parseApiDateTime(value)
  if (!date) return '-'

  return date.toLocaleString('ko-KR', {
    timeZone: KST_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...options,
  })
}
