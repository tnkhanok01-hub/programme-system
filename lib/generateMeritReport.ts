import jsPDF from 'jspdf'

export type MeritReportStudent = {
  name: string
  email: string | null
  matric: string | null
}

export type MeritReportActivity = {
  id?: string
  points: number | string | null
  role: string | null
  source_type: string | null
  activity_pillar: string | null
  programme_level: string | null
  reason: string | null
  created_at?: string | null
  updated_at?: string | null
  programmes?: { name: string | null } | null
}

type GenerateMeritReportInput = {
  student: MeritReportStudent
  activities: MeritReportActivity[]
  totalMerit: number
}

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url)
    const blob = await response.blob()
    return await new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  return new Date(value).toLocaleDateString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function safeFilePart(value: string) {
  return value
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
}

export async function generateMeritReportPdf({
  student,
  activities,
  totalMerit,
}: GenerateMeritReportInput): Promise<void> {
  const bg = await loadImageDataUrl('/approvalTemplate/UTM_letterhead_bg.jpeg')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageWidth = 210
  const pageHeight = 297
  const marginLeft = 20
  const marginRight = 190
  const contentWidth = marginRight - marginLeft
  const bottom = 270
  const rowLineHeight = 4.4
  let page = 0
  let y = 0

  function startPage() {
    if (page > 0) doc.addPage()
    page += 1
    if (bg) doc.addImage(bg, 'JPEG', 0, 0, pageWidth, pageHeight)
    y = page === 1 ? 58 : 28
  }

  function setText(size: number, style: 'normal' | 'bold' = 'normal') {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
    doc.setTextColor(20, 28, 45)
  }

  function ensureSpace(needed: number) {
    if (y + needed <= bottom) return
    startPage()
    drawTableHeader()
  }

  function drawTableHeader() {
    setText(8, 'bold')
    doc.setFillColor(239, 246, 255)
    doc.setDrawColor(191, 219, 254)
    doc.rect(marginLeft, y, contentWidth, 9, 'FD')
    doc.text('No.', marginLeft + 2, y + 6)
    doc.text('Programme / Activity', marginLeft + 13, y + 6)
    doc.text('Position', marginLeft + 91, y + 6)
    doc.text('Date', marginLeft + 128, y + 6)
    doc.text('Merit', marginLeft + 154, y + 6)
    y += 9
  }

  startPage()

  setText(14, 'bold')
  doc.text('Student Merit Activity Report', marginLeft, y)
  y += 8

  setText(9)
  doc.text(`Generated: ${formatDate(new Date().toISOString())}`, marginLeft, y)
  y += 10

  setText(10, 'bold')
  doc.text(student.name || 'Student', marginLeft, y)
  y += 5

  setText(9)
  doc.text(`Matric Number: ${student.matric ?? 'N/A'}`, marginLeft, y)
  y += 5
  doc.text(`Email: ${student.email ?? 'N/A'}`, marginLeft, y)
  y += 10

  doc.setFillColor(240, 253, 244)
  doc.setDrawColor(187, 247, 208)
  doc.roundedRect(marginLeft, y, contentWidth, 17, 2, 2, 'FD')
  setText(8, 'bold')
  doc.text('TOTAL OFFICIAL MERIT', marginLeft + 5, y + 6)
  setText(16, 'bold')
  doc.text(`${totalMerit} points`, marginLeft + 5, y + 14)
  setText(8)
  doc.text(`${activities.length} activity record${activities.length === 1 ? '' : 's'}`, marginRight - 45, y + 14)
  y += 26

  setText(11, 'bold')
  doc.text('Activity Details', marginLeft, y)
  y += 7
  drawTableHeader()

  if (activities.length === 0) {
    setText(9)
    doc.text('No merit activity records are available.', marginLeft + 2, y + 8)
    y += 12
  }

  activities.forEach((activity, index) => {
    const programmeName = activity.programmes?.name ?? 'Unknown Programme'
    const position = activity.role ?? activity.source_type ?? 'Participant'
    const date = formatDate(activity.created_at ?? activity.updated_at)
    const points = Number(activity.points || 0)
    const programmeLines = doc.splitTextToSize(programmeName, 74)
    const positionLines = doc.splitTextToSize(position, 31)
    const metaLine = [
      activity.activity_pillar,
      activity.programme_level,
    ].filter(Boolean).join(' / ')
    const rowHeight = Math.max(programmeLines.length, positionLines.length, 1) * rowLineHeight + (metaLine ? 7 : 4)

    ensureSpace(rowHeight)

    doc.setDrawColor(226, 232, 240)
    doc.line(marginLeft, y, marginRight, y)

    setText(8)
    doc.text(String(index + 1), marginLeft + 2, y + 5)
    doc.text(programmeLines, marginLeft + 13, y + 5)
    doc.text(positionLines, marginLeft + 91, y + 5)
    doc.text(date, marginLeft + 128, y + 5)

    setText(9, 'bold')
    doc.text(`${points > 0 ? '+' : ''}${points}`, marginLeft + 154, y + 5)

    if (metaLine) {
      setText(7)
      doc.setTextColor(71, 85, 105)
      doc.text(metaLine, marginLeft + 13, y + rowHeight - 3)
    }

    y += rowHeight
  })

  ensureSpace(22)
  y += 5
  doc.setDrawColor(148, 163, 184)
  doc.line(marginLeft, y, marginRight, y)
  y += 7
  setText(8)
  doc.text('This report is generated from official UTM-SPMS merit transaction records.', marginLeft, y)
  y += 5
  doc.text('It lists programme activities, positions, and merit points recorded for the student profile.', marginLeft, y)

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i)
    setText(8)
    doc.setTextColor(100, 116, 139)
    doc.text(`Page ${i} of ${pageCount}`, marginRight - 24, 285)
  }

  const safeName = safeFilePart(student.name || 'student')
  doc.save(`utm-merit-report-${safeName}.pdf`)
}
