import { useEffect, useMemo, useState } from 'react'
import { pct, riskClass, statusLabel, won } from './formatters'

export function PageHeader({ title, description }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-sky-300">Naeil Executive</p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-white">{title}</h1>
      {description && <p className="mt-2 text-sm font-medium text-slate-400">{description}</p>}
    </div>
  )
}

export function KpiCard({ label, value, change, badge, tone = 'sky', icon = 'monitoring', onClick, actionLabel, theme = 'dark' }) {
  const isLight = theme !== 'dark'
  const toneMap = {
    sky: 'bg-sky-500/15 text-sky-200 border-sky-500/20',
    emerald: 'bg-emerald-500/15 text-emerald-200 border-emerald-500/20',
    amber: 'bg-amber-500/15 text-amber-100 border-amber-500/20',
    rose: 'bg-rose-500/15 text-rose-200 border-rose-500/20',
  }

  const changeLabel = change == null
    ? '기준 데이터 없음'
    : `전월 대비 ${Number(change) >= 0 ? '+' : ''}${pct(change)}`

  const content = (
    <>
      <div className="flex items-start justify-between gap-4">
        <p className={`text-xs font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
        <span className={`material-symbols-outlined rounded-lg border p-2 text-lg ${toneMap[tone] || toneMap.sky}`}>
          {icon}
        </span>
      </div>
      <div className={`mt-3 text-2xl font-black tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{value}</div>
      <div className="mt-4 flex items-center justify-between gap-3">
        <span className={`text-xs font-bold ${Number(change || 0) >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
          {changeLabel}
        </span>
        {badge && <StatusBadge value={badge} />}
      </div>
      {actionLabel && <p className={`mt-3 text-[11px] font-black ${isLight ? 'text-sky-600' : 'text-sky-200'}`}>{actionLabel}</p>}
    </>
  )

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`group rounded-lg border p-5 text-left shadow-xl transition-colors focus:outline-none focus:ring-2 focus:ring-sky-400/50 ${
          isLight
            ? 'border-slate-200 bg-white shadow-slate-200/60 hover:border-sky-300 hover:bg-slate-50'
            : 'border-white/10 bg-slate-900/70 shadow-slate-950/20 hover:border-sky-400/40 hover:bg-slate-900'
        }`}
      >
        {content}
      </button>
    )
  }

  return (
    <article className={`rounded-lg border p-5 shadow-xl ${
      isLight
        ? 'border-slate-200 bg-white shadow-slate-200/60'
        : 'border-white/10 bg-slate-900/70 shadow-slate-950/20'
    }`}>
      {content}
    </article>
  )
}

export function StatusBadge({ value }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${riskClass(value)}`}>
      {statusLabel(value)}
    </span>
  )
}

export function Panel({ title, right, children, theme = 'dark' }) {
  const isLight = theme !== 'dark'
  return (
    <section className={`rounded-lg border p-6 shadow-xl ${
      isLight
        ? 'border-slate-200 bg-white shadow-slate-200/60'
        : 'border-white/10 bg-slate-900/70 shadow-slate-950/20'
    }`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className={`text-lg font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}

export function BarList({ rows = [], labelKey, valueKey, meta, maxValue }) {
  const max = maxValue ?? Math.max(0, ...rows.map((row) => Number(row[valueKey] || 0)))

  if (rows.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-4">
      {rows.map((row, index) => {
        const width = max > 0 ? Math.max(5, Math.min(100, (Number(row[valueKey] || 0) / max) * 100)) : 0
        return (
          <div key={`${row[labelKey]}-${index}`} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">{row[labelKey]}</p>
                {meta && <p className="text-xs text-slate-500">{meta(row)}</p>}
              </div>
              <span className="shrink-0 text-sm font-black text-sky-100">{won(row[valueKey])}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-sky-400" style={{ width: `${width}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function DataTable({
  columns,
  rows = [],
  rowKey,
  searchable = true,
  searchPlaceholder = '검색어 입력',
  pageSizeOptions = [30, 50, 100],
  defaultPageSize = 30,
  theme = 'dark',
}) {
  const isLight = theme !== 'dark'
  const [query, setQuery] = useState('')
  const initialPageSize = pageSizeOptions.includes(defaultPageSize) ? defaultPageSize : pageSizeOptions[0]
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [page, setPage] = useState(1)

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!searchable || !normalizedQuery) {
      return rows
    }

    return rows.filter((row) => (
      columns.some((column) => {
        if (column.searchable === false) return false
        const value = row[column.key]
        return value != null && String(value).toLowerCase().includes(normalizedQuery)
      })
    ))
  }, [columns, query, rows, searchable])

  useEffect(() => {
    setPage(1)
  }, [query, rows, pageSize])

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const pagedRows = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize
    return filteredRows.slice(startIndex, startIndex + pageSize)
  }, [currentPage, filteredRows, pageSize])
  const visiblePages = useMemo(() => {
    const windowSize = 5
    const startPage = Math.max(1, currentPage - Math.floor(windowSize / 2))
    const endPage = Math.min(totalPages, startPage + windowSize - 1)
    const adjustedStart = Math.max(1, endPage - windowSize + 1)
    return Array.from({ length: endPage - adjustedStart + 1 }, (_, index) => adjustedStart + index)
  }, [currentPage, totalPages])

  const startRow = filteredRows.length === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const endRow = filteredRows.length === 0 ? 0 : Math.min(filteredRows.length, currentPage * pageSize)

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {searchable ? (
          <label className="relative block max-w-md flex-1">
            <span className={`material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-base ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>search</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={searchPlaceholder}
              className={`h-10 w-full rounded-lg border py-2 pl-10 pr-3 text-sm font-bold outline-none transition-colors focus:border-sky-400 ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400'
                  : 'border-white/10 bg-slate-950 text-white placeholder:text-slate-600'
              }`}
            />
          </label>
        ) : (
          <div />
        )}

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-black text-slate-500">페이지당 표시</span>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              className={`h-10 rounded-lg border px-3 text-sm font-bold outline-none focus:border-sky-400 ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-900'
                  : 'border-white/10 bg-slate-950 text-white'
              }`}
            >
              {pageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}개
                </option>
              ))}
            </select>
          </div>
          <span className="text-xs font-bold text-slate-500">
            총 {filteredRows.length}건 중 {startRow}-{endRow}
          </span>
        </div>
      </div>

      <div className={`overflow-x-auto rounded-lg border ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <table className={`min-w-full divide-y text-left ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>
          <thead className={isLight ? 'bg-slate-50' : 'bg-slate-950/70'}>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={`whitespace-nowrap px-4 py-3 text-xs font-black ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={isLight ? 'divide-y divide-slate-200' : 'divide-y divide-white/10'}>
            {pagedRows.map((row, index) => (
              <tr key={rowKey ? rowKey(row) : index} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.03]'}>
                {columns.map((column) => (
                  <td key={column.key} className={`whitespace-nowrap px-4 py-3 text-sm font-medium ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
            {pagedRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm font-bold text-slate-500">
                  검색 결과가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs font-bold text-slate-500">
          {totalPages}페이지 중 {currentPage}페이지
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={currentPage <= 1}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-black text-slate-200 transition-colors hover:border-sky-400/40 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            이전
          </button>
          {visiblePages.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => setPage(pageNumber)}
              className={`inline-flex h-10 min-w-10 items-center justify-center rounded-lg border px-3 text-sm font-black transition-colors ${
                pageNumber === currentPage
                  ? 'border-sky-400 bg-sky-400 text-slate-950'
                  : 'border-white/10 bg-slate-950 text-slate-200 hover:border-sky-400/40 hover:bg-slate-900'
              }`}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            disabled={currentPage >= totalPages}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-black text-slate-200 transition-colors hover:border-sky-400/40 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  )
}

export function EmptyState({ message = '표시할 데이터가 없습니다.' }) {
  return (
    <div className="rounded-lg border border-dashed border-white/10 bg-slate-950/40 py-12 text-center text-sm font-bold text-slate-500">
      {message}
    </div>
  )
}
