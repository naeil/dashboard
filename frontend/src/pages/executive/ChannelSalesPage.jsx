import { useEffect, useMemo, useState } from 'react'
import {
  createExecutiveRecord,
  getExecutiveChannelSalesAnalytics,
  importPlayAutoChannelSales,
} from '../../api/executiveApi'
import { BarList, DataTable, KpiCard, PageHeader, Panel } from './ExecutiveComponents'
import RecordForm from './RecordForm'
import { count, pct, won } from './formatters'

const today = new Date()
const toDateInput = (date) => date.toISOString().slice(0, 10)
const defaultEndDate = toDateInput(today)
const defaultStartDate = toDateInput(new Date(today.getFullYear(), today.getMonth(), 1))
const numberValue = (value) => Number(value || 0)
const ALL = '전체'

const sourceOptions = [
  { value: 'MANUAL', label: '온라인 직접 입력' },
  { value: 'OFFLINE', label: '오프라인 매출' },
  { value: 'OVERSEAS', label: '해외 매출' },
  { value: 'B2B', label: 'B2B 납품' },
]

const channelOptions = [
  { value: '스마트스토어', label: '스마트스토어' },
  { value: '공식몰', label: '공식몰' },
  { value: '쿠팡', label: '쿠팡' },
  { value: '오프라인', label: '오프라인' },
  { value: '오프라인 도매', label: '오프라인 도매' },
  { value: '오프라인 매장', label: '오프라인 매장' },
  { value: '해외 수출', label: '해외 수출' },
  { value: '쇼피', label: '쇼피' },
  { value: '아마존', label: '아마존' },
  { value: 'B2B 납품', label: 'B2B 납품' },
]

function computeManualSalesValues(values) {
  const salesAmount = numberValue(values.sales_amount)
  const netProfit = numberValue(values.net_profit)
  const orderCount = numberValue(values.order_count)
  return {
    ...values,
    margin_rate: salesAmount > 0 && values.net_profit !== '' && values.net_profit != null
      ? Number(((netProfit / salesAmount) * 100).toFixed(2))
      : values.margin_rate || '',
    average_order_value: salesAmount > 0 && orderCount > 0
      ? Math.round(salesAmount / orderCount)
      : values.average_order_value || '',
  }
}

function sourceGroup(row) {
  const type = String(row.source_type || '').toUpperCase()
  const channel = String(row.channel_name || '')
  if (type === 'PLAYAUTO') return 'online'
  if (type === 'OFFLINE' || channel.includes('오프라인') || channel.includes('매장')) return 'offline'
  if (type === 'OVERSEAS' || channel.includes('해외') || channel.includes('수출') || channel.includes('쇼피') || channel.includes('아마존')) return 'overseas'
  if (type === 'B2B' || channel.includes('B2B') || channel.includes('납품')) return 'b2b'
  return 'online'
}

function SourceLabel({ value, channelName }) {
  const group = sourceGroup({ source_type: value, channel_name: channelName })
  const styles = {
    online: 'border-sky-400/30 bg-sky-400/15 text-sky-100',
    offline: 'border-amber-400/30 bg-amber-400/15 text-amber-100',
    overseas: 'border-violet-400/30 bg-violet-400/15 text-violet-100',
    b2b: 'border-emerald-400/30 bg-emerald-400/15 text-emerald-100',
  }
  const labels = {
    PLAYAUTO: 'PlayAuto',
    MANUAL: '온라인 직접',
    OFFLINE: '오프라인',
    OVERSEAS: '해외',
    B2B: 'B2B',
  }
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-black ${styles[group]}`}>
      {labels[String(value || '').toUpperCase()] || labels.MANUAL}
    </span>
  )
}

export default function ChannelSalesPage() {
  const [analytics, setAnalytics] = useState({ summary: {}, channels: [], products: [] })
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(defaultEndDate)
  const [selectedChannel, setSelectedChannel] = useState(ALL)
  const [selectedSource, setSelectedSource] = useState(ALL)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState('')

  const load = () => getExecutiveChannelSalesAnalytics({ startDate, endDate })
    .then((res) => setAnalytics(res.data || { summary: {}, channels: [], products: [] }))

  useEffect(() => {
    load()
  }, [])

  const channels = analytics.channels || []
  const products = analytics.products || []
  const summary = analytics.summary || {}

  const sourceSummary = useMemo(() => {
    const base = {
      online: { sales: 0, profit: 0, orders: 0 },
      offline: { sales: 0, profit: 0, orders: 0 },
      overseas: { sales: 0, profit: 0, orders: 0 },
      b2b: { sales: 0, profit: 0, orders: 0 },
    }
    channels.forEach((row) => {
      const group = sourceGroup(row)
      base[group].sales += numberValue(row.sales_amount)
      base[group].profit += numberValue(row.estimated_operating_profit)
      base[group].orders += numberValue(row.order_count)
    })
    return base
  }, [channels])

  const filteredChannels = useMemo(() => {
    if (selectedSource === ALL) return channels
    return channels.filter((row) => sourceGroup(row) === selectedSource)
  }, [channels, selectedSource])

  const channelSelectOptions = useMemo(() => (
    [ALL, ...Array.from(new Set(products.map((row) => row.channel_name).filter(Boolean)))]
  ), [products])

  const filteredProducts = useMemo(() => (
    selectedChannel === ALL
      ? products
      : products.filter((row) => row.channel_name === selectedChannel)
  ), [products, selectedChannel])

  const selectedProductSummary = useMemo(() => {
    const salesAmount = filteredProducts.reduce((sum, row) => sum + numberValue(row.sales_amount), 0)
    const orderCount = filteredProducts.reduce((sum, row) => sum + numberValue(row.order_count), 0)
    const estimatedOperatingProfit = filteredProducts.reduce((sum, row) => sum + numberValue(row.estimated_operating_profit), 0)
    return {
      salesAmount,
      orderCount,
      estimatedOperatingProfit,
      estimatedOperatingMargin: salesAmount > 0 ? (estimatedOperatingProfit / salesAmount) * 100 : 0,
    }
  }, [filteredProducts])

  const handleApplyPeriod = async (event) => {
    event.preventDefault()
    setSelectedChannel(ALL)
    setSelectedSource(ALL)
    await load()
  }

  const handleImport = async () => {
    setImporting(true)
    setMessage('')
    try {
      const response = await importPlayAutoChannelSales({ startDate, endDate })
      await load()
      const result = response.data || {}
      setMessage(`PlayAuto 채널 매출 ${count(result.upsertedCount || 0, '건')} 반영 완료`)
    } catch (error) {
      setMessage(error?.response?.data?.message || error.message || 'PlayAuto 채널 매출 반영에 실패했습니다.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <>
      <PageHeader
        title="채널별 실제 매출"
        description="온라인, 오프라인, 해외, B2B 매출을 한 화면에서 비교해 실제 채널별 매출과 이익 흐름을 확인합니다."
      />

      <div className="mb-6 rounded-lg border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/20">
        <form className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between" onSubmit={handleApplyPeriod}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_180px_auto]">
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-400">시작일</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-sky-400"
              />
            </label>
            <label>
              <span className="mb-1 block text-xs font-bold text-slate-400">종료일</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-sky-400"
              />
            </label>
            <button
              type="submit"
              className="h-10 rounded-lg bg-sky-400 px-4 text-sm font-black text-slate-950 transition-colors hover:bg-sky-300 sm:self-end"
            >
              기간 적용
            </button>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            {message && <span className="text-xs font-black text-sky-100">{message}</span>}
            <button
              type="button"
              onClick={handleImport}
              disabled={importing}
              className="h-10 rounded-lg border border-sky-400/30 bg-sky-400/10 px-4 text-sm font-black text-sky-100 transition-colors hover:bg-sky-400/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-slate-800 disabled:text-slate-500"
            >
              {importing ? '가져오는 중...' : 'PlayAuto 온라인 매출 갱신'}
            </button>
          </div>
        </form>
      </div>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="전체 실제 매출" value={won(summary.salesAmount)} tone="sky" icon="storefront" />
        <KpiCard label="온라인 매출" value={won(sourceSummary.online.sales)} tone="sky" icon="shopping_cart" />
        <KpiCard label="오프라인 매출" value={won(sourceSummary.offline.sales)} tone="amber" icon="store" />
        <KpiCard label="해외 매출" value={won(sourceSummary.overseas.sales)} tone="emerald" icon="public" />
        <KpiCard label="B2B 매출" value={won(sourceSummary.b2b.sales)} tone="emerald" icon="business_center" />
        <KpiCard label="추정 영업이익" value={won(summary.estimatedOperatingProfit)} tone={numberValue(summary.estimatedOperatingProfit) >= 0 ? 'emerald' : 'rose'} icon="payments" />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel
          title="채널별 매출 비중"
          right={(
            <select
              value={selectedSource}
              onChange={(event) => setSelectedSource(event.target.value)}
              className="h-9 rounded-lg border border-white/10 bg-slate-950 px-3 text-xs font-black text-white outline-none focus:border-sky-400"
            >
              <option value={ALL}>전체</option>
              <option value="online">온라인</option>
              <option value="offline">오프라인</option>
              <option value="overseas">해외</option>
              <option value="b2b">B2B</option>
            </select>
          )}
        >
          <BarList
            rows={filteredChannels}
            labelKey="channel_name"
            valueKey="sales_amount"
            meta={(row) => `주문 ${count(row.order_count, '건')} · 영업이익 ${won(row.estimated_operating_profit)}`}
          />
        </Panel>
        <Panel title="채널별 이익 상세">
          <DataTable
            rows={filteredChannels}
            rowKey={(row) => `${row.source_type}-${row.channel_name}`}
            columns={[
              { key: 'channel_name', label: '채널' },
              { key: 'source_type', label: '구분', render: (row) => <SourceLabel value={row.source_type} channelName={row.channel_name} /> },
              { key: 'sales_amount', label: '매출', render: (row) => won(row.sales_amount) },
              { key: 'order_count', label: '주문 수', render: (row) => count(row.order_count, '건') },
              { key: 'average_order_value', label: '객단가', render: (row) => won(row.average_order_value) },
              { key: 'ad_cost', label: '광고비', render: (row) => won(row.ad_cost) },
              { key: 'estimated_operating_profit', label: '추정 영업이익', render: (row) => won(row.estimated_operating_profit) },
              { key: 'estimated_operating_margin', label: '추정 이익률', render: (row) => pct(row.estimated_operating_margin) },
            ]}
          />
        </Panel>
      </section>

      <div className="mb-6 flex flex-col gap-3 rounded-lg border border-white/10 bg-slate-900/70 p-5 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">온라인 판매 제품 확인</h2>
          <p className="mt-1 text-xs font-bold text-slate-400">PlayAuto에서 들어온 온라인 판매 상품을 채널별로 확인합니다. 오프라인/해외 매출은 아래 직접 입력에서 채널 단위로 관리합니다.</p>
        </div>
        <label className="w-full xl:w-64">
          <span className="mb-1 block text-xs font-bold text-slate-400">온라인 채널 선택</span>
          <select
            value={selectedChannel}
            onChange={(event) => setSelectedChannel(event.target.value)}
            className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-sky-400"
          >
            {channelSelectOptions.map((channel) => (
              <option key={channel} value={channel}>{channel}</option>
            ))}
          </select>
        </label>
      </div>

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <KpiCard label="상품 기준 매출" value={won(selectedProductSummary.salesAmount)} tone="sky" icon="inventory_2" />
        <KpiCard label="상품 주문 수" value={count(selectedProductSummary.orderCount, '건')} tone="emerald" icon="sell" />
        <KpiCard label="상품 추정 영업이익" value={won(selectedProductSummary.estimatedOperatingProfit)} tone="emerald" icon="trending_up" />
        <KpiCard label="상품 추정 이익률" value={pct(selectedProductSummary.estimatedOperatingMargin)} tone="amber" icon="percent" />
      </section>

      <Panel
        title="온라인 상품별 판매 상세"
        right={<span className="text-xs font-black text-slate-400">{selectedChannel} / {filteredProducts.length}개 상품</span>}
      >
        <DataTable
          rows={filteredProducts}
          rowKey={(row) => `${row.channel_name}-${row.sku}`}
          columns={[
            { key: 'channel_name', label: '채널' },
            { key: 'brand_name', label: '브랜드' },
            { key: 'product_name', label: '상품명', render: (row) => <span className="font-black text-white">{row.product_name}</span> },
            { key: 'sku', label: 'SKU' },
            { key: 'sales_amount', label: '매출', render: (row) => won(row.sales_amount) },
            { key: 'order_count', label: '주문 수', render: (row) => count(row.order_count, '건') },
            { key: 'unit_cost', label: '단위 원가', render: (row) => won(row.unit_cost) },
            { key: 'estimated_cost', label: '추정 원가', render: (row) => won(row.estimated_cost) },
            { key: 'ad_cost', label: '광고비 10%', render: (row) => won(row.ad_cost) },
            { key: 'estimated_operating_profit', label: '추정 영업이익', render: (row) => won(row.estimated_operating_profit) },
            { key: 'estimated_operating_margin', label: '추정 이익률', render: (row) => pct(row.estimated_operating_margin) },
          ]}
        />
      </Panel>

      <div className="mt-6">
        <RecordForm
          title="오프라인 / 해외 / B2B 매출 직접 입력"
          fields={[
            { name: 'source_type', label: '매출 구분', type: 'select', required: true, options: sourceOptions },
            { name: 'channel_name', label: '채널명', type: 'select', required: true, options: channelOptions },
            { name: 'report_month', label: '기준일', type: 'date', required: true },
            { name: 'sales_amount', label: '실제 매출', type: 'number', required: true },
            { name: 'net_profit', label: '영업이익', type: 'number' },
            { name: 'margin_rate', label: '마진율 자동계산', type: 'number', readOnly: true },
            { name: 'order_count', label: '주문/거래 수', type: 'number' },
            { name: 'average_order_value', label: '객단가 자동계산', type: 'number', readOnly: true },
            { name: 'ad_cost', label: '광고비', type: 'number' },
            { name: 'roas', label: 'ROAS', type: 'number' },
          ]}
          initialValues={{
            source_type: 'OFFLINE',
            channel_name: '오프라인',
            report_month: defaultEndDate,
          }}
          computeValues={computeManualSalesValues}
          submitLabel="매출 반영"
          onSubmit={async (values) => {
            await createExecutiveRecord('channel-sales', values)
            await load()
          }}
        />
      </div>
    </>
  )
}
