import { useEffect, useMemo, useState } from 'react'
import { buildApiUrl } from '../api/apiBase'
import { getAuthToken } from '../api/authApi'
import { getBrands, getInventoryAlerts, getProductInventory, updateProductSafeStock } from '../api/salesApi'
import InventoryRiskPage from './executive/InventoryRiskPage'

function formatNumber(value) {
  return Number(value ?? 0).toLocaleString('ko-KR')
}

function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

const INVENTORY_TABS = [
  { id: 'operations', label: '운영 재고' },
  { id: 'risk', label: '재고 리스크' },
]

function SummaryCard({ label, value }) {
  return (
    <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="mb-3 break-keep text-[10px] font-bold leading-snug tracking-[0.1em] text-slate-400 sm:text-[11px] lg:text-xs">
        {label}
      </p>
      <p className="overflow-hidden text-[clamp(2.1rem,2.6vw,3rem)] font-black leading-none tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  )
}

function isLowStock(item) {
  const safeStock = Number(item.safeStock ?? 0)
  const realStock = Number(item.realStock ?? 0)
  return safeStock > 0 && realStock <= safeStock
}

function FloatingAlertPanel({ alerts }) {
  const [isCollapsed, setIsCollapsed] = useState(true)
  const [selectedBrand, setSelectedBrand] = useState('ALL')

  // 브랜드 탭 목록 동적 생성 (hook은 조건문 앞에 위치해야 함)
  const brands = useMemo(() => {
    const seen = new Map()
    alerts.forEach((a) => {
      const key = String(a.brandId ?? a.brandName ?? '')
      if (key && !seen.has(key)) seen.set(key, a.brandName)
    })
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [alerts])

  const tabs = [{ id: 'ALL', name: '전체' }, ...brands]

  const visibleAlerts = selectedBrand === 'ALL'
    ? alerts
    : alerts.filter((a) => String(a.brandId ?? a.brandName ?? '') === selectedBrand)

  if (alerts.length === 0) return null

  if (isCollapsed) {
    return (
      <button
        type="button"
        onClick={() => setIsCollapsed(false)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-full border border-amber-200 bg-white px-4 py-3 shadow-2xl transition hover:-translate-y-0.5 hover:shadow-xl"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6" fill="none">
            <path d="M12 3v10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M9 6l3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 14.5a4.5 4.5 0 014.5-4.5h5A4.5 4.5 0 0119 14.5V16a5 5 0 01-5 5H10a5 5 0 01-5-5v-1.5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </svg>
        </span>
        <span className="text-left">
          <span className="block text-xs font-bold uppercase tracking-[0.16em] text-amber-500">Inventory Alert</span>
          <span className="block text-sm font-black text-slate-900">안전재고 {alerts.length}건</span>
        </span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-[min(24rem,calc(100vw-2rem))] rounded-3xl border border-amber-200 bg-white/95 p-5 shadow-2xl backdrop-blur">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-500">Inventory Alert</p>
          <h3 className="mt-2 text-lg font-black text-slate-900">안전재고 이하 {alerts.length}건</h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:border-slate-300 hover:text-slate-700"
            aria-label="재고 알림 접기"
          >
            <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
              <path d="M5 10h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* 브랜드 탭 */}
      {brands.length >= 1 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tabs.map((tab) => {
            const count = tab.id === 'ALL'
              ? alerts.length
              : alerts.filter((a) => String(a.brandId ?? a.brandName ?? '') === tab.id).length
            const active = selectedBrand === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedBrand(tab.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors ${
                  active
                    ? 'border-amber-300 bg-amber-100 text-amber-800'
                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                {tab.name}
                <span className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-black ${
                  active ? 'bg-amber-800 text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* 알림 목록 */}
      <div className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-0.5">
        {visibleAlerts.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">해당 브랜드의 알림이 없습니다.</p>
        ) : (
          visibleAlerts.map((alert) => (
            <div key={alert.alertId} className="rounded-2xl bg-amber-50 px-4 py-3">
              <p className="text-sm font-bold text-slate-900">{alert.productName}</p>
              <p className="mt-1 text-xs text-slate-500">
                {alert.brandName} / {alert.skuCd || 'SKU 미등록'}
              </p>
              <p className="mt-2 text-sm font-semibold text-amber-700">
                현재 재고 {formatNumber(alert.realStock)} / 안전재고 {formatNumber(alert.safeStock)}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function BrandFilterTabs({ brands, items, selectedBrand, onSelect }) {
  const countByBrand = useMemo(() => {
    const next = new Map()
    items.forEach((item) => {
      const key = String(item.brandId ?? '')
      if (!key) return
      next.set(key, (next.get(key) || 0) + 1)
    })
    return next
  }, [items])

  const tabs = [
    { id: 'ALL', label: '전체', count: items.length },
    ...brands.map((brand) => ({
      id: String(brand.brandId),
      label: brand.brandName,
      count: countByBrand.get(String(brand.brandId)) || 0,
    })),
  ]

  return (
    <div className="mb-8 flex flex-wrap gap-3">
      {tabs.map((tab) => {
        const active = selectedBrand === tab.id

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelect(tab.id)}
            className={`inline-flex h-11 items-center gap-3 rounded-xl border px-5 text-sm font-black transition-colors ${
              active
                ? 'border-sky-300 bg-sky-100 text-sky-700 shadow-sm'
                : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`inline-flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-xs font-black ${
              active ? 'bg-white text-sky-800' : 'bg-slate-50 text-slate-500'
            }`}>
              {formatNumber(tab.count)}
            </span>
          </button>
        )
      })}
    </div>
  )
}

export default function ProductInventory({ isExpanded, theme = 'light' }) {
  const [companyId] = useState(1)
  const selectedMonth = getCurrentMonth()
  const [selectedBrand, setSelectedBrand] = useState('ALL')
  const [brands, setBrands] = useState([])
  const [items, setItems] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingProductId, setEditingProductId] = useState(null)
  const [safeStockInput, setSafeStockInput] = useState('')
  const [savingSafeStock, setSavingSafeStock] = useState(false)
  const [activeTab, setActiveTab] = useState('operations')

  const loadInventoryPage = async () => {
    try {
      setLoading(true)
      const [inventoryResponse, alertsResponse] = await Promise.all([
        getProductInventory(companyId, null, selectedMonth),
        getInventoryAlerts(companyId),
      ])

      setItems(inventoryResponse.data || [])
      setAlerts(alertsResponse.data || [])
    } catch (error) {
      console.error('Inventory API error:', error)
      setItems([])
      setAlerts([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInventoryPage()
  }, [companyId, selectedMonth])

  useEffect(() => {
    const fetchBrands = async () => {
      try {
        const response = await getBrands(companyId)
        setBrands(response.data || [])
      } catch (error) {
        console.error('Brand API error:', error)
        setBrands([])
      }
    }

    fetchBrands()
  }, [companyId])

  useEffect(() => {
    const token = getAuthToken()
    if (!token) return undefined

    const params = new URLSearchParams({
      companyId: String(companyId),
      token,
    })

    const eventSource = new EventSource(`${buildApiUrl('/products/inventory/alerts/stream')}?${params.toString()}`)

    eventSource.addEventListener('inventory-alerts', (event) => {
      try {
        const nextAlerts = JSON.parse(event.data)
        setAlerts(Array.isArray(nextAlerts) ? nextAlerts : [])
      } catch (error) {
        console.error('Inventory alerts SSE parse error:', error)
      }
    })

    eventSource.onerror = () => {
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [companyId])

  const filteredItems = useMemo(() => (
    selectedBrand === 'ALL'
      ? items
      : items.filter((item) => String(item.brandId ?? '') === selectedBrand)
  ), [items, selectedBrand])

  const filteredAlerts = useMemo(() => (
    selectedBrand === 'ALL'
      ? alerts
      : alerts.filter((alert) => String(alert.brandId ?? '') === selectedBrand)
  ), [alerts, selectedBrand])

  const summary = useMemo(() => {
    const totalProducts = filteredItems.length
    const totalStock = filteredItems.reduce((sum, item) => sum + Number(item.realStock ?? 0), 0)
    const totalSafeStock = filteredItems.reduce((sum, item) => sum + Number(item.safeStock ?? 0), 0)
    const totalMonthlyOutbound = filteredItems.reduce((sum, item) => sum + Number(item.monthlyOutboundCount ?? 0), 0)

    return { totalProducts, totalStock, totalSafeStock, totalMonthlyOutbound }
  }, [filteredItems])

  const startEditing = (item) => {
    setEditingProductId(item.productId)
    setSafeStockInput(String(item.safeStock ?? 0))
  }

  const cancelEditing = () => {
    setEditingProductId(null)
    setSafeStockInput('')
  }

  const saveSafeStock = async (productId) => {
    try {
      setSavingSafeStock(true)
      await updateProductSafeStock(productId, companyId, { safeStock: Number(safeStockInput || 0) })
      cancelEditing()
      await loadInventoryPage()
    } catch (error) {
      console.error('Safe stock update error:', error)
      window.alert(error.response?.data?.message || '안전재고 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSavingSafeStock(false)
    }
  }

  return (
    <main
      className={`min-h-screen bg-slate-50 p-8 transition-all duration-300 ${
        isExpanded ? 'ml-72' : 'ml-20'
      }`}
    >
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">재고 관리</h1>
          <p className="mt-3 text-slate-500">현재 재고, 안전재고, 출고 현황을 한 화면에서 확인하고 안전재고 알림을 관리합니다.</p>
        </div>
      </div>

      <div className="mb-8 inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {INVENTORY_TABS.map((tab) => {
          const active = activeTab === tab.id

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`h-11 rounded-xl px-5 text-sm font-black transition-colors ${
                active
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {activeTab === 'operations' ? (
      <>
      <BrandFilterTabs
        brands={brands}
        items={items}
        selectedBrand={selectedBrand}
        onSelect={setSelectedBrand}
      />

      <div className="mb-8 grid grid-cols-1 gap-5 md:grid-cols-5">
        <SummaryCard label="등록 상품 수" value={formatNumber(summary.totalProducts)} />
        <SummaryCard label="현재 재고 합계" value={formatNumber(summary.totalStock)} />
        <SummaryCard label="안전재고 합계" value={formatNumber(summary.totalSafeStock)} />
        <SummaryCard label={`${selectedMonth} 월 출고량`} value={formatNumber(summary.totalMonthlyOutbound)} />
        <SummaryCard label="안전재고 알림" value={formatNumber(filteredAlerts.length)} />
      </div>

      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-8 py-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-900">재고 상세 및 안전재고 설정</h2>
          </div>
          <div className="rounded-full bg-emerald-50 px-4 py-2 text-sm font-bold text-emerald-700">
            {selectedMonth} 월 출고 요약
          </div>
        </div>

        {loading ? (
          <div className="px-8 py-16 text-center text-slate-500">재고 데이터를 불러오는 중입니다...</div>
        ) : filteredItems.length === 0 ? (
          <div className="px-8 py-16 text-center text-slate-500">선택한 조건에 해당하는 재고 데이터가 없습니다.</div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="min-w-[1280px] w-full table-fixed">
              <thead className="bg-slate-50">
                <tr>
                  <th className="w-[12%] px-3 py-4 text-center text-[11px] font-bold tracking-[0.14em] text-slate-400 sm:px-4 lg:px-6 lg:text-xs">브랜드</th>
                  <th className="w-[24%] px-3 py-4 text-center text-[11px] font-bold tracking-[0.14em] text-slate-400 sm:px-4 lg:px-6 lg:text-xs">상품명</th>
                  <th className="w-[14%] px-3 py-4 text-center text-[11px] font-bold tracking-[0.14em] text-slate-400 sm:px-4 lg:px-6 lg:text-xs">SKU</th>
                  <th className="w-[10%] px-3 py-4 text-center text-[11px] font-bold tracking-[0.14em] text-slate-400 sm:px-4 lg:px-6 lg:text-xs">상품번호</th>
                  <th className="w-[8%] px-3 py-4 text-center text-[11px] font-bold tracking-[0.14em] text-slate-400 sm:px-4 lg:px-6 lg:text-xs">현재 재고</th>
                  <th className="w-[16%] px-3 py-4 text-center text-[11px] font-bold tracking-[0.14em] text-slate-400 sm:px-4 lg:px-6 lg:text-xs">안전재고</th>
                  <th className="w-[10%] px-3 py-4 text-center text-[11px] font-bold tracking-[0.14em] text-slate-400 sm:px-4 lg:px-6 lg:text-xs">월 출고량</th>
                  <th className="w-[10%] px-3 py-4 text-center text-[11px] font-bold tracking-[0.14em] text-slate-400 sm:px-4 lg:px-6 lg:text-xs">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const lowStock = isLowStock(item)
                  const isEditing = editingProductId === item.productId

                  return (
                    <tr
                      key={item.productId}
                      className={`transition-colors hover:bg-slate-50/80 ${lowStock ? 'bg-amber-50/70' : ''}`}
                    >
                      <td className="px-3 py-4 text-center sm:px-4 lg:px-6">
                        <span className="inline-flex items-center justify-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 sm:px-3 sm:text-sm">
                          {item.brandName}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center text-xs font-semibold text-slate-900 sm:px-4 sm:text-sm lg:px-6">
                        <div className="line-clamp-2 break-keep">{item.productName}</div>
                      </td>
                      <td className="px-3 py-4 text-center font-mono text-[11px] text-slate-500 sm:px-4 sm:text-xs lg:px-6 lg:text-sm">
                        <div className="break-all">{item.skuCd || '-'}</div>
                      </td>
                      <td className="px-3 py-4 text-center font-mono text-[11px] text-slate-500 sm:px-4 sm:text-xs lg:px-6 lg:text-sm">
                        {item.prodNo ?? '-'}
                      </td>
                      <td className={`px-3 py-4 text-center text-sm font-black sm:px-4 sm:text-base lg:px-6 ${lowStock ? 'text-amber-700' : 'text-slate-900'}`}>
                        {formatNumber(item.realStock)}
                      </td>
                      <td className="px-3 py-4 text-center sm:px-4 lg:px-6">
                        {isEditing ? (
                          <div className="flex items-center justify-center gap-2">
                            <input
                              type="number"
                              min="0"
                              value={safeStockInput}
                              onChange={(e) => setSafeStockInput(e.target.value)}
                              className="w-24 rounded-xl border border-slate-200 px-3 py-2 text-center text-sm font-bold text-slate-900 outline-none focus:border-primary"
                            />
                            <button
                              type="button"
                              onClick={() => saveSafeStock(item.productId)}
                              disabled={savingSafeStock}
                              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              disabled={savingSafeStock}
                              className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <span className={`text-sm font-black sm:text-base ${lowStock ? 'text-amber-700' : 'text-slate-900'}`}>
                              {formatNumber(item.safeStock)}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditing(item)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                            >
                              안전재고 수정
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-4 text-center text-sm font-black text-slate-900 sm:px-4 sm:text-base lg:px-6">
                        {formatNumber(item.monthlyOutboundCount)}
                      </td>
                      <td className="px-3 py-4 text-center text-xs sm:px-4 sm:text-sm lg:px-6">
                        {lowStock ? (
                          <span className="inline-flex items-center justify-center rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-700">경고</span>
                        ) : (
                          <span className="text-slate-400">정상</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <FloatingAlertPanel alerts={filteredAlerts} />
      </>
      ) : (
        <div className={theme === 'dark' ? '' : 'app-light'}>
          <InventoryRiskPage />
        </div>
      )}
    </main>
  )
}
