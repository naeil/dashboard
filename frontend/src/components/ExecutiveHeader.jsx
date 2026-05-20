import { useEffect, useState } from 'react'
import { getExecutiveSummary } from '../api/executiveApi'

const themeStyles = {
  light: {
    wrapper: 'border-slate-200/80 bg-white/72',
    date: 'text-slate-500',
    title: 'text-slate-900',
    issueCard: 'border-slate-200 bg-white/70',
    issueLabel: 'text-slate-500',
    issueValue: 'text-slate-900',
    riskDanger: 'border-rose-200 bg-rose-50 text-rose-700',
    riskWarning: 'border-amber-200 bg-amber-50 text-amber-700',
    riskSafe: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  },
  dark: {
    wrapper: 'border-white/10 bg-slate-950/85',
    date: 'text-slate-500',
    title: 'text-white',
    issueCard: 'border-white/10 bg-white/[0.04]',
    issueLabel: 'text-slate-500',
    issueValue: 'text-white',
    riskDanger: 'border-rose-400/30 bg-rose-500/15 text-rose-100',
    riskWarning: 'border-amber-400/30 bg-amber-500/15 text-amber-100',
    riskSafe: 'border-emerald-400/30 bg-emerald-500/15 text-emerald-100',
  },
}

export default function ExecutiveHeader({ username, theme = 'light' }) {
  const [summary, setSummary] = useState(null)
  const styles = themeStyles[theme] || themeStyles.light
  const today = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date())

  useEffect(() => {
    getExecutiveSummary()
      .then((response) => setSummary(response.data))
      .catch(() => setSummary(null))
  }, [])

  const risk = summary?.cashRiskStatus || '확인중'
  const riskClass =
    risk === '위험'
      ? styles.riskDanger
      : risk === '주의'
        ? styles.riskWarning
        : styles.riskSafe

  return (
    <header className={`sticky top-0 z-30 border-b px-8 py-4 backdrop-blur transition-colors duration-300 ${styles.wrapper}`}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className={`text-xs font-bold ${styles.date}`}>{today}</p>
          <h2 className={`mt-1 text-lg font-black ${styles.title}`}>
            {summary?.companyName || 'NAEIL GROUP'} 대표 {username || '사용자'}님, 오늘의 경영 현황입니다.
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className={`rounded-lg border px-4 py-2 ${styles.issueCard}`}>
            <p className={`text-[11px] font-bold ${styles.issueLabel}`}>긴급 이슈</p>
            <p className={`text-sm font-black ${styles.issueValue}`}>{summary?.urgentIssueCount ?? 0}건</p>
          </div>
          <div className={`rounded-lg border px-4 py-2 ${riskClass}`}>
            <p className="text-[11px] font-bold opacity-80">현금 리스크</p>
            <p className="text-sm font-black">{risk}</p>
          </div>
        </div>
      </div>
    </header>
  )
}
