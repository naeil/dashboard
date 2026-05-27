import { useMemo, useState } from 'react'

const workerMenuItems = [
  { id: 'dashboard', icon: 'dashboard', label: '개요' },
  { id: 'sales', icon: 'leaderboard', label: '매출 현황' },
  { id: 'customers', icon: 'groups', label: '고객 관리', comingSoon: true },
  {
    id: 'sales-ops',
    icon: 'storefront',
    label: '영업/운영',
    children: [
      { id: 'channel-operations', label: '채널 운영' },
      { id: 'partners', label: '거래처 관리' },
      { id: 'export-pipeline', label: '수출 파이프라인' },
    ],
  },
  {
    id: 'marketing',
    icon: 'campaign',
    label: '마케팅',
    children: [
      { id: 'marketing-projects', label: '마케팅 프로젝트' },
      { id: 'marketing-status', label: '마케팅 현황' },
      { id: 'ad-performance', label: '광고 성과' },
      { id: 'marketing-agent', label: '마케팅 에이전트' },
    ],
  },
  {
    id: 'products',
    icon: 'inventory_2',
    label: '상품 관리',
    children: [
      { id: 'products-inventory', label: '재고 관리' },
      { id: 'product-movement', label: '제품 출입고' },
      { id: 'product-forecast', label: '제품별 예상 리스트' },
      { id: 'production', label: '생산 관리' },
      { id: 'products-costs', label: '비용 관리' },
    ],
  },
]

const executiveMenuItems = [
  {
    id: 'executive-common',
    icon: 'apps',
    label: '공통 업무',
    children: [
      { id: 'platform', label: '업무 홈', roles: ['EXECUTIVE', 'MANAGER', 'EMPLOYEE'] },
      { id: 'issue-briefing', label: '실시간 이슈 브리핑', roles: ['EXECUTIVE', 'MANAGER', 'EMPLOYEE'] },
      { id: 'channel-sales', label: '채널별 실제 매출', roles: ['EXECUTIVE', 'MANAGER', 'EMPLOYEE'] },
      { id: 'work-input', label: '내 업무 입력', roles: ['EXECUTIVE', 'MANAGER', 'EMPLOYEE'] },
      { id: 'payment-request', label: '입출금 요청', roles: ['EXECUTIVE', 'MANAGER', 'EMPLOYEE'] },
      { id: 'resource-library', label: '자료실', roles: ['EXECUTIVE', 'MANAGER', 'EMPLOYEE'] },
    ],
  },
  {
    id: 'executive-finance',
    icon: 'account_balance_wallet',
    label: '재무/손익',
    children: [
      { id: 'summary', label: '경영 요약', roles: ['EXECUTIVE'] },
      { id: 'cash-flow', label: '현금 흐름', roles: ['EXECUTIVE'] },
      { id: 'product-profit', label: '제품 손익', roles: ['EXECUTIVE', 'MANAGER', 'EMPLOYEE'] },
      { id: 'consulting-revenue', label: '컨설팅 매출', roles: ['EXECUTIVE', 'MANAGER', 'EMPLOYEE'] },
      { id: 'receivables', label: '미수금 관리', roles: ['EXECUTIVE', 'MANAGER'] },
      { id: 'operating-expenses', label: '운영 비용', roles: ['EXECUTIVE'] },
      { id: 'debts', label: '대출/부채', roles: ['EXECUTIVE'] },
    ],
  },
  {
    id: 'executive-admin',
    icon: 'manage_accounts',
    label: '관리자 운영',
    children: [
      { id: 'work-management', label: '업무 진행 관리', roles: ['EXECUTIVE', 'MANAGER'] },
      { id: 'payment-approval', label: '입출금 결재 관리', roles: ['EXECUTIVE', 'MANAGER'] },
      { id: 'channel-credentials', label: '채널 계정 관리', roles: ['EXECUTIVE', 'MANAGER'] },
      { id: 'customer-db', label: '고객 정보 DB', roles: ['EXECUTIVE', 'MANAGER'] },
      { id: 'employees', label: '직원 관리', roles: ['EXECUTIVE'] },
      { id: 'employee-performance', label: '직원 성과 분석', roles: ['EXECUTIVE'] },
    ],
  },
]

const roleLabels = {
  EXECUTIVE: '대표/임원',
  MANAGER: '관리자',
  EMPLOYEE: '직원',
}

const themeStyles = {
  light: {
    root: 'border-r border-slate-200 bg-white/84 text-slate-700 shadow-sm backdrop-blur',
    border: 'border-slate-200',
    title: 'text-sky-700',
    heading: 'text-slate-900',
    iconButton: 'text-slate-500 hover:bg-slate-200 hover:text-slate-900',
    active: 'border border-slate-200 bg-slate-100/95 text-slate-900 shadow-[6px_0_0_0_rgba(15,23,42,0.95)]',
    inactive: 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900',
    childActive: 'bg-white text-slate-950 ring-1 ring-slate-200 shadow-sm',
    childInactive: 'text-slate-600 hover:bg-white/80 hover:text-slate-950',
    disabled: 'cursor-default text-slate-400',
    nestedBorder: 'border-slate-300/70',
    chip: 'bg-slate-200 text-slate-500',
    userCard: 'bg-white/72',
    userAvatar: 'bg-slate-900 text-white',
    helper: 'text-slate-500',
    logout: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    themeShell: 'border border-slate-200 bg-slate-100/90',
    themeButton: 'text-slate-500 hover:bg-slate-200/80 hover:text-slate-900',
    themeButtonActive: 'bg-white text-sky-700 shadow-[0_2px_10px_rgba(15,23,42,0.12)] ring-1 ring-slate-200',
    themeIconBase: 'bg-slate-200/80 text-slate-500',
    themeIconActive: 'bg-sky-100 text-sky-700',
  },
  dark: {
    root: 'border-r border-white/10 bg-slate-950/95 text-slate-300 backdrop-blur',
    border: 'border-white/10',
    title: 'text-sky-300',
    heading: 'text-white',
    iconButton: 'text-slate-400 hover:bg-white/10 hover:text-white',
    active: 'bg-sky-400 text-slate-950 shadow-lg shadow-sky-950/30',
    inactive: 'text-slate-400 hover:bg-white/10 hover:text-white',
    childActive: 'bg-white/10 text-white ring-1 ring-white/10',
    childInactive: 'text-slate-400 hover:bg-white/10 hover:text-white',
    disabled: 'cursor-default text-slate-600',
    nestedBorder: 'border-white/10',
    chip: 'bg-white/10 text-slate-400',
    userCard: 'bg-white/[0.04]',
    userAvatar: 'bg-sky-400 text-slate-950',
    helper: 'text-slate-500',
    logout: 'text-slate-400 hover:bg-white/10 hover:text-white',
    themeShell: 'border border-white/10 bg-slate-900/90',
    themeButton: 'text-slate-400 hover:bg-white/10 hover:text-white',
    themeButtonActive: 'bg-slate-700 text-sky-200 shadow-[0_2px_10px_rgba(2,6,23,0.4)] ring-1 ring-white/10',
    themeIconBase: 'bg-slate-800 text-slate-400',
    themeIconActive: 'bg-slate-600 text-sky-300',
  },
}

function MenuLabel({ isExpanded, children, className = '' }) {
  return (
    <span
      className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
        isExpanded ? 'w-auto opacity-100' : 'w-0 opacity-0'
      } ${className}`}
    >
      {children}
    </span>
  )
}

function ModeSwitch({ dashboardMode, isExpanded, onModeChange, styles }) {
  const options = [
    { id: 'worker', label: '실무자' },
    { id: 'executive', label: '경영인' },
  ]

  return (
    <div className={`grid gap-2 ${isExpanded ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {options.map((option) => {
        const isActive = dashboardMode === option.id

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onModeChange(option.id)}
            className={`rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
              isActive ? styles.active : styles.inactive
            }`}
          >
            {isExpanded ? option.label : option.label.slice(0, 1)}
          </button>
        )
      })}
    </div>
  )
}

function ThemeSwitch({ theme, isExpanded, onThemeChange, styles }) {
  const options = [
    { id: 'light', icon: 'light_mode', label: 'Light mode' },
    { id: 'dark', icon: 'dark_mode', label: 'Dark mode' },
  ]

  const shellClass = isExpanded
    ? `inline-flex items-center gap-1 rounded-full p-1 ${styles.themeShell}`
    : `flex w-12 flex-col items-center gap-1 rounded-[1.5rem] p-1 ${styles.themeShell}`

  const buttonClass = isExpanded ? 'h-10 w-10' : 'h-9 w-9'
  const iconClass = isExpanded ? 'h-8 w-8' : 'h-7 w-7'

  return (
    <div className={shellClass}>
      {options.map((option) => {
        const isActive = theme === option.id

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onThemeChange(option.id)}
            aria-label={option.label}
            title={option.label}
            className={`inline-flex items-center justify-center rounded-full transition-all ${buttonClass} ${
              isActive ? styles.themeButtonActive : styles.themeButton
            }`}
          >
            <span
              className={`flex items-center justify-center rounded-full transition-colors ${iconClass} ${
                isActive ? styles.themeIconActive : styles.themeIconBase
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">{option.icon}</span>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function canSeeItem(item, role) {
  return !item.roles || item.roles.includes(role || 'EXECUTIVE')
}

function filterMenuItems(items, role) {
  return items
    .map((item) => {
      if (!item.children) {
        return canSeeItem(item, role) ? item : null
      }
      const children = item.children.filter((child) => canSeeItem(child, role))
      return children.length > 0 ? { ...item, children } : null
    })
    .filter(Boolean)
}

export default function Sidebar({
  dashboardMode,
  isExpanded,
  onToggle,
  activePage,
  onNavigate,
  onModeChange,
  theme = 'light',
  onThemeChange,
  username,
  displayName,
  department,
  role = 'EXECUTIVE',
  onLogout,
}) {
  const [openMenus, setOpenMenus] = useState({
    'sales-ops': true,
    marketing: true,
    products: true,
    'executive-common': true,
    'executive-finance': true,
  })
  const styles = themeStyles[theme] || themeStyles.light
  const menuItems = dashboardMode === 'executive'
    ? filterMenuItems(executiveMenuItems, role)
    : workerMenuItems
  const title = dashboardMode === 'executive' ? '경영인 대시보드' : '실무자 대시보드'

  const activeParents = useMemo(() => {
    const set = new Set()
    menuItems.forEach((item) => {
      if (item.children?.some((child) => child.id === activePage)) {
        set.add(item.id)
      }
    })
    return set
  }, [activePage, menuItems])

  const renderMenuItem = (item) => {
    if (!item.children) {
      const isActive = activePage === item.id
      const isDisabled = Boolean(item.comingSoon)
      const itemClass = isDisabled ? styles.disabled : isActive ? styles.active : styles.inactive

      return (
        <a
          key={item.id}
          href="#"
          onClick={(event) => {
            event.preventDefault()
            if (isDisabled) return
            onNavigate(item.id)
          }}
          className={`flex items-center rounded-xl px-4 py-3 text-sm font-bold transition-colors ${itemClass}`}
        >
          <span className="material-symbols-outlined shrink-0 text-xl">{item.icon}</span>
          <div className={`flex min-w-0 flex-1 items-center ${isExpanded ? 'ml-3 justify-between gap-2' : 'ml-0'}`}>
            <MenuLabel isExpanded={isExpanded}>{item.label}</MenuLabel>
            {isDisabled && isExpanded ? (
              <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${styles.chip}`}>준비중</span>
            ) : null}
          </div>
        </a>
      )
    }

    const isParentActive = activeParents.has(item.id)

    return (
      <div key={item.id} className="space-y-1">
        <button
          type="button"
          onClick={() => {
            if (!isExpanded) {
              onToggle()
              return
            }
            setOpenMenus((prev) => ({ ...prev, [item.id]: !prev[item.id] }))
          }}
          className={`flex w-full items-center rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
            isParentActive ? styles.active : styles.inactive
          }`}
        >
          <span className="material-symbols-outlined shrink-0 text-xl">{item.icon}</span>
          <MenuLabel isExpanded={isExpanded} className="ml-3 flex-1 text-left">
            {item.label}
          </MenuLabel>
          {isExpanded ? (
            <span className="material-symbols-outlined text-base">{openMenus[item.id] ? 'expand_less' : 'expand_more'}</span>
          ) : null}
        </button>

        {isExpanded && openMenus[item.id] ? (
          <div className={`ml-6 space-y-1 border-l pl-3 ${styles.nestedBorder}`}>
            {item.children.map((child) => {
              const childActive = activePage === child.id

              return (
                <a
                  key={child.id}
                  href="#"
                  onClick={(event) => {
                    event.preventDefault()
                    onNavigate(child.id)
                  }}
                  className={`block rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                    childActive ? styles.childActive : styles.childInactive
                  }`}
                >
                  {child.label}
                </a>
              )
            })}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-50 flex h-full flex-col transition-all duration-300 ${
        isExpanded ? 'w-72' : 'w-20'
      } ${styles.root}`}
    >
      <div className={`border-b p-5 ${styles.border}`}>
        <div className={`flex items-center ${isExpanded ? 'justify-between' : 'justify-center'}`}>
          <div className={`${isExpanded ? 'block' : 'hidden'} min-w-0`}>
            <p className={`text-xs font-black uppercase tracking-[0.22em] ${styles.title}`}>NAEIL GROUP</p>
            <h1 className={`mt-1 truncate text-lg font-black ${styles.heading}`}>{title}</h1>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className={`rounded-lg p-2 transition-colors ${styles.iconButton}`}
            aria-label={isExpanded ? '사이드바 접기' : '사이드바 펼치기'}
          >
            <span className="material-symbols-outlined">{isExpanded ? 'menu_open' : 'menu'}</span>
          </button>
        </div>

        <div className={`mt-4 ${isExpanded ? 'block' : 'flex justify-center'}`}>
          <ModeSwitch
            dashboardMode={dashboardMode}
            isExpanded={isExpanded}
            onModeChange={onModeChange}
            styles={styles}
          />
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">{menuItems.map(renderMenuItem)}</nav>

      <div className={`border-t p-4 ${styles.border}`}>
        <div className={`mb-3 flex items-center ${isExpanded ? 'gap-2' : 'flex-col gap-2'}`}>
          <a
            href="#"
            onClick={(event) => {
              event.preventDefault()
              onNavigate(dashboardMode === 'executive' ? 'account' : 'settings')
            }}
            className={`flex items-center rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
              isExpanded ? 'flex-1' : 'justify-center'
            } ${(dashboardMode === 'executive' ? activePage === 'account' : activePage === 'settings') ? styles.active : styles.inactive}`}
          >
            <span className="material-symbols-outlined shrink-0">
              {dashboardMode === 'executive' ? 'account_circle' : 'settings'}
            </span>
            <MenuLabel isExpanded={isExpanded} className={isExpanded ? 'ml-3' : ''}>
              {dashboardMode === 'executive' ? '내 계정' : '설정'}
            </MenuLabel>
          </a>

          <ThemeSwitch
            theme={theme}
            isExpanded={isExpanded}
            onThemeChange={onThemeChange}
            styles={styles}
          />
        </div>

        <div className={`flex rounded-xl p-3 ${isExpanded ? 'items-center justify-between gap-3' : 'justify-center'} ${styles.userCard}`}>
          <div className="flex min-w-0 items-center gap-3">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${styles.userAvatar}`}>
              {(displayName || username || 'A').slice(0, 1).toUpperCase()}
            </div>
            {isExpanded ? (
              <div className="min-w-0">
                <p className={`truncate text-xs font-black ${styles.heading}`}>{displayName || username || '관리자'}</p>
                <p className={`truncate text-[11px] font-medium ${styles.helper}`}>
                  {department ? `${department} · ${roleLabels[role] || role}` : roleLabels[role] || '권한 확인 중'}
                </p>
              </div>
            ) : null}
          </div>
          {isExpanded ? (
            <button
              type="button"
              onClick={onLogout}
              className={`rounded-lg px-3 py-2 text-xs font-black transition-colors ${styles.logout}`}
            >
              로그아웃
            </button>
          ) : null}
        </div>
      </div>
    </aside>
  )
}
