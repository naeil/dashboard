import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

const KW = (n) => '₩' + Math.round(Number(n ?? 0)).toLocaleString('ko-KR')

function themeValue(name, fallback) {
  if (typeof window === 'undefined') {
    return fallback
  }

  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

export default function BrandChart({ data, loading }) {
  if (loading) return <div className="state-box"><div className="spinner" /></div>
  if (!data?.length) return <div className="state-box">데이터가 없습니다</div>

  const top10 = [...data].slice(0, 10)
  const chartText = themeValue('--chart-text', '#475569')
  const chartGrid = themeValue('--chart-grid', 'rgba(148, 163, 184, 0.16)')
  const tooltipBg = themeValue('--chart-tooltip-bg', '#ffffff')
  const tooltipBorder = themeValue('--chart-tooltip-border', '#cbd5e1')
  const tooltipTitle = themeValue('--chart-tooltip-title', '#0f172a')
  const tooltipBody = themeValue('--chart-tooltip-body', '#475569')
  const brandPrimary = themeValue('--chart-brand-primary', 'rgba(14, 116, 144, 0.82)')
  const brandPrimaryHover = themeValue('--chart-brand-primary-hover', '#0891b2')
  const brandSecondary = themeValue('--chart-brand-secondary', 'rgba(14, 165, 233, 0.28)')
  const brandSecondaryHover = themeValue('--chart-brand-secondary-hover', 'rgba(14, 165, 233, 0.48)')

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: {
          font: { family: 'Inter', size: 11 },
          color: chartText,
        },
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ' ' + KW(ctx.parsed.y),
        },
        backgroundColor: tooltipBg,
        titleColor: tooltipTitle,
        bodyColor: tooltipBody,
        borderColor: tooltipBorder,
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
    scales: {
      x: {
        grid: { color: chartGrid },
        ticks: { font: { family: 'Inter', size: 11 }, color: chartText },
      },
      y: {
        grid: { color: chartGrid },
        ticks: {
          font: { family: 'Inter', size: 11 },
          color: chartText,
          callback: (v) => '₩' + (v / 1_000_000).toFixed(0) + 'M',
        },
      },
    },
  }

  const chartData = {
    labels: top10.map((d) => d.brandName),
    datasets: [
      {
        label: '순 매출',
        data: top10.map((d) => Math.round(Number(d.totalNetRevenue))),
        backgroundColor: brandPrimary,
        hoverBackgroundColor: brandPrimaryHover,
        borderRadius: 6,
        borderSkipped: false,
      },
      {
        label: '총 매출',
        data: top10.map((d) => Math.round(Number(d.totalGrossAmount))),
        backgroundColor: brandSecondary,
        hoverBackgroundColor: brandSecondaryHover,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  }

  return (
    <div className="chart-wrapper">
      <Bar data={chartData} options={options} />
    </div>
  )
}
