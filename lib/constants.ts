import { Phase } from '@/lib/types'

export const PHASES: { id: Phase; label: string; color: string; activeBg: string; activeBorder: string }[] = [
  { id: 'pre',    label: 'Pre',    color: '#60a5fa', activeBg: 'rgba(96,165,250,0.15)',  activeBorder: 'rgba(96,165,250,0.4)'  },
  { id: 'during', label: 'During', color: '#34d399', activeBg: 'rgba(52,211,153,0.15)',  activeBorder: 'rgba(52,211,153,0.4)'  },
  { id: 'post',   label: 'Post',   color: '#a78bfa', activeBg: 'rgba(167,139,250,0.15)', activeBorder: 'rgba(167,139,250,0.4)' },
]

export const PRE_CHECKLIST = [
  { key: 'paperwork', label: 'Paperwork',   hint: 'e.g. approval forms, permission letters' },
  { key: 'oshe',      label: 'OSHE HIRARC', hint: 'Hazard identification & risk assessment' },
  { key: 'poster',    label: 'Poster',      hint: 'Event poster or promotional material' },
]

export const POST_CHECKLIST = [
  { key: 'program_report',   label: 'Program Report',   hint: 'Overall summary and outcomes of the programme' },
  { key: 'financial_report', label: 'Financial Report', hint: 'Budget breakdown and expenditure record' },
  { key: 'survey_report',    label: 'Survey Report',    hint: 'Participant feedback and survey results' },
]

export const COMMITTEE_ROLES = [
  'Vice Director - Management',
  'Vice Director - Activity',
  'Secretary',
  'Vice Secretary',
  'Treasurer',
  'Vice Treasurer',
  'Logistics',
  'Publicity',
  'Welfare',
  'Member',
]

export const SINGLE_ROLE_LIMIT = [
  'Vice Director - Management',
  'Vice Director - Activity',
  'Secretary',
  'Vice Secretary',
  'Treasurer',
  'Vice Treasurer',
]
