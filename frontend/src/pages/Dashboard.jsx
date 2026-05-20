import { useState, useEffect, useCallback } from 'react'
import { startOfMonth, endOfMonth } from 'date-fns'
import {
  getSummary, getProductSales, getShopSales,
} from '../api/salesApi'

const KW = (n) => 'KRW ' + Math.round(Number(n ?? 0)).toLocaleString('ko-KR')

export default function Dashboard({ isExpanded, theme = 'light' }) {
  const today = new Date()
  const [companyId] = useState(1)
  const [startDate] = useState(startOfMonth(today))
  const [endDate] = useState(endOfMonth(today))

  const [summary, setSummary] = useState(null)
  const [products, setProducts] = useState([])
  const [shops, setShops] = useState([])
  const [loading, setLoading] = useState(false)

  const isDark = theme === 'dark'

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [sumRes, productRes, shopRes] = await Promise.all([
        getSummary(companyId, startDate, endDate),
        getProductSales(companyId, startDate, endDate),
        getShopSales(companyId, startDate, endDate),
      ])
      setSummary(sumRes.data)
      setProducts(productRes.data)
      setShops(shopRes.data)
    } catch (err) {
      console.error('API error:', err)
    } finally {
      setLoading(false)
    }
  }, [companyId, startDate, endDate])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  return (
    <main className={`min-h-screen p-8 transition-all duration-300 ${isExpanded ? 'ml-72' : 'ml-20'}`}>
      <section className="mb-10 grid grid-cols-12 gap-6">
        <div className="col-span-12">
          <h1 className="mb-2 text-3xl font-black tracking-tight text-primary">{`\uAC1C\uC694`}</h1>
          <p className="break-keep text-sm text-on-surface-variant">
            {`\uC6D4\uAC04 \uBE0C\uB79C\uB4DC \uB9E4\uCD9C\uACFC \uC0C1\uC704 \uC0C1\uD488 \uC2E4\uC801\uC744 \uD55C\uB208\uC5D0 \uD655\uC778\uD558\uACE0, \uB9C8\uCF13\uBCC4 \uD750\uB984\uAE4C\uC9C0 \uBE60\uB974\uAC8C \uC0B4\uD3B4\uBCFC \uC218 \uC788\uC2B5\uB2C8\uB2E4.`}
          </p>
        </div>

        <div className="col-span-12 flex flex-col gap-6 lg:col-span-8">
          <div
            className={`${
              isDark
                ? 'tonal-gradient text-white shadow-lg'
                : 'rounded-3xl border border-outline-variant/20 bg-surface-container-lowest text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.08)]'
            } flex min-h-[220px] flex-col justify-center rounded-xl p-8`}
          >
            <div className="mb-4">
              <span className={`text-xs font-bold uppercase tracking-widest ${isDark ? 'text-on-primary-container' : 'text-on-surface-variant'}`}>
                {`\uB204\uC801 \uCD1D \uB9E4\uCD9C\uC561`}
              </span>
              <h3 className={`mt-4 text-5xl font-black leading-tight tracking-tighter ${isDark ? 'text-white' : 'text-primary'}`}>
                {summary ? KW(summary.totalGrossAmount) : 'KRW 0'}
              </h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 rounded bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-400">
                <span className="material-symbols-outlined text-sm">trending_up</span>
                <span>12.5%</span>
              </div>
              <span className={`text-xs font-medium ${isDark ? 'text-on-primary-container' : 'text-on-surface-variant'}`}>
                {`\uC804\uC6D4 \uB300\uBE44 \uC608\uC0C1 \uBCC0\uD654`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className={`${isDark ? 'bg-surface-container-lowest' : 'bg-surface-container'} flex h-32 flex-col justify-between rounded-3xl p-5 shadow-sm`}>
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-primary-fixed p-1.5 text-primary">
                  <span className="material-symbols-outlined text-lg">payments</span>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium text-on-surface-variant">{`\uBC30\uC1A1\uBE44 \uC81C\uC678 \uB9E4\uCD9C\uC561`}</p>
                <h4 className="text-lg font-bold text-on-surface">{summary ? KW(summary.totalNetRevenue) : 'KRW 0'}</h4>
              </div>
            </div>

            <div className={`${isDark ? 'bg-surface-container-lowest' : 'bg-surface-container'} flex h-32 flex-col justify-between rounded-3xl p-5 shadow-sm`}>
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-error-container p-1.5 text-error">
                  <span className="material-symbols-outlined text-lg">percent</span>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium text-on-surface-variant">{`\uCD1D \uD560\uC778 \uAE08\uC561`}</p>
                <h4 className="text-lg font-bold text-on-surface">{summary ? KW(summary.totalDiscountAmount) : 'KRW 0'}</h4>
              </div>
            </div>

            <div className={`${isDark ? 'bg-surface-container-lowest' : 'bg-surface-container'} flex h-32 flex-col justify-between rounded-3xl p-5 shadow-sm`}>
              <div className="flex items-start justify-between">
                <div className="rounded-lg bg-rose-100 p-1.5 text-rose-600">
                  <span className="material-symbols-outlined text-lg">cancel</span>
                </div>
              </div>
              <div>
                <p className="text-[11px] font-medium text-on-surface-variant">{`\uCDE8\uC18C \uAE08\uC561`}</p>
                <h4 className="text-lg font-bold text-on-surface">{summary ? KW(summary.totalCancelAmount || 0) : 'KRW 0'}</h4>
              </div>
            </div>
          </div>
        </div>

        <div className="col-span-12 flex flex-col rounded-xl bg-surface-container-lowest p-6 shadow-sm lg:col-span-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-slate-100 p-2 text-slate-600">
                <span className="material-symbols-outlined">inventory</span>
              </div>
              <p className="text-xs font-bold text-on-surface">{`\uD604\uC7AC \uC778\uAE30 \uC0C1\uD488`}</p>
            </div>
          </div>
          <div className="inventory-scroll flex-1 overflow-y-auto pr-1">
            <div className="space-y-4">
              {products && products.slice(0, 10).map((p, i) => (
                <div key={p.productId || i} className="group flex items-center justify-between gap-4">
                  <span className="w-3/4 truncate text-xs font-medium text-on-surface-variant transition-colors group-hover:text-on-surface">{p.productName}</span>
                  <span className="whitespace-nowrap text-xs font-bold text-on-surface">{KW(p.totalNetRevenue)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="mb-10 grid grid-cols-12 gap-6">
        <section className="col-span-12 lg:col-span-8">
          <div className="h-full overflow-hidden rounded-xl bg-surface-container-lowest shadow-sm">
            <div className="flex items-center justify-between border-b border-surface-container bg-surface-container-low/30 p-6">
              <h3 className="text-lg font-bold tracking-tight">{`\uC81C\uD488\uBCC4 \uC2E4\uC801`}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low/20">
                  <tr>
                    <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-on-surface-variant">{`\uC0C1\uD488 / \uD50C\uB808\uC774\uC624\uD1A0 ID`}</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-on-surface-variant">{`\uCD1D \uB9E4\uCD9C`}</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-on-surface-variant">{`\uD560\uC778 \uAE08\uC561`}</th>
                    <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-on-surface-variant">{`\uC21C\uB9E4\uCD9C`}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container-low">
                  {products && products.slice(0, 5).map((p) => (
                    <tr key={p.productId} className="group transition-colors hover:bg-surface-container-low">
                      <td className="px-6 py-5">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-on-surface">{p.productName}</span>
                          <span className="text-xs text-on-surface-variant">{p.externalProductId || '-'}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right text-sm font-medium text-on-surface">{KW(p.totalGrossAmount)}</td>
                      <td className="px-6 py-5 text-right text-sm font-medium text-error">-{KW(p.totalDiscountAmount)}</td>
                      <td className="px-6 py-5 text-right text-sm font-bold text-primary">{KW(p.totalNetRevenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="col-span-12 flex flex-col rounded-xl bg-surface-container-lowest p-6 shadow-sm lg:col-span-4">
          <h3 className="mb-6 text-lg font-bold tracking-tight">{`\uB9C8\uCF13\uD50C\uB808\uC774\uC2A4 \uC131\uACFC`}</h3>
          <div className="space-y-6">
            {shops && shops.slice(0, 3).map((s, i) => {
              const colors = [
                { bg: 'bg-blue-600', fill: 'bg-blue-600', w: '85%' },
                { bg: 'bg-green-600', fill: 'bg-green-600', w: '60%' },
                { bg: 'bg-amber-500', fill: 'bg-amber-500', w: '45%' },
              ]
              const c = colors[i % colors.length]
              return (
                <div key={s.shopId} className="rounded-lg bg-surface-container-low/50 p-5">
                  <div className="mb-3 flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-2">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${c.bg} text-[10px] font-bold uppercase text-white`}>
                        {(s.shopCode || 'NA').slice(0, 4)}
                      </div>
                      <span className="truncate text-sm font-bold">{s.shopName}</span>
                    </div>
                    <span className="whitespace-nowrap text-sm font-extrabold">{KW(s.totalNetRevenue)}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                    <div className={`h-full ${c.fill}`} style={{ width: c.w }}></div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </main>
  )
}