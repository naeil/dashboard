import { useMemo, useState } from 'react'

const workerMenuItems = [
  { id: 'dashboard', icon: 'dashboard', label: '개요' },
  { id: 'sales', icon: 'leaderboard', label: '매출 현황' },
  { id: 'customers', icon: 'groups', label: '고객 관리', comingSoon: true },
  { id: 'marketing', icon: 'campaign', label: '마케팅', comingSoon: true },
  {
    id: 'products',
    icon: 'inventory_2',
    label: '상품 관리',
    children: [
      { id: 'products-inventory', label: '재고 관리' },
      { id: 'products-costs', label: '비용 관리' },
    ],
  },
]

const executiveMenuItems = [
  { id: 'summary', icon: 'dashboard', label: '경영 요약' },
  { id: 'cash-flow', icon: 'account_balance_wallet', label: '현금 흐름' },
  { id: 'product-profit', icon: 'inventory_2', label: '제품 손익' },
  { id: 'product-forecast', icon: 'trending_up', label: '제품별 예상 리스크' },
  { id: 'channel-sales', icon: 'leaderboard', label: '채널 매출' },
  { id: 'consulting-revenue', icon: 'business_center', label: '컨설팅 매출' },
  { id: 'receivables', icon: 'request_quote', label: '미수금 관리' },
  { id: 'operating-expenses', icon: 'receipt_long', label: '운영 비용' },
  { id: 'debts', icon: 'credit_score', label: '대출 / 부채' },
  { id: 'inventory', icon: 'warehouse', label: '재고 관리' },
  { id: 'export-pipeline', icon: 'public', label: '수출 파이프라인' },
  { id: 'marketing-status', icon: 'monitoring', label: '마케팅 현황' },
  { id: 'ad-performance', icon: 'campaign', label: '광고 성과' },
  { id: 'partners', icon: 'groups', label: '거래처 관리' },
]

const themeStyles = {
  light: {
    root: 'border-r border-slate-200 bg-white/84 text-slate-700 shadow-sm backdrop-blur',
    border: 'border-slate-200',
    title: 'text-sky-700',
    heading: 'text-slate-900',
    iconButton: 'text-slate-500 hover:bg-slate-200 hover:text-slate-900',
    active: 'border border-slate-200 bg-slate-100/95 text-slate-900 shadow-[6px_0_0_0_rgba(15,23,42,0.95)]',
    inactive: 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900',
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
  onLogout,
}) {
  const [openMenus, setOpenMenus] = useState({ products: true })
  const styles = themeStyles[theme] || themeStyles.light
  const menuItems = dashboardMode === 'executive' ? executiveMenuItems : workerMenuItems
  const title = dashboardMode === 'executive' ? '경영인 대시보드' : '실무자 대시보드'

  const productsActive = useMemo(
    () => activePage === 'products' || activePage === 'products-inventory' || activePage === 'products-costs',
    [activePage],
  )

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
            productsActive ? styles.active : styles.inactive
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
                  className={`block rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    childActive ? styles.active : styles.inactive
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
              onNavigate('settings')
            }}
            className={`flex items-center rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
              isExpanded ? 'flex-1' : 'justify-center'
            } ${activePage === 'settings' ? styles.active : styles.inactive}`}
          >
            <span className="material-symbols-outlined shrink-0">settings</span>
            <MenuLabel isExpanded={isExpanded} className={isExpanded ? 'ml-3' : ''}>
              설정
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
              {(username || 'A').slice(0, 1).toUpperCase()}
            </div>
            {isExpanded ? (
              <div className="min-w-0">
                <p className={`truncate text-xs font-black ${styles.heading}`}>{username || '관리자'}</p>
                <p className={`text-[11px] font-medium ${styles.helper}`}>추후 권한 기반 전환 예정</p>
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
