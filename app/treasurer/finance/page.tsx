'use client'

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Banknote,
  CirclePlus,
  FileSpreadsheet,
  Loader2,
  Paperclip,
  ReceiptText,
  Save,
  Trash,
  WalletCards,
} from 'lucide-react'
import { supabase } from '@/lib/supabaseClient'
import { useTheme, type ThemeTokens } from '@/app/provider/ThemeContext'
import { calculateFinanceSummary, formatRM } from '@/lib/financeMath.js'

type FinanceType = 'income' | 'expense'
type SheetTab = 'budget' | 'actual' | 'statement'

type ProgrammeOption = {
  id: string
  name: string
  category?: string | null
  organiser?: string | null
  venue?: string | null
  budget?: number | null
  start_date?: string | null
  end_date?: string | null
  status?: string | null
  finance_role?: string | null
}

type BudgetItem = {
  id: string
  programme_id: string
  type: FinanceType
  category: string
  item: string
  quantity: number
  unit_amount: number
  notes?: string | null
  created_at?: string
}

type FinanceTransaction = {
  id: string
  programme_id: string
  type: FinanceType
  transaction_date: string
  category: string
  description: string
  amount: number
  payment_method?: string | null
  receipt_url?: string | null
  remarks?: string | null
  created_at?: string
}

type FinanceSummary = {
  plannedIncome: number
  plannedExpense: number
  plannedBalance: number
  actualIncome: number
  actualExpense: number
  actualBalance: number
  incomeVariance: number
  expenseVariance: number
  balanceVariance: number
}

const emptyBudgetForm = {
  type: 'expense' as FinanceType,
  category: 'Food & Beverage',
  item: '',
  quantity: '1',
  unit_amount: '',
  notes: '',
}

const emptyTransactionForm = {
  type: 'expense' as FinanceType,
  transaction_date: new Date().toISOString().slice(0, 10),
  category: 'Food & Beverage',
  description: '',
  amount: '',
  payment_method: 'Online Transfer',
  receipt_url: '',
  remarks: '',
}

const optionStyle: React.CSSProperties = {
  color: '#111827',
  background: '#ffffff',
}

function getInitials(name: string) {
  return name?.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase() || 'TR'
}

function normalizeMoney(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : 0
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

function TypeBadge({ type }: { type: FinanceType }) {
  const isIncome = type === 'income'
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 8px',
      borderRadius: '6px',
      fontSize: '11px',
      fontWeight: 700,
      color: isIncome ? '#059669' : '#dc2626',
      background: isIncome ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
      textTransform: 'capitalize',
    }}>
      {type}
    </span>
  )
}

function TreasurerFinanceContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { t } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [deletingId, setDeletingId] = useState('')
  const [confirmDelete, setConfirmDelete] = useState<{ kind: 'budget_item' | 'transaction'; id: string } | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [profile, setProfile] = useState<{ name: string; role: string } | null>(null)
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([])
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('')
  const lockedProgrammeId = searchParams?.get('programmeId') ?? ''
  const [selectedProgramme, setSelectedProgramme] = useState<ProgrammeOption | null>(null)
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([])
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [summary, setSummary] = useState<FinanceSummary>(() => calculateFinanceSummary([], []))
  const [categories, setCategories] = useState<string[]>([])
  const [paymentMethods, setPaymentMethods] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<SheetTab>('budget')
  const [budgetForm, setBudgetForm] = useState(emptyBudgetForm)
  const [transactionForm, setTransactionForm] = useState(emptyTransactionForm)
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 780)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const getToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.replace('/login')
      return ''
    }
    return session.access_token
  }, [router])

  const loadFinance = useCallback(async (programmeId = '') => {
    setError('')
    const token = await getToken()
    if (!token) return

    const target = programmeId
    const res = await fetch(`/api/finance${target ? `?programmeId=${target}` : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Unable to load finance records.')
      setLoading(false)
      return
    }

    setProfile(data.profile)
    setProgrammes(data.programmes ?? [])
    setSelectedProgramme(data.selectedProgramme)
    setSelectedProgrammeId(data.selectedProgramme?.id ?? '')
    setBudgetItems(data.budgetItems ?? [])
    setTransactions(data.transactions ?? [])
    setSummary(data.summary ?? calculateFinanceSummary([], []))
    setCategories(data.categories ?? [])
    setPaymentMethods(data.paymentMethods ?? [])
    setLoading(false)
  }, [getToken])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadFinance(lockedProgrammeId)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadFinance, lockedProgrammeId])

  const budgetTotals = useMemo(() => ({
    income: budgetItems.filter(item => item.type === 'income').length,
    expense: budgetItems.filter(item => item.type === 'expense').length,
  }), [budgetItems])

  const transactionTotals = useMemo(() => ({
    income: transactions.filter(item => item.type === 'income').length,
    expense: transactions.filter(item => item.type === 'expense').length,
  }), [transactions])

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 11px',
    borderRadius: '8px',
    border: `1px solid ${t.borderInput}`,
    background: t.bgInput,
    color: t.text,
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    color: t.textFaint,
    marginBottom: '5px',
    fontWeight: 600,
  }

  const panelStyle: React.CSSProperties = {
    background: t.bgCard,
    border: `1px solid ${t.border}`,
    borderRadius: '12px',
  }

  const handleProgrammeChange = (id: string) => {
    setSelectedProgrammeId(id)
    setLoading(true)
    loadFinance(id)
  }

  const flashSuccess = (message: string) => {
    setSuccess(message)
    setTimeout(() => setSuccess(''), 3500)
  }

  const handleBudgetSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedProgrammeId) return
    setSaving(true)
    setError('')

    const token = await getToken()
    if (!token) return

    const res = await fetch('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        kind: 'budget_item',
        programme_id: selectedProgrammeId,
        type: budgetForm.type,
        category: budgetForm.category,
        item: budgetForm.item,
        quantity: budgetForm.quantity,
        unit_amount: budgetForm.unit_amount,
        notes: budgetForm.notes,
      }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error ?? 'Unable to save budget item.')
      return
    }

    setBudgetForm(prev => ({ ...emptyBudgetForm, type: prev.type, category: prev.category }))
    flashSuccess('Budget item saved.')
    await loadFinance(selectedProgrammeId)
  }

  const handleTransactionSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!selectedProgrammeId) return
    setSaving(true)
    setError('')

    const token = await getToken()
    if (!token) return

    const res = await fetch('/api/finance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        kind: 'transaction',
        programme_id: selectedProgrammeId,
        type: transactionForm.type,
        transaction_date: transactionForm.transaction_date,
        category: transactionForm.category,
        description: transactionForm.description,
        amount: transactionForm.amount,
        payment_method: transactionForm.payment_method,
        receipt_url: transactionForm.receipt_url,
        remarks: transactionForm.remarks,
      }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      setError(data.error ?? 'Unable to save transaction.')
      return
    }

    setTransactionForm(prev => ({ ...emptyTransactionForm, type: prev.type, category: prev.category, payment_method: prev.payment_method }))
    flashSuccess('Actual record saved.')
    await loadFinance(selectedProgrammeId)
  }

  const handleReceiptUpload = async (file: File) => {
    if (!selectedProgrammeId) return
    setError('')
    setUploadingReceipt(true)

    const token = await getToken()
    if (!token) {
      setUploadingReceipt(false)
      return
    }

    const body = new FormData()
    body.append('file', file)
    body.append('programme_id', selectedProgrammeId)

    const res = await fetch('/api/finance/receipt', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body,
    })
    const data = await res.json()
    setUploadingReceipt(false)

    if (!res.ok) {
      setError(data.error ?? 'Unable to upload receipt.')
      return
    }

    setTransactionForm(prev => ({ ...prev, receipt_url: data.url }))
    flashSuccess('Receipt uploaded.')
  }

  const handleDelete = (kind: 'budget_item' | 'transaction', id: string) => {
    if (!selectedProgrammeId) return
    setConfirmDelete({ kind, id })
  }

  const confirmDeleteRecord = async () => {
    if (!confirmDelete || !selectedProgrammeId) return
    const { kind, id } = confirmDelete
    setConfirmDelete(null)
    setDeletingId(id)
    setError('')

    const token = await getToken()
    if (!token) return

    const res = await fetch(`/api/finance?kind=${kind}&id=${id}&programmeId=${selectedProgrammeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()
    setDeletingId('')

    if (!res.ok) {
      setError(data.error ?? 'Unable to delete record.')
      return
    }

    flashSuccess('Finance record deleted.')
    await loadFinance(selectedProgrammeId)
  }

  const goBack = () => {
    if (lockedProgrammeId) {
      router.back()
    } else if (profile?.role === 'admin') router.push('/admin')
    else if (profile?.role === 'superadmin') router.push('/superadmin')
    else router.push('/student')
  }

  const tabItems: { id: SheetTab; label: string; mobileLabel: string; icon: React.ElementType }[] = [
    { id: 'budget', label: 'BELANJAWAN', mobileLabel: 'BELANJAWAN', icon: FileSpreadsheet },
    { id: 'actual', label: 'MAKLUMAT BELANJA SEBENAR', mobileLabel: 'BELANJA SEBENAR', icon: ReceiptText },
    { id: 'statement', label: 'PENYATA', mobileLabel: 'PENYATA', icon: Banknote },
  ]

  if (loading || isMobile === null) {
    return (
      <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '14px' }}>
        <Loader2 size={34} color={t.accentText} style={{ animation: 'spin 0.8s linear infinite' }} />
        <p style={{ margin: 0, color: t.textFaint, fontSize: '13px' }}>Loading finance workspace...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: t.bg, color: t.text, fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media print {
          .finance-no-print { display: none !important; }
          .finance-print-page { padding: 0 !important; margin: 0 !important; }
        }
      `}</style>

      <header className="finance-no-print" style={{ background: t.bgCardAlt, borderBottom: `1px solid ${t.border}`, position: 'sticky', top: 0, zIndex: 20 }}>
        <div style={{ maxWidth: '1180px', margin: '0 auto', padding: isMobile ? '13px 16px' : '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <button onClick={goBack} title="Back" style={{ width: '34px', height: '34px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.textFaint, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <ArrowLeft size={16} />
            </button>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#047857,#0f766e)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <WalletCards size={17} color="white" />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 style={{ margin: 0, fontSize: isMobile ? '15px' : '19px', fontWeight: 700, color: t.text, letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {selectedProgramme?.name ?? 'No finance programme assigned'}
              </h1>
              <p style={{ margin: '2px 0 0', fontSize: '11px', color: t.textFaint }}>Treasurer Finance</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg,#0f766e,#14b8a6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
              {getInitials(profile?.name ?? '')}
            </div>
          </div>
        </div>
      </header>

      <main className="finance-print-page" style={{ maxWidth: '1180px', margin: '0 auto', padding: isMobile ? '16px' : '24px' }}>
        {error && (
          <div style={{ ...panelStyle, borderColor: t.dangerBorder, background: t.dangerBg, padding: '12px 14px', marginBottom: '14px', color: t.danger, fontSize: '13px' }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ ...panelStyle, borderColor: t.successBorder, background: t.successBg, padding: '12px 14px', marginBottom: '14px', color: t.success, fontSize: '13px' }}>
            {success}
          </div>
        )}

        {programmes.length === 0 ? (
          <div style={{ ...panelStyle, padding: '32px', textAlign: 'center' }}>
            <WalletCards size={28} color={t.textFaintest} />
            <h2 style={{ margin: '12px 0 6px', fontSize: '16px', color: t.text }}>No Treasurer Programme</h2>
            <p style={{ margin: 0, fontSize: '13px', color: t.textFaint }}>You need an approved Treasurer or Vice Treasurer committee role to manage programme finance.</p>
          </div>
        ) : (
          <>
            <section className="finance-no-print" style={{ ...panelStyle, padding: isMobile ? '14px' : '16px 18px', marginBottom: '16px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `${lockedProgrammeId ? '' : 'minmax(260px, 1.2fr) '}repeat(3, 1fr)`, gap: '12px', alignItems: 'end' }}>
              {!lockedProgrammeId && (
                <div>
                  <label style={labelStyle}>Programme</label>
                  <select value={selectedProgrammeId} onChange={event => handleProgrammeChange(event.target.value)} style={inputStyle}>
                    {programmes.map(programme => (
                      <option key={programme.id} value={programme.id} style={optionStyle}>{programme.name}</option>
                    ))}
                  </select>
                </div>
              )}
              <SummaryMini label="Budget Balance" value={summary.plannedBalance} tone={summary.plannedBalance >= 0 ? 'good' : 'bad'} />
              <SummaryMini label="Actual Balance" value={summary.actualBalance} tone={summary.actualBalance >= 0 ? 'good' : 'bad'} />
              <SummaryMini label="Variance" value={summary.balanceVariance} tone={summary.balanceVariance >= 0 ? 'good' : 'bad'} />
            </section>

            <section className="finance-no-print" style={isMobile
              ? { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '16px' }
              : { display: 'flex', gap: '8px', overflowX: 'auto', marginBottom: '16px', paddingBottom: '2px' }
            }>
              {tabItems.map(tab => {
                const Icon = tab.icon
                const active = activeTab === tab.id
                return (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={isMobile
                    ? {
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      border: `1px solid ${active ? 'rgba(20,184,166,0.45)' : t.border}`,
                      background: active ? 'rgba(20,184,166,0.13)' : t.bgCard,
                      color: active ? '#14b8a6' : t.textFaint,
                      fontSize: '9.5px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      textAlign: 'center',
                      lineHeight: 1.25,
                      minHeight: '52px',
                    }
                    : {
                      display: 'flex',
                      alignItems: 'center',
                      gap: '7px',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${active ? 'rgba(20,184,166,0.45)' : t.border}`,
                      background: active ? 'rgba(20,184,166,0.13)' : t.bgCard,
                      color: active ? '#14b8a6' : t.textFaint,
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }
                  }>
                    <Icon size={14} />{isMobile ? tab.mobileLabel : tab.label}
                  </button>
                )
              })}
            </section>

            {activeTab === 'budget' && (
              <BudgetSheet
                budgetItems={budgetItems}
                budgetForm={budgetForm}
                categories={categories}
                inputStyle={inputStyle}
                labelStyle={labelStyle}
                panelStyle={panelStyle}
                isMobile={isMobile}
                saving={saving}
                deletingId={deletingId}
                totals={budgetTotals}
                onFormChange={setBudgetForm}
                onSubmit={handleBudgetSubmit}
                onDelete={id => handleDelete('budget_item', id)}
                t={t}
              />
            )}

            {activeTab === 'actual' && (
              <ActualSheet
                transactions={transactions}
                transactionForm={transactionForm}
                categories={categories}
                paymentMethods={paymentMethods}
                inputStyle={inputStyle}
                labelStyle={labelStyle}
                panelStyle={panelStyle}
                isMobile={isMobile}
                saving={saving}
                uploadingReceipt={uploadingReceipt}
                deletingId={deletingId}
                totals={transactionTotals}
                onFormChange={setTransactionForm}
                onSubmit={handleTransactionSubmit}
                onReceiptUpload={handleReceiptUpload}
                onDelete={id => handleDelete('transaction', id)}
                t={t}
              />
            )}

            {activeTab === 'statement' && (
              <StatementSheet
                summary={summary}
                programme={selectedProgramme}
                budgetItems={budgetItems}
                transactions={transactions}
                panelStyle={panelStyle}
                isMobile={isMobile}
                onPrint={() => window.print()}
                t={t}
              />
            )}
          </>
        )}
      </main>

      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }}>
          <div style={{ ...panelStyle, width: '100%', maxWidth: '360px', padding: '20px', textAlign: 'center' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Trash size={18} color="#ef4444" />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '15px', color: t.text, fontWeight: 700 }}>Delete this record?</h3>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: t.textFaint }}>This action cannot be undone.</p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.bgInput, color: t.text, fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button onClick={confirmDeleteRecord} style={{ flex: 1, padding: '10px 12px', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TreasurerFinancePage() {
  return (
    <Suspense fallback={null}>
      <TreasurerFinanceContent />
    </Suspense>
  )
}

function SummaryMini({ label, value, tone }: { label: string; value: number; tone: 'good' | 'bad' }) {
  return (
    <div style={{ padding: '12px', borderRadius: '10px', background: tone === 'good' ? 'rgba(16,185,129,0.09)' : 'rgba(239,68,68,0.08)', border: `1px solid ${tone === 'good' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
      <p style={{ margin: 0, fontSize: '10px', color: tone === 'good' ? '#059669' : '#dc2626', fontWeight: 700 }}>{label}</p>
      <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: 800, color: tone === 'good' ? '#10b981' : '#ef4444', fontVariantNumeric: 'tabular-nums' }}>{formatRM(value)}</p>
    </div>
  )
}

function BudgetSheet(props: {
  budgetItems: BudgetItem[]
  budgetForm: typeof emptyBudgetForm
  categories: string[]
  inputStyle: React.CSSProperties
  labelStyle: React.CSSProperties
  panelStyle: React.CSSProperties
  isMobile: boolean
  saving: boolean
  deletingId: string
  totals: { income: number; expense: number }
  onFormChange: React.Dispatch<React.SetStateAction<typeof emptyBudgetForm>>
  onSubmit: (event: React.FormEvent) => void
  onDelete: (id: string) => void
  t: ThemeTokens
}) {
  const { budgetItems, budgetForm, categories, inputStyle, labelStyle, panelStyle, isMobile, saving, deletingId, totals, onFormChange, onSubmit, onDelete, t } = props
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '360px minmax(0, 1fr)', gap: '16px' }}>
      <form onSubmit={onSubmit} className="finance-no-print" style={{ ...panelStyle, padding: '18px', alignSelf: 'start' }}>
        <h2 style={{ margin: '0 0 14px', fontSize: '15px', color: t.text, display: 'flex', alignItems: 'center', gap: '8px' }}><CirclePlus size={15} color="#14b8a6" />BELANJAWAN</h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div>
            <label style={labelStyle}>Type</label>
            <select value={budgetForm.type} onChange={event => onFormChange(prev => ({ ...prev, type: event.target.value as FinanceType }))} style={inputStyle}>
              <option value="expense" style={optionStyle}>Expense</option>
              <option value="income" style={optionStyle}>Income</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={budgetForm.category} onChange={event => onFormChange(prev => ({ ...prev, category: event.target.value }))} style={inputStyle}>
              {categories.map(category => <option key={category} value={category} style={optionStyle}>{category}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Item</label>
            <input required value={budgetForm.item} onChange={event => onFormChange(prev => ({ ...prev, item: event.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Quantity</label>
              <input required type="number" min="0" step="0.01" value={budgetForm.quantity} onChange={event => onFormChange(prev => ({ ...prev, quantity: event.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Unit Amount</label>
              <input required type="number" min="0" step="0.01" value={budgetForm.unit_amount} onChange={event => onFormChange(prev => ({ ...prev, unit_amount: event.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={budgetForm.notes} onChange={event => onFormChange(prev => ({ ...prev, notes: event.target.value }))} style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }} />
          </div>
          <button disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', border: 'none', borderRadius: '8px', padding: '10px 12px', background: '#0f766e', color: 'white', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={14} />}Save Budget Item
          </button>
        </div>
      </form>
      <div style={panelStyle}>
        <SheetHeader title="BELANJAWAN" meta={`${totals.income} income items · ${totals.expense} expense items`} icon={FileSpreadsheet} t={t} />
        {isMobile ? (
          budgetItems.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: t.textFaint, fontSize: '13px' }}>No budget items yet.</div>
          ) : (
            <div>
              {budgetItems.map(item => (
                <div key={item.id} style={{ padding: '14px', borderBottom: `1px solid ${t.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <TypeBadge type={item.type} />
                        <span style={{ fontSize: '11px', color: t.textFaint }}>{item.category}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: t.text }}>{item.item}</p>
                    </div>
                    <DeleteButton loading={deletingId === item.id} onClick={() => onDelete(item.id)} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: t.textFaint }}>
                    <span>{normalizeMoney(item.quantity).toLocaleString('en-MY')} × {formatRM(item.unit_amount)}</span>
                    <span style={{ fontWeight: 700, color: t.text }}>{formatRM(normalizeMoney(item.quantity) * normalizeMoney(item.unit_amount))}</span>
                  </div>
                  {item.notes && <p style={{ margin: '6px 0 0', fontSize: '12px', color: t.textFaintest }}>{item.notes}</p>}
                </div>
              ))}
            </div>
          )
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '760px' }}>
              <thead>
                <tr>
                  {['Type', 'Category', 'Item', 'Qty', 'Unit', 'Total', 'Notes', ''].map(head => <th key={head} style={tableHead(t)}>{head}</th>)}
                </tr>
              </thead>
              <tbody>
                {budgetItems.length === 0 ? <EmptyRow colSpan={8} label="No budget items yet." t={t} /> : budgetItems.map(item => (
                  <tr key={item.id}>
                    <td style={tableCell(t)}><TypeBadge type={item.type} /></td>
                    <td style={tableCell(t)}>{item.category}</td>
                    <td style={tableCell(t)}>{item.item}</td>
                    <td style={tableCell(t)}>{normalizeMoney(item.quantity).toLocaleString('en-MY')}</td>
                    <td style={tableCell(t)}>{formatRM(item.unit_amount)}</td>
                    <td style={{ ...tableCell(t), fontWeight: 700 }}>{formatRM(normalizeMoney(item.quantity) * normalizeMoney(item.unit_amount))}</td>
                    <td style={tableCell(t)}>{item.notes || '-'}</td>
                    <td style={tableCell(t)}>
                      <DeleteButton loading={deletingId === item.id} onClick={() => onDelete(item.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function ActualSheet(props: {
  transactions: FinanceTransaction[]
  transactionForm: typeof emptyTransactionForm
  categories: string[]
  paymentMethods: string[]
  inputStyle: React.CSSProperties
  labelStyle: React.CSSProperties
  panelStyle: React.CSSProperties
  isMobile: boolean
  saving: boolean
  uploadingReceipt: boolean
  deletingId: string
  totals: { income: number; expense: number }
  onFormChange: React.Dispatch<React.SetStateAction<typeof emptyTransactionForm>>
  onSubmit: (event: React.FormEvent) => void
  onReceiptUpload: (file: File) => void
  onDelete: (id: string) => void
  t: ThemeTokens
}) {
  const { transactions, transactionForm, categories, paymentMethods, inputStyle, labelStyle, panelStyle, isMobile, saving, uploadingReceipt, deletingId, totals, onFormChange, onSubmit, onReceiptUpload, onDelete, t } = props
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '360px minmax(0, 1fr)', gap: '16px' }}>
      <form onSubmit={onSubmit} className="finance-no-print" style={{ ...panelStyle, padding: '18px', alignSelf: 'start' }}>
        <h2 style={{ margin: '0 0 14px', fontSize: '15px', color: t.text, display: 'flex', alignItems: 'center', gap: '8px' }}><ReceiptText size={15} color="#14b8a6" />MAKLUMAT BELANJA SEBENAR</h2>
        <div style={{ display: 'grid', gap: '12px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Type</label>
              <select value={transactionForm.type} onChange={event => onFormChange(prev => ({ ...prev, type: event.target.value as FinanceType }))} style={inputStyle}>
                <option value="expense" style={optionStyle}>Expense</option>
                <option value="income" style={optionStyle}>Income</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Date</label>
              <input required type="date" value={transactionForm.transaction_date} onChange={event => onFormChange(prev => ({ ...prev, transaction_date: event.target.value }))} style={inputStyle} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={transactionForm.category} onChange={event => onFormChange(prev => ({ ...prev, category: event.target.value }))} style={inputStyle}>
              {categories.map(category => <option key={category} value={category} style={optionStyle}>{category}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Description</label>
            <input required value={transactionForm.description} onChange={event => onFormChange(prev => ({ ...prev, description: event.target.value }))} style={inputStyle} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Amount</label>
              <input required type="number" min="0.01" step="0.01" value={transactionForm.amount} onChange={event => onFormChange(prev => ({ ...prev, amount: event.target.value }))} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Payment</label>
              <select value={transactionForm.payment_method} onChange={event => onFormChange(prev => ({ ...prev, payment_method: event.target.value }))} style={inputStyle}>
                {paymentMethods.map(method => <option key={method} value={method} style={optionStyle}>{method}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Receipt</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px', border: `1px solid ${t.borderInput}`, background: t.bgInput, color: t.text, borderRadius: '8px', padding: '9px 11px', fontSize: '12px', fontWeight: 600, cursor: uploadingReceipt ? 'not-allowed' : 'pointer', opacity: uploadingReceipt ? 0.7 : 1 }}>
                {uploadingReceipt ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Paperclip size={13} />}
                {uploadingReceipt ? 'Uploading...' : 'Upload File'}
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  disabled={uploadingReceipt}
                  onChange={event => {
                    const file = event.target.files?.[0]
                    if (file) onReceiptUpload(file)
                    event.target.value = ''
                  }}
                  style={{ display: 'none' }}
                />
              </label>
              {transactionForm.receipt_url && (
                <a href={transactionForm.receipt_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#14b8a6', fontWeight: 600 }}>View receipt</a>
              )}
            </div>
            <input value={transactionForm.receipt_url} onChange={event => onFormChange(prev => ({ ...prev, receipt_url: event.target.value }))} placeholder="Or paste a receipt URL" style={{ ...inputStyle, marginTop: '8px' }} />
          </div>
          <div>
            <label style={labelStyle}>Remarks</label>
            <textarea value={transactionForm.remarks} onChange={event => onFormChange(prev => ({ ...prev, remarks: event.target.value }))} style={{ ...inputStyle, minHeight: '72px', resize: 'vertical' }} />
          </div>
          <button disabled={saving} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', border: 'none', borderRadius: '8px', padding: '10px 12px', background: '#0f766e', color: 'white', fontSize: '13px', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? <Loader2 size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Save size={14} />}Save Actual Record
          </button>
        </div>
      </form>
      <div style={panelStyle}>
        <SheetHeader title="MAKLUMAT BELANJA SEBENAR" meta={`${totals.income} income records · ${totals.expense} expense records`} icon={ReceiptText} t={t} />
        {isMobile ? (
          transactions.length === 0 ? (
            <div style={{ padding: '30px', textAlign: 'center', color: t.textFaint, fontSize: '13px' }}>No actual finance records yet.</div>
          ) : (
            <div>
              {transactions.map(item => (
                <div key={item.id} style={{ padding: '14px', borderBottom: `1px solid ${t.border}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                        <TypeBadge type={item.type} />
                        <span style={{ fontSize: '11px', color: t.textFaint }}>{formatDate(item.transaction_date)}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: t.text }}>{item.description}</p>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: t.textFaint }}>{item.category}</p>
                    </div>
                    <DeleteButton loading={deletingId === item.id} onClick={() => onDelete(item.id)} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: t.textFaint }}>
                    <span>{item.payment_method || '-'}</span>
                    <span style={{ fontWeight: 700, color: t.text }}>{formatRM(item.amount)}</span>
                  </div>
                  {item.receipt_url && (
                    <a href={item.receipt_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: '6px', fontSize: '12px', color: '#14b8a6' }}>View Receipt</a>
                  )}
                  {item.remarks && <p style={{ margin: '6px 0 0', fontSize: '12px', color: t.textFaintest }}>{item.remarks}</p>}
                </div>
              ))}
            </div>
          )
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
              <thead>
                <tr>
                  {['Date', 'Type', 'Category', 'Description', 'Amount', 'Payment', 'Receipt', 'Remarks', ''].map(head => <th key={head} style={tableHead(t)}>{head}</th>)}
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? <EmptyRow colSpan={9} label="No actual finance records yet." t={t} /> : transactions.map(item => (
                  <tr key={item.id}>
                    <td style={tableCell(t)}>{formatDate(item.transaction_date)}</td>
                    <td style={tableCell(t)}><TypeBadge type={item.type} /></td>
                    <td style={tableCell(t)}>{item.category}</td>
                    <td style={tableCell(t)}>{item.description}</td>
                    <td style={{ ...tableCell(t), fontWeight: 700 }}>{formatRM(item.amount)}</td>
                    <td style={tableCell(t)}>{item.payment_method || '-'}</td>
                    <td style={tableCell(t)}>{item.receipt_url ? <a href={item.receipt_url} target="_blank" rel="noreferrer" style={{ color: '#14b8a6' }}>Open</a> : '-'}</td>
                    <td style={tableCell(t)}>{item.remarks || '-'}</td>
                    <td style={tableCell(t)}>
                      <DeleteButton loading={deletingId === item.id} onClick={() => onDelete(item.id)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatementSheet(props: {
  summary: FinanceSummary
  programme: ProgrammeOption | null
  budgetItems: BudgetItem[]
  transactions: FinanceTransaction[]
  panelStyle: React.CSSProperties
  isMobile: boolean
  onPrint: () => void
  t: ThemeTokens
}) {
  const { summary, programme, budgetItems, transactions, panelStyle, isMobile, onPrint, t } = props
  const rows = [
    { label: 'Income', planned: summary.plannedIncome, actual: summary.actualIncome, variance: summary.incomeVariance },
    { label: 'Expenses', planned: summary.plannedExpense, actual: summary.actualExpense, variance: summary.expenseVariance },
    { label: 'Balance', planned: summary.plannedBalance, actual: summary.actualBalance, variance: summary.balanceVariance },
  ]

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ ...panelStyle, padding: isMobile ? '18px' : '22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: t.text }}>PENYATA</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: t.textFaint }}>{programme?.name ?? '-'}</p>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: t.textFaintest }}>{formatDate(programme?.start_date)} - {formatDate(programme?.end_date)}</p>
          </div>
          <button className="finance-no-print" onClick={onPrint} style={{ display: 'flex', alignItems: 'center', gap: '7px', border: `1px solid ${t.border}`, borderRadius: '8px', padding: '9px 12px', background: t.bgInput, color: t.text, fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
            <FileSpreadsheet size={14} />Print
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: '12px', marginBottom: '18px' }}>
          <StatementCard label="Planned Balance" value={summary.plannedBalance} />
          <StatementCard label="Actual Balance" value={summary.actualBalance} />
          <StatementCard label="Balance Variance" value={summary.balanceVariance} />
        </div>
        {isMobile ? (
          <div style={{ display: 'grid', gap: '10px' }}>
            {rows.map(row => (
              <div key={row.label} style={{ border: `1px solid ${t.border}`, borderRadius: '10px', padding: '12px' }}>
                <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: 700, color: t.text }}>{row.label}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: t.textFaint, marginBottom: '4px' }}>
                  <span>Belanjawan</span><span style={{ color: t.text }}>{formatRM(row.planned)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: t.textFaint, marginBottom: '4px' }}>
                  <span>Belanja Sebenar</span><span style={{ color: t.text }}>{formatRM(row.actual)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: t.textFaint }}>
                  <span>Variance</span><span style={{ fontWeight: 800, color: row.variance >= 0 ? '#10b981' : '#ef4444' }}>{formatRM(row.variance)}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px' }}>
              <thead>
                <tr>
                  {['Section', 'Belanjawan', 'Belanja Sebenar', 'Variance'].map(head => <th key={head} style={tableHead(t)}>{head}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.label}>
                    <td style={{ ...tableCell(t), fontWeight: 700 }}>{row.label}</td>
                    <td style={tableCell(t)}>{formatRM(row.planned)}</td>
                    <td style={tableCell(t)}>{formatRM(row.actual)}</td>
                    <td style={{ ...tableCell(t), color: row.variance >= 0 ? '#10b981' : '#ef4444', fontWeight: 800 }}>{formatRM(row.variance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="finance-no-print" style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
        <div style={{ ...panelStyle, padding: '16px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '14px', color: t.text }}>Budget Records</h3>
          <p style={{ margin: 0, color: t.textFaint, fontSize: '13px' }}>{budgetItems.length} planned budget items are included in this statement.</p>
        </div>
        <div style={{ ...panelStyle, padding: '16px' }}>
          <h3 style={{ margin: '0 0 10px', fontSize: '14px', color: t.text }}>Actual Records</h3>
          <p style={{ margin: 0, color: t.textFaint, fontSize: '13px' }}>{transactions.length} actual finance records are included in this statement.</p>
        </div>
      </div>
    </div>
  )
}

function SheetHeader({ title, meta, icon: Icon, t }: { title: string; meta: string; icon: React.ElementType; t: ThemeTokens }) {
  return (
    <div style={{ padding: '16px 18px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: '15px', color: t.text, display: 'flex', alignItems: 'center', gap: '8px' }}><Icon size={15} color="#14b8a6" />{title}</h2>
        <p style={{ margin: '3px 0 0', fontSize: '12px', color: t.textFaint }}>{meta}</p>
      </div>
    </div>
  )
}

function StatementCard({ label, value }: { label: string; value: number }) {
  const good = value >= 0
  return (
    <div style={{ borderRadius: '10px', border: `1px solid ${good ? 'rgba(16,185,129,0.22)' : 'rgba(239,68,68,0.22)'}`, background: good ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', padding: '14px' }}>
      <p style={{ margin: 0, fontSize: '11px', color: good ? '#059669' : '#dc2626', fontWeight: 700 }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: '20px', fontWeight: 800, color: good ? '#10b981' : '#ef4444', fontVariantNumeric: 'tabular-nums' }}>{formatRM(value)}</p>
    </div>
  )
}

function DeleteButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button className="finance-no-print" onClick={onClick} disabled={loading} title="Delete" style={{ width: '30px', height: '30px', borderRadius: '7px', border: '1px solid rgba(239,68,68,0.22)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', cursor: loading ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      {loading ? <Loader2 size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Trash size={13} />}
    </button>
  )
}

function EmptyRow({ colSpan, label, t }: { colSpan: number; label: string; t: ThemeTokens }) {
  return (
    <tr>
      <td colSpan={colSpan} style={{ padding: '30px', textAlign: 'center', color: t.textFaint, fontSize: '13px' }}>{label}</td>
    </tr>
  )
}

function tableHead(t: ThemeTokens): React.CSSProperties {
  return {
    textAlign: 'left',
    padding: '8px 9px',
    borderBottom: `1px solid ${t.border}`,
    color: t.textFaint,
    fontSize: '11px',
    fontWeight: 700,
    background: t.bgCardAlt,
    whiteSpace: 'nowrap',
  }
}

function tableCell(t: ThemeTokens): React.CSSProperties {
  return {
    padding: '9px 9px',
    borderBottom: `1px solid ${t.border}`,
    color: t.text,
    fontSize: '12px',
    verticalAlign: 'top',
  }
}
