import { useEffect, useMemo, useState } from 'react'
import {
  getExecutiveCashFlow,
  getExecutivePaymentRequests,
  getExecutiveProductForecasts,
  getExecutiveSummary,
  getExecutiveWorkTasks,
} from '../../api/executiveApi'
import { PageHeader, Panel } from './ExecutiveComponents'
import { count, pct, won } from './formatters'
import { isTaskDelayed, taskProgress, taskStatusClass, taskStatusLabels } from './workTaskUtils'
import { paymentStatusClass, paymentStatusLabels } from './paymentUtils'
import IssueBriefingPanel from './IssueBriefingPanel'
import CustomerInquiryPanel from './CustomerInquiryPanel'

function StatCard({ label, value, helper, icon, tone = 'sky', onClick }) {
  const tones = {
    sky: 'border-sky-400/20 bg-sky-400/10 text-sky-100',
    emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
    amber: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
    rose: 'border-rose-400/20 bg-rose-400/10 text-rose-100',
    slate: 'border-white/10 bg-slate-900/70 text-slate-100',
  }
  const Tag = onClick ? 'button' : 'article'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`rounded-lg border p-5 text-left shadow-xl shadow-slate-950/20 transition-colors ${tones[tone]} ${onClick ? 'hover:border-sky-300/50 hover:bg-slate-800/80' : ''}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-black text-slate-400">{label}</p>
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <p className="mt-3 text-2xl font-black text-white">{value}</p>
      {helper && <p className="mt-2 text-xs font-bold text-slate-400">{helper}</p>}
    </Tag>
  )
}

function WorkflowStep({ index, title, body, icon, tone = 'sky' }) {
  const tones = {
    sky: 'border-sky-400/20 bg-sky-400/10 text-sky-100',
    emerald: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-100',
    amber: 'border-amber-400/20 bg-amber-400/10 text-amber-100',
  }
  return (
    <article className={`rounded-lg border p-5 ${tones[tone]}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950/60 text-sm font-black">{index}</span>
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <h3 className="mt-4 text-base font-black text-white">{title}</h3>
      <p className="mt-2 text-sm font-bold leading-6 text-slate-300">{body}</p>
    </article>
  )
}

function ProgressBar({ value, tone = 'sky' }) {
  const color = tone === 'rose' ? 'bg-rose-300' : tone === 'amber' ? 'bg-amber-300' : tone === 'emerald' ? 'bg-emerald-300' : 'bg-sky-300'
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  )
}

function AccessRow({ role, can, blocked }) {
  return (
    <div className="grid gap-3 rounded-lg border border-white/10 bg-slate-950/45 p-4 lg:grid-cols-[160px_1fr_1fr]">
      <p className="text-sm font-black text-white">{role}</p>
      <p className="text-sm font-bold leading-6 text-emerald-100">{can}</p>
      <p className="text-sm font-bold leading-6 text-rose-100">{blocked}</p>
    </div>
  )
}

const kakaoConsultations = [
  {
    id: 1,
    customer: '하이프리 고객',
    type: '제품 문의',
    message: '섭취 방법과 구매 가능한 채널을 문의했습니다.',
    status: '미답변',
    owner: '마케팅팀',
    receivedAt: '방금 전',
    urgent: true,
  },
  {
    id: 2,
    customer: '공식몰 고객',
    type: '배송 문의',
    message: '주문 상품의 출고 일정 확인이 필요합니다.',
    status: '처리중',
    owner: '채널 운영',
    receivedAt: '12분 전',
    urgent: false,
  },
  {
    id: 3,
    customer: 'B2B 제휴 문의',
    type: '입점/제휴',
    message: '오프라인 판매 제안서와 공급가 자료를 요청했습니다.',
    status: '담당자 배정',
    owner: '영업팀',
    receivedAt: '34분 전',
    urgent: false,
  },
]

function ConsultationStatus({ status }) {
  const classes = {
    미답변: 'border-rose-200 bg-rose-50 text-rose-700',
    처리중: 'border-amber-200 bg-amber-50 text-amber-700',
    '담당자 배정': 'border-sky-200 bg-sky-50 text-sky-700',
    완료: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  }

  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${classes[status] || classes.처리중}`}>
      {status}
    </span>
  )
}

function KakaoConsultationPanel() {
  const unanswered = kakaoConsultations.filter((item) => item.status === '미답변').length
  const active = kakaoConsultations.filter((item) => item.status !== '완료').length
  const urgent = kakaoConsultations.filter((item) => item.urgent).length

  return (
    <section className="mb-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined rounded-lg border border-yellow-200 bg-yellow-50 p-2 text-yellow-700">forum</span>
            <h2 className="text-lg font-black text-slate-950">카카오 상담 현황</h2>
          </div>
          <p className="mt-2 text-sm font-medium text-slate-500">직원과 대표가 같이 보는 고객 문의 처리 현황입니다. 상담톡 API 연결 후 실시간 데이터로 전환됩니다.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700">미답변 {unanswered}건</span>
          <span className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-black text-sky-700">진행 {active}건</span>
          <span className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700">긴급 {urgent}건</span>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-black text-slate-500">연동 상태</p>
          <p className="mt-3 text-2xl font-black text-slate-950">상담톡 API 준비</p>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-600">
            카카오 공식 딜러사 또는 상담톡 API 권한을 받으면 고객명, 문의 내용, 담당자, 처리 상태를 이 영역에 실시간으로 표시합니다.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-black">
            <span className="rounded-md bg-white px-3 py-2 text-slate-600">고객 문의 수집</span>
            <span className="rounded-md bg-white px-3 py-2 text-slate-600">담당자 배정</span>
            <span className="rounded-md bg-white px-3 py-2 text-slate-600">미답변 알림</span>
            <span className="rounded-md bg-white px-3 py-2 text-slate-600">AI 유형 분류</span>
          </div>
        </div>

        <div className="space-y-3">
          {kakaoConsultations.map((item) => (
            <article key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-slate-950">{item.customer}</p>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-black text-slate-600">{item.type}</span>
                    {item.urgent && <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-black text-rose-700">긴급</span>}
                  </div>
                  <p className="mt-2 text-sm font-bold leading-6 text-slate-600">{item.message}</p>
                  <p className="mt-2 text-xs font-bold text-slate-400">{item.owner} · {item.receivedAt}</p>
                </div>
                <ConsultationStatus status={item.status} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default function PlatformOverviewPage({ onNavigate, username = 'admin', role = 'EXECUTIVE' }) {
  const isExecutive = role === 'EXECUTIVE'
  const [summary, setSummary] = useState(null)
  const [cashFlow, setCashFlow] = useState(null)
  const [tasks, setTasks] = useState([])
  const [payments, setPayments] = useState([])
  const [forecasts, setForecasts] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    return Promise.all([
      isExecutive ? getExecutiveSummary() : Promise.resolve({ data: {} }),
      isExecutive ? getExecutiveCashFlow() : Promise.resolve({ data: {} }),
      getExecutiveWorkTasks(),
      getExecutivePaymentRequests(),
      getExecutiveProductForecasts(),
    ])
      .then(([summaryRes, cashRes, taskRes, paymentRes, forecastRes]) => {
        setSummary(summaryRes.data || {})
        setCashFlow(cashRes.data || {})
        setTasks(taskRes.data || [])
        setPayments(paymentRes.data || [])
        setForecasts(forecastRes.data || [])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const activeTasks = tasks.filter((task) => task.status !== 'DONE')
  const delayedTasks = tasks.filter((task) => isTaskDelayed(task))
  const blockedTasks = tasks.filter((task) => task.status === 'BLOCKED')
  const reviewTasks = tasks.filter((task) => task.status === 'REVIEW' || task.approval_required)
  const avgProgress = activeTasks.length
    ? Math.round(activeTasks.reduce((sum, task) => sum + taskProgress(task), 0) / activeTasks.length)
    : 100
  const pendingPayments = payments.filter((payment) => ['SUBMITTED', 'REVIEWING'].includes(payment.status))
  const urgentPayments = pendingPayments.filter((payment) => payment.urgent)
  const pendingOutflow = pendingPayments
    .filter((payment) => payment.flow_type === 'OUTFLOW')
    .reduce((sum, payment) => sum + Number(payment.amount || 0), 0)
  const cashApplied = payments.filter((payment) => payment.status === 'CASH_APPLIED')

  const launchRisks = useMemo(() => (
    forecasts
      .map((product) => {
        const readiness = Number(product.launch_readiness_rate ?? product.launch_readiness ?? product.readiness_rate ?? 0)
        const riskScore = Number(product.risk_score ?? product.launch_risk_score ?? 100 - readiness)
        return {
          ...product,
          readiness,
          riskScore,
          productName: product.product_name || product.productName || '제품명 미정',
        }
      })
      .filter((product) => product.riskScore >= 40 || product.readiness < 70)
      .sort((a, b) => b.riskScore - a.riskScore || a.readiness - b.readiness)
      .slice(0, 5)
  ), [forecasts])

  const projectSummary = useMemo(() => {
    const grouped = new Map()
    tasks.forEach((task) => {
      const project = task.project_name || '미지정 프로젝트'
      const row = grouped.get(project) || { project, total: 0, delayed: 0, blocked: 0, review: 0, progressSum: 0 }
      row.total += 1
      row.progressSum += taskProgress(task)
      if (isTaskDelayed(task)) row.delayed += 1
      if (task.status === 'BLOCKED') row.blocked += 1
      if (task.status === 'REVIEW' || task.approval_required) row.review += 1
      grouped.set(project, row)
    })
    return Array.from(grouped.values())
      .map((row) => ({ ...row, progress: row.total ? Math.round(row.progressSum / row.total) : 0 }))
      .sort((a, b) => b.delayed - a.delayed || b.blocked - a.blocked || a.progress - b.progress)
      .slice(0, 6)
  }, [tasks])

  const currentCash = Number(summary?.cash_balance ?? cashFlow?.openingCash ?? 0)
  const monthOutflow = Number(summary?.today_outflow ?? 0)

  return (
    <>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageHeader
          title="업무 플랫폼"
          description="직원 입력, 관리자 승인, 대표 의사결정 화면이 하나로 연결되는 회사 내부 운영 시스템입니다."
        />
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-sky-400 px-5 text-sm font-black text-slate-950 transition-colors hover:bg-sky-300 disabled:bg-slate-700 disabled:text-slate-400"
          >
            <span className="material-symbols-outlined text-base">sync</span>
            {loading ? '동기화 중' : '실시간 동기화'}
          </button>
        </div>
      </div>

      <section className="mb-6">
        <IssueBriefingPanel compact onNavigate={onNavigate} />
      </section>

      <CustomerInquiryPanel />

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="업무 진행률" value={`${avgProgress}%`} helper={`진행중 ${count(activeTasks.length, '건')}`} icon="assignment" tone={avgProgress >= 75 ? 'emerald' : avgProgress >= 45 ? 'amber' : 'rose'} onClick={() => onNavigate?.('work-management')} />
        <StatCard label="막힘/지연 업무" value={count(delayedTasks.length + blockedTasks.length, '건')} helper="대표가 먼저 볼 병목" icon="warning" tone={delayedTasks.length + blockedTasks.length > 0 ? 'rose' : 'emerald'} onClick={() => onNavigate?.('work-management')} />
        <StatCard label="결재 대기" value={count(pendingPayments.length, '건')} helper={isExecutive ? `대기 출금 ${won(pendingOutflow)}` : '승인 대기 요청'} icon="approval" tone={pendingPayments.length > 0 ? 'amber' : 'emerald'} onClick={() => onNavigate?.('payment-approval')} />
        <StatCard label="긴급 지출" value={count(urgentPayments.length, '건')} helper="현금흐름 영향 가능" icon="priority_high" tone={urgentPayments.length > 0 ? 'rose' : 'emerald'} onClick={() => onNavigate?.('payment-approval')} />
        <StatCard label="런칭 리스크" value={count(launchRisks.length, '개')} helper="NPD 위험 제품" icon="rocket_launch" tone={launchRisks.length > 0 ? 'rose' : 'emerald'} onClick={() => onNavigate?.('product-forecast')} />
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel
          title="플랫폼 운영 흐름"
          right={<span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-xs font-black text-sky-100">{username}</span>}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <WorkflowStep
              index="1"
              icon="edit_note"
              title="직원 입력"
              body="업무 진행률, 막힘 이슈, 지출결의서, 생산/마케팅 실행 내용을 직원이 직접 등록합니다."
            />
            <WorkflowStep
              index="2"
              icon="rule"
              title="관리자 검토"
              body="팀장 또는 관리자가 지연 업무와 결재 요청을 검토하고 승인 또는 반려합니다."
              tone="amber"
            />
            <WorkflowStep
              index="3"
              icon="monitoring"
              title="대표 대시보드 반영"
              body="승인된 지출은 현금흐름에 반영되고, 업무와 NPD 위험은 경영 화면에 자동 집계됩니다."
              tone="emerald"
            />
          </div>
          {isExecutive && (
            <div className="mt-5 rounded-lg border border-white/10 bg-slate-950/50 p-4">
              <p className="text-xs font-black text-sky-200">현재 연결 상태</p>
              <div className="mt-3 grid gap-3 md:grid-cols-3">
                <div>
                  <p className="text-xs font-bold text-slate-500">승인 후 현금 반영</p>
                  <p className="mt-1 text-lg font-black text-white">{count(cashApplied.length, '건')}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">현재 현금</p>
                  <p className="mt-1 text-lg font-black text-white">{won(currentCash)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-500">오늘 출금</p>
                  <p className="mt-1 text-lg font-black text-white">{won(monthOutflow)}</p>
                </div>
              </div>
            </div>
          )}
        </Panel>

        <Panel title="바로 실행">
          <div className="grid gap-3">
            {[
              ['work-input', '내 업무 입력', '오늘 한 일, 막힘, 다음 액션을 등록합니다.', 'edit_note'],
              ['payment-request', '입출금 요청', '지출결의서와 입금 예정 내역을 제출합니다.', 'request_page'],
              ['payment-approval', '결재 관리', '승인 즉시 현금흐름에 반영합니다.', 'approval'],
              ['employee-performance', '직원 성과 분석', '직원별 강점과 보완점을 확인합니다.', 'analytics'],
              ['summary', '대표 요약', '회사의 핵심 위험과 의사결정 지표를 봅니다.', 'dashboard'],
            ].filter(([page]) => role === 'EXECUTIVE' || !['employee-performance', 'summary'].includes(page)).map(([page, title, body, icon]) => (
              <button
                key={page}
                type="button"
                onClick={() => onNavigate?.(page)}
                className="flex items-center gap-4 rounded-lg border border-white/10 bg-slate-950/45 p-4 text-left transition-colors hover:border-sky-400/40 hover:bg-white/[0.04]"
              >
                <span className="material-symbols-outlined rounded-lg border border-sky-400/20 bg-sky-400/10 p-2 text-sky-100">{icon}</span>
                <span>
                  <span className="block text-sm font-black text-white">{title}</span>
                  <span className="mt-1 block text-xs font-bold text-slate-500">{body}</span>
                </span>
              </button>
            ))}
          </div>
        </Panel>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="프로젝트 병목 순위">
          <div className="space-y-4">
            {projectSummary.length === 0 ? (
              <p className="rounded-lg border border-dashed border-white/10 bg-slate-950/40 p-5 text-sm font-bold text-slate-500">등록된 업무가 없습니다.</p>
            ) : projectSummary.map((project) => {
              const tone = project.delayed || project.blocked ? 'rose' : project.progress >= 75 ? 'emerald' : 'amber'
              return (
                <article key={project.project} className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-white">{project.project}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">업무 {project.total}건 · 지연 {project.delayed}건 · 막힘 {project.blocked}건 · 검토 {project.review}건</p>
                    </div>
                    <p className="shrink-0 text-sm font-black text-white">{project.progress}%</p>
                  </div>
                  <ProgressBar value={project.progress} tone={tone} />
                </article>
              )
            })}
          </div>
        </Panel>

        <Panel title="대표 우선 확인 항목">
          <div className="space-y-3">
            {[...delayedTasks, ...blockedTasks, ...reviewTasks]
              .filter((task, index, array) => array.findIndex((candidate) => candidate.id === task.id) === index)
              .slice(0, 6)
              .map((task) => (
                <article key={task.id} className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">{task.task_name}</p>
                      <p className="mt-1 text-xs font-bold text-slate-500">{task.project_name} · {task.assignee_name} · {task.due_date || '마감일 미정'}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${taskStatusClass(task.status)}`}>{taskStatusLabels[task.status] || task.status}</span>
                  </div>
                  {(task.blocker_text || task.next_action) && (
                    <p className="mt-3 text-sm font-bold leading-6 text-slate-300">{task.blocker_text || task.next_action}</p>
                  )}
                </article>
              ))}
            {delayedTasks.length + blockedTasks.length + reviewTasks.length === 0 && (
              <p className="rounded-lg border border-dashed border-white/10 bg-slate-950/40 p-5 text-sm font-bold text-slate-500">대표가 즉시 확인할 병목 업무가 없습니다.</p>
            )}
          </div>
        </Panel>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="권한 설계">
          <div className="space-y-3">
            <AccessRow role="직원" can="내 업무, 내 지출결의서, NPD 담당 항목 입력" blocked="경영요약, 현금흐름, 대출/부채, 전체 직원 현황 제한" />
            <AccessRow role="관리자" can="팀 업무 관리, 결재 검토, 프로젝트 병목 확인" blocked="대표 전용 현금/대출 의사결정 화면 제한 가능" />
            <AccessRow role="대표" can="전체 경영요약, 현금흐름, 광고성과, 제품 리스크, 조직 현황" blocked="제한 없음" />
          </div>
        </Panel>

        <Panel title="결재 대기 현황">
          <div className="space-y-3">
            {pendingPayments.slice(0, 6).map((payment) => (
              <article key={payment.id} className="rounded-lg border border-white/10 bg-slate-950/45 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-white">{payment.purpose}</p>
                    <p className="mt-1 text-xs font-bold text-slate-500">{payment.requester_name} · {payment.counterparty} · {payment.scheduled_date}</p>
                  </div>
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${paymentStatusClass(payment.status)}`}>{paymentStatusLabels[payment.status] || payment.status}</span>
                </div>
                <p className="mt-3 text-lg font-black text-white">{won(payment.amount)}</p>
              </article>
            ))}
            {pendingPayments.length === 0 && (
              <p className="rounded-lg border border-dashed border-white/10 bg-slate-950/40 p-5 text-sm font-bold text-slate-500">결재 대기 중인 입출금 요청이 없습니다.</p>
            )}
          </div>
        </Panel>
      </section>

      <Panel title="NPD 런칭 위험 제품">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {launchRisks.length === 0 ? (
            <p className="rounded-lg border border-dashed border-white/10 bg-slate-950/40 p-5 text-sm font-bold text-slate-500">현재 높은 런칭 리스크 제품이 없습니다.</p>
          ) : launchRisks.map((product) => (
            <article key={product.id || product.productName} className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-5">
              <p className="text-base font-black text-white">{product.productName}</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-400">런칭 준비율</p>
                  <p className="mt-1 text-xl font-black text-white">{pct(product.readiness)}</p>
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400">리스크 점수</p>
                  <p className="mt-1 text-xl font-black text-white">{Math.round(product.riskScore)}점</p>
                </div>
              </div>
              <div className="mt-4">
                <ProgressBar value={product.readiness} tone={product.readiness < 60 ? 'rose' : 'amber'} />
              </div>
            </article>
          ))}
        </div>
      </Panel>
    </>
  )
}
