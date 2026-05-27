import { useEffect, useMemo, useState } from 'react'
import ExecutiveHeader from './components/ExecutiveHeader'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import LoginPage from './pages/LoginPage'
import ProductCosts from './pages/ProductCosts'
import ProductInventory from './pages/ProductInventory'
import SalesStatus from './pages/SalesStatus'
import Settings from './pages/Settings'
import AccountSecurityPage from './pages/executive/AccountSecurityPage'
import AdPerformancePage from './pages/executive/AdPerformancePage'
import CashFlowPage from './pages/executive/CashFlowPage'
import ChannelCredentialPage from './pages/executive/ChannelCredentialPage'
import ChannelOperationsPage from './pages/executive/ChannelOperationsPage'
import ChannelSalesPage from './pages/executive/ChannelSalesPage'
import ConsultingRevenuePage from './pages/executive/ConsultingRevenuePage'
import CustomerDatabasePage from './pages/executive/CustomerDatabasePage'
import DebtPage from './pages/executive/DebtPage'
import EmployeeManagementPage from './pages/executive/EmployeeManagementPage'
import EmployeePerformancePage from './pages/executive/EmployeePerformancePage'
import ExecutiveSummary from './pages/executive/ExecutiveSummary'
import ExportPipelinePage from './pages/executive/ExportPipelinePage'
import InventoryRiskPage from './pages/executive/InventoryRiskPage'
import IssueBriefingPage from './pages/executive/IssueBriefingPage'
import MarketingAgentPage from './pages/executive/MarketingAgentPage'
import MarketingProjectBoardPage from './pages/executive/MarketingProjectBoardPage'
import MarketingStatusPage from './pages/executive/MarketingStatusPage'
import OperatingExpensesPage from './pages/executive/OperatingExpensesPage'
import PartnerManagementPage from './pages/executive/PartnerManagementPage'
import PaymentApprovalPage from './pages/executive/PaymentApprovalPage'
import PaymentRequestPage from './pages/executive/PaymentRequestPage'
import PlatformOverviewPage from './pages/executive/PlatformOverviewPage'
import ProductForecastPage from './pages/executive/ProductForecastPage'
import ProductMovementPage from './pages/executive/ProductMovementPage'
import ProductProfitPage from './pages/executive/ProductProfitPage'
import ProductionManagementPage from './pages/executive/ProductionManagementPage'
import ReceivablesPage from './pages/executive/ReceivablesPage'
import ResourceLibraryPage from './pages/executive/ResourceLibraryPage'
import WorkInputPage from './pages/executive/WorkInputPage'
import WorkManagementPage from './pages/executive/WorkManagementPage'
import { getAuthToken, getSession, logout } from './api/authApi'

const workerPages = {
  dashboard: Dashboard,
  sales: SalesStatus,
  'marketing-projects': MarketingProjectBoardPage,
  'marketing-status': MarketingStatusPage,
  'ad-performance': AdPerformancePage,
  'marketing-agent': MarketingAgentPage,
  'channel-operations': ChannelOperationsPage,
  'products-inventory': ProductInventory,
  'product-movement': ProductMovementPage,
  'product-forecast': ProductForecastPage,
  production: ProductionManagementPage,
  partners: PartnerManagementPage,
  'export-pipeline': ExportPipelinePage,
  'products-costs': ProductCosts,
  settings: Settings,
}

const executivePages = {
  platform: PlatformOverviewPage,
  account: AccountSecurityPage,
  summary: ExecutiveSummary,
  'cash-flow': CashFlowPage,
  'channel-credentials': ChannelCredentialPage,
  'customer-db': CustomerDatabasePage,
  'channel-operations': ChannelOperationsPage,
  'product-profit': ProductProfitPage,
  'product-movement': ProductMovementPage,
  production: ProductionManagementPage,
  'product-forecast': ProductForecastPage,
  'channel-sales': ChannelSalesPage,
  'consulting-revenue': ConsultingRevenuePage,
  receivables: ReceivablesPage,
  'resource-library': ResourceLibraryPage,
  'operating-expenses': OperatingExpensesPage,
  debts: DebtPage,
  employees: EmployeeManagementPage,
  'employee-performance': EmployeePerformancePage,
  'payment-request': PaymentRequestPage,
  'payment-approval': PaymentApprovalPage,
  'work-input': WorkInputPage,
  'work-management': WorkManagementPage,
  inventory: InventoryRiskPage,
  'issue-briefing': IssueBriefingPage,
  'export-pipeline': ExportPipelinePage,
  'marketing-status': MarketingStatusPage,
  'marketing-projects': MarketingProjectBoardPage,
  'marketing-agent': MarketingAgentPage,
  'ad-performance': AdPerformancePage,
  partners: PartnerManagementPage,
  settings: Settings,
}

const defaultPageByMode = {
  worker: 'sales',
  executive: 'summary',
}

const workerFramedPages = new Set([
  'marketing-projects',
  'marketing-status',
  'ad-performance',
  'marketing-agent',
  'channel-operations',
  'product-movement',
  'product-forecast',
  'production',
  'partners',
  'export-pipeline',
])

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
      } catch {
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

  useEffect(() => {
    const openDatePicker = (event) => {
      const target = event.target
      if (!(target instanceof HTMLInputElement) || target.type !== 'date' || target.disabled || target.readOnly) {
        return
      }

      target.focus({ preventScroll: true })
      if (event.type === 'pointerdown' && typeof target.showPicker === 'function') {
        try {
          target.showPicker()
        } catch {
          // Browser security rules can block programmatic picker opening.
        }
      }
    }

    document.addEventListener('pointerenter', openDatePicker, true)
    document.addEventListener('pointerdown', openDatePicker, true)

    return () => {
      document.removeEventListener('pointerenter', openDatePicker, true)
      document.removeEventListener('pointerdown', openDatePicker, true)
    }
  }, [])

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
    const userRole = session.role || 'EXECUTIVE'

    const executiveShellClass =
      theme === 'dark'
        ? 'min-h-screen bg-slate-950 text-slate-100 transition-colors duration-300'
        : 'app-light min-h-screen bg-slate-50 text-slate-900 transition-colors duration-300'
    const executiveMainClass =
      theme === 'dark'
        ? 'min-h-[calc(100vh-80px)] bg-slate-950 p-8'
        : 'min-h-[calc(100vh-80px)] bg-slate-50 p-8'

    return (
      <div className={executiveShellClass}>
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
          displayName={session.displayName}
          department={session.department}
          role={userRole}
          onLogout={handleLogout}
        />
        {page === 'settings' ? (
          <Settings isExpanded={isSidebarExpanded} />
        ) : (
          <div className={`transition-all duration-300 ${isSidebarExpanded ? 'ml-72' : 'ml-20'}`}>
            <ExecutiveHeader username={session.displayName || session.username} theme={theme} />
            <main className={executiveMainClass}>
              <ExecutivePage
                onNavigate={setPage}
                username={session.username}
                displayName={session.displayName}
                department={session.department}
                positionName={session.positionName}
                role={userRole}
                theme={theme}
              />
            </main>
          </div>
        )}
      </div>
    )
  }

  const WorkerPage = workerPages[page] || SalesStatus
  const isWorkerFramedPage = workerFramedPages.has(page)
  const workerFrameShellClass = isWorkerFramedPage
    ? theme === 'dark'
      ? 'bg-slate-950 text-slate-100'
      : 'app-light bg-slate-50 text-slate-900'
    : ''
  const workerFrameMainClass =
    theme === 'dark'
      ? 'min-h-screen bg-slate-950 p-8'
      : 'min-h-screen bg-slate-50 p-8'

  return (
    <div className={`min-h-screen transition-colors duration-300 ${workerFrameShellClass}`}>
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
        displayName={session.displayName}
        department={session.department}
        role={session.role}
        onLogout={handleLogout}
      />
      {isWorkerFramedPage ? (
        <div className={`transition-all duration-300 ${isSidebarExpanded ? 'ml-72' : 'ml-20'}`}>
          <main className={workerFrameMainClass}>
            <WorkerPage
              isExpanded={isSidebarExpanded}
              theme={theme}
              onNavigate={setPage}
              username={session.username}
              displayName={session.displayName}
              department={session.department}
              positionName={session.positionName}
              role={session.role}
            />
          </main>
        </div>
      ) : (
        <WorkerPage isExpanded={isSidebarExpanded} theme={theme} />
      )}
    </div>
  )
}
