import { useEffect, useMemo, useState } from 'react'
import ExecutiveHeader from './components/ExecutiveHeader'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import LoginPage from './pages/LoginPage'
import ProductCosts from './pages/ProductCosts'
import ProductInventory from './pages/ProductInventory'
import SalesStatus from './pages/SalesStatus'
import Settings from './pages/Settings'
import AdPerformancePage from './pages/executive/AdPerformancePage'
import CashFlowPage from './pages/executive/CashFlowPage'
import ChannelSalesPage from './pages/executive/ChannelSalesPage'
import ConsultingRevenuePage from './pages/executive/ConsultingRevenuePage'
import DebtPage from './pages/executive/DebtPage'
import ExecutiveSummary from './pages/executive/ExecutiveSummary'
import ExportPipelinePage from './pages/executive/ExportPipelinePage'
import InventoryRiskPage from './pages/executive/InventoryRiskPage'
import MarketingStatusPage from './pages/executive/MarketingStatusPage'
import OperatingExpensesPage from './pages/executive/OperatingExpensesPage'
import PartnerManagementPage from './pages/executive/PartnerManagementPage'
import ProductForecastPage from './pages/executive/ProductForecastPage'
import ProductProfitPage from './pages/executive/ProductProfitPage'
import ReceivablesPage from './pages/executive/ReceivablesPage'
import { getAuthToken, getSession, logout } from './api/authApi'

const workerPages = {
  dashboard: Dashboard,
  sales: SalesStatus,
  'products-inventory': ProductInventory,
  'products-costs': ProductCosts,
  settings: Settings,
}

const executivePages = {
  summary: ExecutiveSummary,
  'cash-flow': CashFlowPage,
  'product-profit': ProductProfitPage,
  'product-forecast': ProductForecastPage,
  'channel-sales': ChannelSalesPage,
  'consulting-revenue': ConsultingRevenuePage,
  receivables: ReceivablesPage,
  'operating-expenses': OperatingExpensesPage,
  debts: DebtPage,
  inventory: InventoryRiskPage,
  'export-pipeline': ExportPipelinePage,
  'marketing-status': MarketingStatusPage,
  'ad-performance': AdPerformancePage,
  partners: PartnerManagementPage,
  settings: Settings,
}

const defaultPageByMode = {
  worker: 'sales',
  executive: 'summary',
}

const THEME_STORAGE_KEY = 'naeil-dashboard-theme'

function getStoredTheme() {
  if (typeof window === 'undefined') {
    return 'light'
  }

  return window.localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : 'light'
}

export default function App() {
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true)
  const [dashboardMode, setDashboardMode] = useState('worker')
  const [page, setPage] = useState(defaultPageByMode.worker)
  const [theme, setTheme] = useState(getStoredTheme)
  const [authLoading, setAuthLoading] = useState(true)
  const [session, setSession] = useState(null)

  useEffect(() => {
    const checkSession = async () => {
      const token = getAuthToken()
      if (!token) {
        setSession(null)
        setAuthLoading(false)
        return
      }

      try {
        const response = await getSession()
        setSession(response.authenticated ? response : null)
      } catch (error) {
        setSession(null)
      } finally {
        setAuthLoading(false)
      }
    }

    const handleUnauthorized = () => {
      setSession(null)
      setAuthLoading(false)
    }

    checkSession()
    window.addEventListener('auth:unauthorized', handleUnauthorized)

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized)
    }
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
    window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const availablePages = useMemo(
    () => (dashboardMode === 'executive' ? executivePages : workerPages),
    [dashboardMode],
  )

  useEffect(() => {
    if (!availablePages[page]) {
      setPage(defaultPageByMode[dashboardMode])
    }
  }, [availablePages, dashboardMode, page])

  const handleLogout = async () => {
    await logout()
    setSession(null)
  }

  const handleModeChange = (nextMode) => {
    if (nextMode === dashboardMode) {
      return
    }

    setDashboardMode(nextMode)
    setPage(defaultPageByMode[nextMode])
  }

  const handleThemeChange = (nextTheme) => {
    setTheme(nextTheme === 'dark' ? 'dark' : 'light')
  }

  const loadingClass =
    theme === 'dark'
      ? 'bg-slate-950 text-white'
      : 'bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_55%,#e7eef7_100%)] text-slate-900'

  if (authLoading) {
    return (
      <main className={`flex min-h-screen items-center justify-center transition-colors duration-300 ${loadingClass}`}>
        <div className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-sky-400">Naeil Dashboard</p>
          <p className="mt-4 text-2xl font-black">접속 상태를 확인하는 중입니다.</p>
        </div>
      </main>
    )
  }

  if (!session?.authenticated) {
    return <LoginPage onLogin={setSession} />
  }

  if (dashboardMode === 'executive') {
    const ExecutivePage = executivePages[page] || ExecutiveSummary

    return (
      <div className="min-h-screen transition-colors duration-300">
        <Sidebar
          dashboardMode={dashboardMode}
          isExpanded={isSidebarExpanded}
          onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)}
          activePage={page}
          onNavigate={setPage}
          onModeChange={handleModeChange}
          theme={theme}
          onThemeChange={handleThemeChange}
          username={session.username}
          onLogout={handleLogout}
        />
        {page === 'settings' ? (
          <Settings isExpanded={isSidebarExpanded} />
        ) : (
          <div className={`transition-all duration-300 ${isSidebarExpanded ? 'ml-72' : 'ml-20'}`}>
            <ExecutiveHeader username={session.username} theme={theme} />
            <main className="min-h-[calc(100vh-80px)] bg-transparent p-8">
              <ExecutivePage onNavigate={setPage} theme={theme} />
            </main>
          </div>
        )}
      </div>
    )
  }

  const WorkerPage = workerPages[page] || SalesStatus

  return (
    <div className="min-h-screen transition-colors duration-300">
      <Sidebar
        dashboardMode={dashboardMode}
        isExpanded={isSidebarExpanded}
        onToggle={() => setIsSidebarExpanded(!isSidebarExpanded)}
        activePage={page}
        onNavigate={setPage}
        onModeChange={handleModeChange}
        theme={theme}
        onThemeChange={handleThemeChange}
        username={session.username}
        onLogout={handleLogout}
      />
      <WorkerPage isExpanded={isSidebarExpanded} theme={theme} />
    </div>
  )
}
