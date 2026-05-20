import { useEffect, useMemo, useState } from 'react'
import { buildApiUrl } from '../api/apiBase'
import { authorizedFetch } from '../api/authApi'
import { formatDateTimeKst, formatTimeKst, parseApiDateTime } from '../utils/dateTime'

const SETTINGS_API_BASE = buildApiUrl('/settings/integrations')
const MARKETING_SETTINGS_API_BASE = buildApiUrl('/settings/integrations/marketing')

const UNIT_OPTIONS = [
  { value: 'DAY', label: '일' },
  { value: 'WEEK', label: '주' },
  { value: 'MONTH', label: '월' },
]

const OPEN_MARKET_OPTIONS = [
  { value: 'NAVER_SMARTSTORE', label: '네이버 스마트스토어' },
  { value: 'COUPANG', label: '쿠팡' },
  { value: 'ELEVEN_STREET', label: '11번가' },
  { value: 'AUCTION', label: '옥션' },
  { value: 'GMARKET', label: 'G마켓' },
]

const MARKETING_INTEGRATIONS = [
  {
    type: 'NAVER_SEARCH_API',
    title: '네이버 검색 API',
    description: '키워드 트렌드와 검색량 조회에 사용하는 인증 정보입니다.',
    fields: [
      { key: 'apiKey', label: 'Client ID', type: 'text', placeholder: '네이버 Client ID' },
      { key: 'password', label: 'Client Secret', type: 'password', placeholder: '네이버 Client Secret' },
    ],
  },
  {
    type: 'NAVER_SEARCH_ADS',
    title: '네이버 검색광고 API',
    description: 'CPC 광고 성과 조회에 사용하는 인증 정보입니다.',
    fields: [
      { key: 'apiKey', label: 'Customer ID', type: 'text', placeholder: '검색광고 Customer ID' },
      { key: 'email', label: 'Access License', type: 'text', placeholder: '검색광고 Access License' },
      { key: 'password', label: 'Secret Key', type: 'password', placeholder: '검색광고 Secret Key' },
    ],
  },
  {
    type: 'META_ADS',
    title: 'Meta Ads API',
    description: 'Meta 광고 계정 연동에 사용하는 인증 정보입니다.',
    fields: [
      { key: 'apiKey', label: 'Ad Account ID', type: 'text', placeholder: 'act_1234567890 형태의 계정 ID' },
      { key: 'password', label: 'Access Token', type: 'password', placeholder: 'Meta Access Token' },
    ],
  },
]

const HISTORY_STATUS_STYLES = {
  RUNNING: 'bg-sky-100 text-sky-700',
  SUCCESS: 'bg-emerald-100 text-emerald-700',
  FAILED: 'bg-rose-100 text-rose-700',
}

const HISTORY_STATUS_LABELS = {
  RUNNING: '실행 중',
  SUCCESS: '성공',
  FAILED: '실패',
}

const JOB_TYPE_LABELS = {
  ORDER: '주문 수집',
  INVENTORY: '재고 수집',
}

const VIEW_TABS = [
  { key: 'auth', label: '인증 정보' },
  { key: 'collection', label: '수집 설정' },
  { key: 'shops', label: '오픈마켓 등록 현황' },
]

const UNIT_LABEL_MAP = {
  DAY: '일',
  WEEK: '주',
  MONTH: '월',
}

function cx(...classes) {
  return classes.filter(Boolean).join(' ')
}

function SectionCard({ title, description, action, children }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-950 dark:text-slate-50">{title}</h2>
          {description ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function InputField({ label, type = 'text', value, placeholder, onChange }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
      />
    </label>
  )
}

function SelectField({ label, value, onChange, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-slate-600">{label}</span>
      <select
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200"
      >
        {children}
      </select>
    </label>
  )
}

function saveBadge(isReady, readyText = '저장됨', emptyText = '미설정') {
  return (
    <span
      className={cx(
        'rounded-full px-3 py-1 text-xs font-bold',
        isReady ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500',
      )}
    >
      {isReady ? readyText : emptyText}
    </span>
  )
}

function emptyMarketingForms() {
  return {
    NAVER_SEARCH_API: { apiKey: '', email: '', password: '' },
    NAVER_SEARCH_ADS: { apiKey: '', email: '', password: '' },
    META_ADS: { apiKey: '', email: '', password: '' },
  }
}

function getSettingTimeLabel(setting, key) {
  const value = setting?.[key]
  if (!value) return '-'
  return formatDateTimeKst(parseApiDateTime(value))
}

export default function Settings({ isExpanded }) {
  const [activeView, setActiveView] = useState('auth')
  const [toast, setToast] = useState(null)
  const [savingAuth, setSavingAuth] = useState(false)
  const [savingCollection, setSavingCollection] = useState(false)
  const [runningCollection, setRunningCollection] = useState(false)
  const [syncingShops, setSyncingShops] = useState(false)
  const [savingMarketingType, setSavingMarketingType] = useState(null)

  const [playAuto, setPlayAuto] = useState({ apiKey: '', email: '', password: '' })
  const [openMarket, setOpenMarket] = useState({ integrationType: 'NAVER_SMARTSTORE', apiKey: '' })
  const [collection, setCollection] = useState({
    collectionValue: '30',
    collectionUnit: 'DAY',
    scheduleValue: '1',
    scheduleUnit: 'DAY',
    autoCollectEnabled: true,
  })
  const [marketingForms, setMarketingForms] = useState(emptyMarketingForms)
  const [settingsByType, setSettingsByType] = useState({})
  const [history, setHistory] = useState([])
  const [registeredShops, setRegisteredShops] = useState([])

  const playAutoReady = useMemo(
    () => Boolean(playAuto.apiKey && playAuto.email && playAuto.password),
    [playAuto],
  )

  const openMarketReady = useMemo(
    () => Boolean(openMarket.integrationType && openMarket.apiKey),
    [openMarket],
  )

  const marketingReadyCount = useMemo(
    () =>
      MARKETING_INTEGRATIONS.filter((integration) => {
        const form = marketingForms[integration.type]
        return Boolean(form?.apiKey || form?.email || form?.password)
      }).length,
    [marketingForms],
  )

  const collectionReady = useMemo(
    () =>
      Number(collection.collectionValue) > 0 &&
      (!collection.autoCollectEnabled || Number(collection.scheduleValue) > 0),
    [collection],
  )

  const runningHistory = useMemo(
    () => history.find((item) => item.jobType === 'ORDER' && item.status === 'RUNNING'),
    [history],
  )

  const isOrderCollectionBusy = Boolean(runningCollection || runningHistory)
  const connectedAuthCount = Number(playAutoReady) + Number(openMarketReady) + marketingReadyCount

  const playAutoSetting = settingsByType.PLAYAUTO
  const selectedOpenMarketSetting = settingsByType[openMarket.integrationType]

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
  }

  const hydrateForms = (settings) => {
    const nextSettingsByType = {}
    settings.forEach((item) => {
      nextSettingsByType[item.integrationType] = item
    })
    setSettingsByType(nextSettingsByType)

    const playAutoSettingValue = nextSettingsByType.PLAYAUTO
    if (playAutoSettingValue) {
      setPlayAuto({
        apiKey: playAutoSettingValue.apiKey || '',
        email: playAutoSettingValue.email || '',
        password: playAutoSettingValue.password || '',
      })
      setCollection({
        collectionValue:
          playAutoSettingValue.collectionValue != null ? String(playAutoSettingValue.collectionValue) : '30',
        collectionUnit: playAutoSettingValue.collectionUnit || 'DAY',
        scheduleValue:
          playAutoSettingValue.scheduleValue != null ? String(playAutoSettingValue.scheduleValue) : '1',
        scheduleUnit: playAutoSettingValue.scheduleUnit || 'DAY',
        autoCollectEnabled: Boolean(playAutoSettingValue.autoCollectEnabled),
      })
    }

    const openMarketSetting = settings.find((item) =>
      OPEN_MARKET_OPTIONS.some((option) => option.value === item.integrationType),
    )
    if (openMarketSetting) {
      setOpenMarket({
        integrationType: openMarketSetting.integrationType || 'NAVER_SMARTSTORE',
        apiKey: openMarketSetting.apiKey || '',
      })
    }

    setMarketingForms({
      NAVER_SEARCH_API: {
        apiKey: nextSettingsByType.NAVER_SEARCH_API?.apiKey || '',
        email: nextSettingsByType.NAVER_SEARCH_API?.email || '',
        password: nextSettingsByType.NAVER_SEARCH_API?.password || '',
      },
      NAVER_SEARCH_ADS: {
        apiKey: nextSettingsByType.NAVER_SEARCH_ADS?.apiKey || '',
        email: nextSettingsByType.NAVER_SEARCH_ADS?.email || '',
        password: nextSettingsByType.NAVER_SEARCH_ADS?.password || '',
      },
      META_ADS: {
        apiKey: nextSettingsByType.META_ADS?.apiKey || '',
        email: nextSettingsByType.META_ADS?.email || '',
        password: nextSettingsByType.META_ADS?.password || '',
      },
    })
  }

  const loadPageData = async () => {
    try {
      const [settingsResponse, marketingResponse, historyResponse, shopsResponse] = await Promise.all([
        authorizedFetch(SETTINGS_API_BASE),
        authorizedFetch(MARKETING_SETTINGS_API_BASE),
        authorizedFetch(`${SETTINGS_API_BASE}/history?integrationType=PLAYAUTO&limit=10`),
        authorizedFetch(`${SETTINGS_API_BASE}/shops`),
      ])

      if (!settingsResponse.ok) {
        throw new Error('설정 정보를 불러오지 못했습니다.')
      }
      if (!marketingResponse.ok) {
        throw new Error('Marketing credentials could not be loaded.')
      }
      if (!historyResponse.ok) {
        throw new Error('실행 이력을 불러오지 못했습니다.')
      }
      if (!shopsResponse.ok) {
        throw new Error('오픈마켓 등록 현황을 불러오지 못했습니다.')
      }

      const settings = await settingsResponse.json()
      const marketingSettings = await marketingResponse.json()
      hydrateForms([...settings, ...marketingSettings])
      setHistory(await historyResponse.json())
      setRegisteredShops(await shopsResponse.json())
    } catch (error) {
      showToast(error.message || '설정 정보를 불러오는 중 오류가 발생했습니다.', 'error')
    }
  }

  useEffect(() => {
    loadPageData()
  }, [])

  useEffect(() => {
    if (!toast) return undefined
    const timeoutId = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timeoutId)
  }, [toast])

  const saveAuth = async () => {
    setSavingAuth(true)
    try {
      const requests = []

      if (playAuto.apiKey || playAuto.email || playAuto.password) {
        requests.push(
          authorizedFetch(`${SETTINGS_API_BASE}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              integrationType: 'PLAYAUTO',
              apiKey: playAuto.apiKey,
              email: playAuto.email,
              password: playAuto.password,
            }),
          }),
        )
      }

      if (openMarket.integrationType && openMarket.apiKey) {
        requests.push(
          authorizedFetch(`${SETTINGS_API_BASE}/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              integrationType: openMarket.integrationType,
              apiKey: openMarket.apiKey,
            }),
          }),
        )
      }

      if (requests.length === 0) {
        throw new Error('저장할 인증 정보를 먼저 입력해주세요.')
      }

      const responses = await Promise.all(requests)
      for (const response of responses) {
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}))
          throw new Error(errorBody.message || '인증 정보 저장에 실패했습니다.')
        }
      }

      await loadPageData()
      showToast('인증 정보를 저장했습니다.')
    } catch (error) {
      showToast(error.message || '인증 정보 저장에 실패했습니다.', 'error')
    } finally {
      setSavingAuth(false)
    }
  }

  const saveCollection = async () => {
    setSavingCollection(true)
    try {
      const response = await authorizedFetch(`${SETTINGS_API_BASE}/collection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionUnit: collection.collectionUnit,
          collectionValue: Number(collection.collectionValue),
          scheduleUnit: collection.scheduleUnit,
          scheduleValue: Number(collection.scheduleValue),
          autoCollectEnabled: collection.autoCollectEnabled,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.message || '수집 설정 저장에 실패했습니다.')
      }

      await loadPageData()
      showToast('수집 설정을 저장했습니다.')
    } catch (error) {
      showToast(error.message || '수집 설정 저장에 실패했습니다.', 'error')
    } finally {
      setSavingCollection(false)
    }
  }

  const runOrderCollection = async () => {
    setRunningCollection(true)
    try {
      const response = await authorizedFetch(`${SETTINGS_API_BASE}/collection/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionUnit: collection.collectionUnit,
          collectionValue: Number(collection.collectionValue),
          scheduleUnit: collection.scheduleUnit,
          scheduleValue: Number(collection.scheduleValue),
          autoCollectEnabled: collection.autoCollectEnabled,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.message || '주문 수집 실행에 실패했습니다.')
      }

      await loadPageData()
      showToast('주문 수집을 실행했습니다.')
    } catch (error) {
      showToast(error.message || '주문 수집 실행에 실패했습니다.', 'error')
    } finally {
      setRunningCollection(false)
    }
  }

  const syncShops = async () => {
    setSyncingShops(true)
    try {
      const response = await authorizedFetch(`${SETTINGS_API_BASE}/shops/sync`, {
        method: 'POST',
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.message || '오픈마켓 목록 동기화에 실패했습니다.')
      }

      await loadPageData()
      showToast('오픈마켓 등록 현황을 동기화했습니다.')
    } catch (error) {
      showToast(error.message || '오픈마켓 목록 동기화에 실패했습니다.', 'error')
    } finally {
      setSyncingShops(false)
    }
  }

  const saveMarketingIntegration = async (integrationType) => {
    const form = marketingForms[integrationType]
    setSavingMarketingType(integrationType)

    try {
      const validateResponse = await authorizedFetch(`${SETTINGS_API_BASE}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationType,
          apiKey: form.apiKey,
          email: form.email,
          password: form.password,
        }),
      })

      if (!validateResponse.ok) {
        const errorBody = await validateResponse.json().catch(() => ({}))
        throw new Error(errorBody.message || '마케팅 인증 정보 연동 테스트에 실패했습니다.')
      }

      const response = await authorizedFetch(`${MARKETING_SETTINGS_API_BASE}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          integrationType,
          apiKey: form.apiKey,
          email: form.email,
          password: form.password,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}))
        throw new Error(errorBody.message || '마케팅 인증 정보 저장에 실패했습니다.')
      }

      await loadPageData()
      showToast('연동 테스트 후 마케팅 인증 정보를 저장했습니다.')
    } catch (error) {
      showToast(error.message || '마케팅 인증 정보 저장에 실패했습니다.', 'error')
    } finally {
      setSavingMarketingType(null)
    }
  }

  return (
    <main
      className={`min-h-screen bg-slate-50 p-4 transition-all duration-300 sm:p-6 lg:p-8 ${
        isExpanded ? 'ml-72' : 'ml-20'
      }`}
    >
      {toast ? (
        <div
          className={cx(
            'fixed right-6 top-6 z-50 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-xl',
            toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500',
          )}
        >
          {toast.message}
        </div>
      ) : null}

      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-slate-50">설정</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-300">
            PlayAuto, 오픈마켓, 네이버, Meta 인증 정보와 주문 수집 설정을 한 곳에서 관리합니다.
          </p>

          <div className="mt-6 border-b border-slate-200 pb-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 text-left">
              <button
                type="button"
                onClick={() => setActiveView('auth')}
                className={cx(
                  'group inline-flex items-center gap-3 rounded-2xl px-4 py-2 transition',
                  activeView === 'auth' ? 'bg-slate-950 text-white' : 'hover:bg-slate-100',
                )}
              >
                <span className={cx('text-2xl font-black', activeView === 'auth' ? 'text-white' : 'text-slate-400')}>
                  인증 정보
                </span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  {playAutoReady || openMarketReady || marketingReadyCount > 0 ? '저장됨' : '미설정'}
                </span>
                <span className={cx('text-sm font-semibold', activeView === 'auth' ? 'text-slate-200' : 'text-slate-400')}>
                  {connectedAuthCount}개 연동
                </span>
              </button>

              <span className="hidden text-4xl font-thin text-slate-200 md:block">/</span>

              <button
                type="button"
                onClick={() => setActiveView('collection')}
                className={cx(
                  'group inline-flex items-center gap-3 rounded-2xl px-4 py-2 transition',
                  activeView === 'collection' ? 'bg-slate-950 text-white' : 'hover:bg-slate-100',
                )}
              >
                <span
                  className={cx(
                    'text-2xl font-black',
                    activeView === 'collection' ? 'text-white' : 'text-slate-400',
                  )}
                >
                  수집 설정
                </span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  {isOrderCollectionBusy ? '실행 중' : '저장됨'}
                </span>
                <span
                  className={cx(
                    'text-sm font-semibold',
                    activeView === 'collection' ? 'text-slate-200' : 'text-slate-400',
                  )}
                >
                  {collection.autoCollectEnabled
                    ? `${collection.scheduleValue || '-'}${UNIT_LABEL_MAP[collection.scheduleUnit] || ''} 주기`
                    : '수동 실행'}
                </span>
              </button>

              <span className="hidden text-4xl font-thin text-slate-200 md:block">/</span>

              <button
                type="button"
                onClick={() => setActiveView('shops')}
                className={cx(
                  'group inline-flex items-center gap-3 rounded-2xl px-4 py-2 transition',
                  activeView === 'shops' ? 'bg-slate-950 text-white' : 'hover:bg-slate-100',
                )}
              >
                <span className={cx('text-2xl font-black', activeView === 'shops' ? 'text-white' : 'text-slate-400')}>
                  오픈마켓 등록 현황
                </span>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                  {registeredShops.length}개 등록
                </span>
              </button>
            </div>

            <p className="mt-5 text-sm text-slate-500 dark:text-slate-300">
              {activeView === 'auth'
                ? `마지막 인증 저장: ${getSettingTimeLabel(playAutoSetting, 'authUpdatedAt')}`
                : activeView === 'collection'
                  ? `마지막 주문 수집: ${getSettingTimeLabel(playAutoSetting, 'lastOrderCollectedAt')}`
                  : '현재 등록된 오픈마켓 리스트를 확인할 수 있습니다.'}
            </p>
          </div>
        </header>

        {activeView === 'auth' ? (
          <div className="space-y-6">
            <SectionCard
              title="인증 정보"
              description="PlayAuto와 오픈마켓 연동 정보를 먼저 저장하고, 필요하면 네이버와 Meta 인증 정보까지 함께 관리합니다."
              action={
                <button
                  type="button"
                  onClick={saveAuth}
                  disabled={savingAuth}
                  className={cx(
                    'rounded-xl px-5 py-3 text-sm font-bold transition',
                    savingAuth
                      ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                      : 'bg-slate-950 text-white hover:bg-slate-800',
                  )}
                >
                  {savingAuth ? '저장 중...' : '인증 정보 저장'}
                </button>
              }
            >
              <div className="grid gap-6 xl:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-slate-50">PlayAuto 인증</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                        마지막 저장: {getSettingTimeLabel(playAutoSetting, 'authUpdatedAt')}
                      </p>
                    </div>
                    {saveBadge(playAutoReady)}
                  </div>

                  <div className="grid gap-4">
                    <InputField
                      label="API Key"
                      value={playAuto.apiKey}
                      placeholder="PlayAuto API Key"
                      onChange={(event) =>
                        setPlayAuto((current) => ({
                          ...current,
                          apiKey: event.target.value,
                        }))
                      }
                    />
                    <InputField
                      label="이메일"
                      value={playAuto.email}
                      placeholder="PlayAuto 로그인 이메일"
                      onChange={(event) =>
                        setPlayAuto((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                    />
                    <InputField
                      label="비밀번호"
                      type="password"
                      value={playAuto.password}
                      placeholder="PlayAuto 비밀번호"
                      onChange={(event) =>
                        setPlayAuto((current) => ({
                          ...current,
                          password: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-slate-50">오픈마켓 등록 인증</h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                        마지막 저장: {getSettingTimeLabel(selectedOpenMarketSetting, 'authUpdatedAt')}
                      </p>
                    </div>
                    {saveBadge(openMarketReady)}
                  </div>

                  <div className="grid gap-4">
                    <SelectField
                      label="오픈마켓"
                      value={openMarket.integrationType}
                      onChange={(event) =>
                        setOpenMarket((current) => ({
                          ...current,
                          integrationType: event.target.value,
                        }))
                      }
                    >
                      {OPEN_MARKET_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </SelectField>

                    <InputField
                      label="Access Token / API Key"
                      value={openMarket.apiKey}
                      placeholder="선택한 오픈마켓 인증키"
                      onChange={(event) =>
                        setOpenMarket((current) => ({
                          ...current,
                          apiKey: event.target.value,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="네이버 / Meta 인증 정보"
              description="마케팅 화면에서 사용하는 네이버 검색, 네이버 검색광고, Meta Ads 연동 정보를 각각 저장합니다."
            >
              <div className="grid gap-6 xl:grid-cols-3">
                {MARKETING_INTEGRATIONS.map((integration) => {
                  const form = marketingForms[integration.type]
                  const setting = settingsByType[integration.type]

                  return (
                    <article
                      key={integration.type}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                    >
                      <div className="mb-5 flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-slate-50">{integration.title}</h3>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">{integration.description}</p>
                          <p className="mt-2 text-xs font-semibold text-slate-400 dark:text-slate-400">
                            마지막 저장: {getSettingTimeLabel(setting, 'authUpdatedAt')}
                          </p>
                        </div>
                        {saveBadge(Boolean(form.apiKey || form.email || form.password))}
                      </div>

                      <div className="space-y-4">
                        {integration.fields.map((field) => (
                          <InputField
                            key={field.key}
                            label={field.label}
                            type={field.type}
                            value={form[field.key] || ''}
                            placeholder={field.placeholder}
                            onChange={(event) =>
                              setMarketingForms((current) => ({
                                ...current,
                                [integration.type]: {
                                  ...current[integration.type],
                                  [field.key]: event.target.value,
                                },
                              }))
                            }
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => saveMarketingIntegration(integration.type)}
                        disabled={savingMarketingType === integration.type}
                        className={cx(
                          'mt-5 w-full rounded-xl px-4 py-3 text-sm font-bold transition',
                          savingMarketingType === integration.type
                            ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                            : 'bg-white text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100',
                        )}
                      >
                        {savingMarketingType === integration.type ? '저장 중...' : '이 인증 정보만 저장'}
                      </button>
                    </article>
                  )
                })}
              </div>
            </SectionCard>
          </div>
        ) : null}

        {activeView === 'collection' ? (
          <div className="space-y-6">
            <SectionCard
              title="수집 설정"
              description="주문 수집 범위와 자동 수집 주기를 관리합니다. 자동 스케줄이 돌지 않는 시간에는 오늘 주문 새로고침으로 오늘 주문만 다시 수집할 수 있습니다."
              action={
                <button
                  type="button"
                  onClick={saveCollection}
                  disabled={savingCollection}
                  className={cx(
                    'rounded-xl px-5 py-3 text-sm font-bold transition',
                    savingCollection
                      ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                      : 'bg-slate-950 text-white hover:bg-slate-800',
                  )}
                >
                  {savingCollection ? '저장 중...' : '수집 설정 저장'}
                </button>
              }
            >
              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectField
                    label="수집 범위 단위"
                    value={collection.collectionUnit}
                    onChange={(event) =>
                      setCollection((current) => ({
                        ...current,
                        collectionUnit: event.target.value,
                      }))
                    }
                  >
                    {UNIT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>

                  <InputField
                    label="수집 범위 값"
                    type="number"
                    value={collection.collectionValue}
                    placeholder="30"
                    onChange={(event) =>
                      setCollection((current) => ({
                        ...current,
                        collectionValue: event.target.value,
                      }))
                    }
                  />

                  <SelectField
                    label="자동 수집 주기 단위"
                    value={collection.scheduleUnit}
                    onChange={(event) =>
                      setCollection((current) => ({
                        ...current,
                        scheduleUnit: event.target.value,
                      }))
                    }
                  >
                    {UNIT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </SelectField>

                  <InputField
                    label="자동 수집 주기 값"
                    type="number"
                    value={collection.scheduleValue}
                    placeholder="1"
                    onChange={(event) =>
                      setCollection((current) => ({
                        ...current,
                        scheduleValue: event.target.value,
                      }))
                    }
                  />

                  <label className="sm:col-span-2 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <input
                      type="checkbox"
                      checked={collection.autoCollectEnabled}
                      onChange={(event) =>
                        setCollection((current) => ({
                          ...current,
                          autoCollectEnabled: event.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300 text-slate-950 focus:ring-slate-300"
                    />
                    <div>
                      <p className="text-sm font-bold text-slate-900">주문 자동 수집 사용</p>
                      <p className="text-xs text-slate-500">설정한 주기마다 백그라운드 주문 수집을 허용합니다.</p>
                    </div>
                  </label>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                  <h3 className="text-lg font-black text-slate-900 dark:text-slate-50">현재 상태</h3>
                  <dl className="mt-4 space-y-3 text-sm text-slate-600">
                    <div className="flex items-start justify-between gap-4">
                      <dt className="font-semibold text-slate-500">마지막 주문 수집</dt>
                      <dd className="text-right font-bold text-slate-900">
                        {getSettingTimeLabel(playAutoSetting, 'lastOrderCollectedAt')}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="font-semibold text-slate-500">마지막 설정 저장</dt>
                      <dd className="text-right font-bold text-slate-900">
                        {getSettingTimeLabel(playAutoSetting, 'collectionUpdatedAt')}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="font-semibold text-slate-500">현재 실행 상태</dt>
                      <dd className="text-right">
                        {isOrderCollectionBusy ? (
                          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-700">
                            실행 중
                          </span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                            대기 중
                          </span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  <button
                    type="button"
                    onClick={runOrderCollection}
                    disabled={isOrderCollectionBusy || !collectionReady}
                    className={cx(
                      'mt-5 w-full rounded-xl px-4 py-3 text-sm font-bold transition',
                      isOrderCollectionBusy || !collectionReady
                        ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                        : 'bg-sky-500 text-white hover:bg-sky-600',
                    )}
                  >
                    {isOrderCollectionBusy ? '현재 수집이 실행 중입니다' : '지금 주문 수집 실행'}
                  </button>
                </div>
              </div>
            </SectionCard>

            <SectionCard
              title="최근 수집 실행 이력"
              description="현재 실행 상태와 최근 성공/실패 메시지를 확인할 수 있습니다."
            >
              <div className="space-y-4">
                {history.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
                    아직 저장된 실행 이력이 없습니다.
                  </div>
                ) : (
                  history.map((item) => (
                    <article
                      key={item.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-4"
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-lg font-black text-slate-950 dark:text-slate-50">
                              {JOB_TYPE_LABELS[item.jobType] || item.jobType}
                            </h3>
                            <span
                              className={cx(
                                'rounded-full px-3 py-1 text-xs font-bold',
                                HISTORY_STATUS_STYLES[item.status] || 'bg-slate-100 text-slate-600',
                              )}
                            >
                              {HISTORY_STATUS_LABELS[item.status] || item.status}
                            </span>
                          </div>

                          <p className="mt-3 break-all whitespace-pre-wrap text-sm leading-7 text-slate-600 dark:text-slate-300">
                            {item.message || '상세 메시지가 없습니다.'}
                          </p>
                        </div>

                        <div className="shrink-0 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500 xl:w-64">
                          <p>
                            시작: <span className="font-semibold text-slate-900">{formatDateTimeKst(item.startedAt)}</span>
                          </p>
                          <p className="mt-2">
                            종료: <span className="font-semibold text-slate-900">{formatDateTimeKst(item.finishedAt)}</span>
                          </p>
                        </div>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </SectionCard>
          </div>
        ) : null}

        {activeView === 'shops' ? (
          <div className="space-y-6">
            <SectionCard
              title="오픈마켓 등록 현황"
              description="현재 연동된 오픈마켓 목록을 확인하고, PlayAuto 기준 메타데이터를 다시 동기화할 수 있습니다."
              action={
                <button
                  type="button"
                  onClick={syncShops}
                  disabled={syncingShops}
                  className={cx(
                    'rounded-xl px-5 py-3 text-sm font-bold transition',
                    syncingShops
                      ? 'cursor-not-allowed bg-slate-200 text-slate-400'
                      : 'bg-slate-950 text-white hover:bg-slate-800',
                  )}
                >
                  {syncingShops ? '동기화 중...' : '오픈마켓 목록 동기화'}
                </button>
              }
            >
              {registeredShops.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-12 text-center text-sm text-slate-500">
                  등록된 오픈마켓이 없습니다. 인증 정보를 저장한 뒤 동기화를 실행해주세요.
                </div>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 bg-white text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                        <tr>
                          <th className="px-5 py-4">상점명</th>
                          <th className="px-5 py-4">상점 코드</th>
                          <th className="px-5 py-4">색상</th>
                          <th className="px-5 py-4">등록 시각</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-700">
                        {registeredShops.map((shop) => (
                          <tr key={shop.shopId}>
                            <td className="px-5 py-4 font-semibold text-slate-900">{shop.shopName || '-'}</td>
                            <td className="px-5 py-4">{shop.shopCode || '-'}</td>
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <span
                                  className="h-3 w-3 rounded-full border border-slate-200"
                                  style={{ backgroundColor: shop.color || '#cbd5e1' }}
                                />
                                <span>{shop.color || '-'}</span>
                              </div>
                            </td>
                            <td className="px-5 py-4">{formatDateTimeKst(shop.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </SectionCard>
          </div>
        ) : null}
      </div>
    </main>
  )
}
