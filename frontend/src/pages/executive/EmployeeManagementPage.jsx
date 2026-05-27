import { useEffect, useState } from 'react'
import { createInvite, getInvites, getUsers, resetUserPassword } from '../../api/authApi'
import { DataTable, PageHeader, Panel } from './ExecutiveComponents'

const roleLabels = {
  EMPLOYEE: '직원',
  MANAGER: '관리자',
  EXECUTIVE: '대표',
}

const statusLabels = {
  ACTIVE: '활성',
  INVITED: '초대',
  DISABLED: '비활성',
  LEFT: '퇴사',
  BLOCKED: '차단',
  PENDING: '초대 대기',
  ACCEPTED: '가입 완료',
  EXPIRED: '만료',
  CANCELLED: '취소',
}

const getInviteOrigin = () => {
  const configuredOrigin = import.meta.env.VITE_PUBLIC_APP_ORIGIN
  if (configuredOrigin) {
    return configuredOrigin.replace(/\/$/, '')
  }
  if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    return 'http://192.168.0.86:8081'
  }
  return window.location.origin
}

const buildInviteLink = (inviteCode) => `${getInviteOrigin()}/?invite=${encodeURIComponent(inviteCode)}`

function RolePill({ role }) {
  const className = role === 'EXECUTIVE'
    ? 'border-rose-400/30 bg-rose-400/15 text-rose-100'
    : role === 'MANAGER'
      ? 'border-amber-400/30 bg-amber-400/15 text-amber-100'
      : 'border-sky-400/30 bg-sky-400/15 text-sky-100'
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${className}`}>{roleLabels[role] || role}</span>
}

function StatusPill({ status }) {
  const className = status === 'ACTIVE' || status === 'ACCEPTED'
    ? 'border-emerald-400/30 bg-emerald-400/15 text-emerald-100'
    : status === 'PENDING'
      ? 'border-amber-400/30 bg-amber-400/15 text-amber-100'
      : 'border-slate-500/30 bg-slate-500/15 text-slate-200'
  return <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${className}`}>{statusLabels[status] || status}</span>
}

export default function EmployeeManagementPage() {
  const [users, setUsers] = useState([])
  const [invites, setInvites] = useState([])
  const [message, setMessage] = useState('')
  const [copiedCode, setCopiedCode] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [form, setForm] = useState({
    displayName: '',
    department: '',
    positionName: '',
    role: 'EMPLOYEE',
  })

  const load = async () => {
    const [userRes, inviteRes] = await Promise.all([getUsers(), getInvites()])
    setUsers(userRes.data || [])
    setInvites(inviteRes.data || [])
  }

  useEffect(() => {
    load()
  }, [])

  const setValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  const copyInviteLink = async (inviteCode) => {
    const link = buildInviteLink(inviteCode)
    await navigator.clipboard?.writeText(link)
    setCopiedCode(inviteCode)
    setMessage(`초대 링크를 복사했습니다: ${link}`)
  }

  const submit = async (event) => {
    event.preventDefault()
    const response = await createInvite(form)
    const inviteCode = response.data.inviteCode
    setMessage(`초대 링크: ${buildInviteLink(inviteCode)}`)
    setForm({ displayName: '', department: '', positionName: '', role: 'EMPLOYEE' })
    await load()
  }

  const submitPasswordReset = async (event) => {
    event.preventDefault()
    if (!selectedUser) {
      setMessage('비밀번호를 초기화할 계정을 선택하세요.')
      return
    }
    setResetting(true)
    try {
      await resetUserPassword(selectedUser.id, { newPassword })
      setMessage(`${selectedUser.display_name || selectedUser.username} 계정 비밀번호를 변경했습니다.`)
      setNewPassword('')
    } catch (error) {
      setMessage(error?.response?.data?.message || error.message || '비밀번호 변경에 실패했습니다.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <>
      <PageHeader title="직원 관리" description="직원 초대 링크를 만들고 가입 상태와 권한을 확인합니다." />

      <section className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[420px_1fr]">
        <Panel title="직원 초대 생성" right={message ? <span className="max-w-xl truncate text-xs font-black text-emerald-300">{message}</span> : null}>
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-400">직원 이름</span>
              <input required value={form.displayName} onChange={(event) => setValue('displayName', event.target.value)} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-sky-400" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-400">소속</span>
              <input value={form.department} onChange={(event) => setValue('department', event.target.value)} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-sky-400" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-400">직무</span>
              <input value={form.positionName} onChange={(event) => setValue('positionName', event.target.value)} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-sky-400" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-black text-slate-400">권한</span>
              <select value={form.role} onChange={(event) => setValue('role', event.target.value)} className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-sky-400">
                <option value="EMPLOYEE">직원</option>
                <option value="MANAGER">관리자</option>
                <option value="EXECUTIVE">대표</option>
              </select>
            </label>
            <button type="submit" className="h-11 w-full rounded-lg bg-sky-400 px-6 text-sm font-black text-slate-950 hover:bg-sky-300">
              초대 링크 생성
            </button>
            <p className="rounded-lg border border-white/10 bg-slate-950/50 p-3 text-xs font-bold leading-5 text-slate-400">
              생성된 링크를 직원에게 전달하세요. 링크가 localhost로 시작하면 같은 PC에서만 열립니다. 직원에게 보내려면 회사 내부 서버 IP나 도메인으로 접속한 뒤 링크를 생성해야 합니다.
            </p>
          </form>
        </Panel>

        <Panel title="직원 계정">
          <DataTable
            rows={users}
            rowKey={(row) => row.id}
            columns={[
              { key: 'display_name', label: '이름', render: (row) => <span className="font-black text-white">{row.display_name}</span> },
              { key: 'username', label: '아이디' },
              { key: 'department', label: '소속', render: (row) => row.department || '-' },
              { key: 'position_name', label: '직무', render: (row) => row.position_name || '-' },
              { key: 'role', label: '권한', render: (row) => <RolePill role={row.role} /> },
              { key: 'status', label: '상태', render: (row) => <StatusPill status={row.status} /> },
              {
                key: 'actions',
                label: '관리',
                searchable: false,
                render: (row) => (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedUser(row)
                      setNewPassword('')
                    }}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-sky-400/30 px-2 text-xs font-black text-sky-100 transition-colors hover:bg-sky-400/10"
                  >
                    <span className="material-symbols-outlined text-sm">lock_reset</span>
                    비밀번호 초기화
                  </button>
                ),
              },
            ]}
          />
        </Panel>
      </section>

      <Panel
        title="계정 비밀번호 초기화"
        right={selectedUser ? <span className="text-xs font-black text-sky-200">{selectedUser.display_name || selectedUser.username} 선택됨</span> : null}
      >
        <form onSubmit={submitPasswordReset} className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_260px_140px]">
          <div className="rounded-lg border border-white/10 bg-slate-950 px-4 py-3">
            <p className="text-xs font-bold text-slate-500">선택 계정</p>
            <p className="mt-1 text-sm font-black text-white">
              {selectedUser ? `${selectedUser.display_name || '-'} / ${selectedUser.username}` : '직원 계정 표에서 초기화할 계정을 선택하세요.'}
            </p>
          </div>
          <label>
            <span className="mb-1 block text-xs font-bold text-slate-400">새 비밀번호</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              placeholder="8자 이상"
              className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm font-bold text-white outline-none focus:border-sky-400"
            />
          </label>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={!selectedUser || newPassword.length < 8 || resetting}
              className="h-11 w-full rounded-lg bg-sky-400 px-4 text-sm font-black text-slate-950 transition-colors hover:bg-sky-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {resetting ? '변경 중' : '변경'}
            </button>
          </div>
        </form>
      </Panel>

      <Panel title="초대 링크 현황">
        <DataTable
          rows={invites}
          rowKey={(row) => row.id}
          columns={[
            { key: 'invite_code', label: '초대 코드', render: (row) => <span className="font-black text-sky-100">{row.invite_code}</span> },
            {
              key: 'invite_link',
              label: '가입 링크',
              searchable: false,
              render: (row) => (
                <button
                  type="button"
                  onClick={() => copyInviteLink(row.invite_code)}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-sky-400/30 px-2 text-xs font-black text-sky-100 transition-colors hover:bg-sky-400/10"
                >
                  <span className="material-symbols-outlined text-sm">content_copy</span>
                  {copiedCode === row.invite_code ? '복사됨' : '링크 복사'}
                </button>
              ),
            },
            { key: 'display_name', label: '이름' },
            { key: 'department', label: '소속', render: (row) => row.department || '-' },
            { key: 'position_name', label: '직무', render: (row) => row.position_name || '-' },
            { key: 'role', label: '권한', render: (row) => <RolePill role={row.role} /> },
            { key: 'status', label: '상태', render: (row) => <StatusPill status={row.status} /> },
            { key: 'expires_at', label: '만료일', render: (row) => row.expires_at ? String(row.expires_at).slice(0, 10) : '-' },
          ]}
        />
      </Panel>
    </>
  )
}
