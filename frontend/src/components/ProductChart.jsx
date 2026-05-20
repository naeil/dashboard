import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Filler,
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Filler)

const KW = (n) => '₩' + Math.round(Number(n ?? 0)).toLocaleString('ko-KR')

function themeValue(name, fallback) {
  if (typeof window === 'undefined') {
    return fallback
  }

  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback
}

export default function ProductChart({ data, loading }) {
  if (loading) return <div className="state-box"><div className="spinner" /></div>
  if (!data?.length) return <div className="state-box">데이터가 없습니다</div>

  const top8 = [...data].slice(0, 8)
  const chartText = themeValue('--chart-text', '#475569')
  const chartGrid = themeValue('--chart-grid', 'rgba(148, 163, 184, 0.16)')
  const tooltipBg = themeValue('--chart-tooltip-bg', '#ffffff')
  const tooltipBorder = themeValue('--chart-tooltip-border', '#cbd5e1')
  const tooltipTitle = themeValue('--chart-tooltip-title', '#0f172a')
  const tooltipBody = themeValue('--chart-tooltip-body', '#475569')
  const lineBorder = themeValue('--chart-line-border', '#0f4c81')
  const lineFill = themeValue('--chart-line-fill', 'rgba(14, 116, 144, 0.12)')
  const pointColor = themeValue('--chart-line-point', '#67e8f9')

  const chartData = {
    labels: top8.map((d) => d.productName.length > 14 ? d.productName.slice(0, 14) + '…' : d.productName),
    datasets: [
      {
        label: '순 매출',
        data: top8.map((d) => Math.round(Number(d.totalNetRevenue))),
        fill: true,
        borderColor: lineBorder,
        backgroundColor: lineFill,
        pointBackgroundColor: pointColor,
        pointBorderColor: lineBorder,
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.4,
        borderWidth: 2.5,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: (ctx) => ' ' + KW(ctx.parsed.y) },
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
        ticks: { font: { family: 'Inter', size: 10 }, color: chartText, maxRotation: 30 },
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

  return (
    <div className="chart-wrapper">
      <Line data={chartData} options={options} />
    </div>
  )
}
