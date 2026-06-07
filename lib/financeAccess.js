export const APP_FINANCE_ROLES = ['admin', 'superadmin', 'treasurer']
export const PROGRAMME_FINANCE_ROLES = ['Treasurer', 'Vice Treasurer']

export function isAppFinanceRole(role) {
  return APP_FINANCE_ROLES.includes(String(role ?? '').toLowerCase())
}

export function isProgrammeFinanceRole(role) {
  return PROGRAMME_FINANCE_ROLES.includes(String(role ?? ''))
}

export function canUseProgrammeFinance({ appRole, programmeRole } = {}) {
  return isAppFinanceRole(appRole) || isProgrammeFinanceRole(programmeRole)
}
