export const FINANCE_TYPES = ['income', 'expense']

export const BUDGET_CATEGORIES = [
  'Registration Fees',
  'Sponsorship',
  'Food & Beverage',
  'Venue',
  'Printing',
  'Transport',
  'Equipment',
  'Programme Materials',
  'Miscellaneous',
]

export const PAYMENT_METHODS = [
  'Cash',
  'Online Transfer',
  'Card',
  'E-Wallet',
  'Cheque',
  'Other',
]

function toMoney(value) {
  const number = Number(value)
  if (!Number.isFinite(number)) return 0
  return Math.round(number * 100) / 100
}

export function getBudgetItemTotal(item) {
  return toMoney(toMoney(item?.quantity) * toMoney(item?.unit_amount))
}

export function calculateFinanceSummary(budgetItems = [], transactions = []) {
  const plannedIncome = budgetItems
    .filter(item => item?.type === 'income')
    .reduce((sum, item) => sum + getBudgetItemTotal(item), 0)

  const plannedExpense = budgetItems
    .filter(item => item?.type === 'expense')
    .reduce((sum, item) => sum + getBudgetItemTotal(item), 0)

  const actualIncome = transactions
    .filter(item => item?.type === 'income')
    .reduce((sum, item) => sum + toMoney(item?.amount), 0)

  const actualExpense = transactions
    .filter(item => item?.type === 'expense')
    .reduce((sum, item) => sum + toMoney(item?.amount), 0)

  const plannedBalance = toMoney(plannedIncome - plannedExpense)
  const actualBalance = toMoney(actualIncome - actualExpense)

  return {
    plannedIncome: toMoney(plannedIncome),
    plannedExpense: toMoney(plannedExpense),
    plannedBalance,
    actualIncome: toMoney(actualIncome),
    actualExpense: toMoney(actualExpense),
    actualBalance,
    incomeVariance: toMoney(actualIncome - plannedIncome),
    expenseVariance: toMoney(actualExpense - plannedExpense),
    balanceVariance: toMoney(actualBalance - plannedBalance),
  }
}

export function formatRM(value) {
  const amount = toMoney(value)
  const prefix = amount < 0 ? '-RM' : 'RM'
  return `${prefix} ${Math.abs(amount).toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}
