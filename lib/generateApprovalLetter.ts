import jsPDF from 'jspdf'

// ── Malay date helpers ────────────────────────────────────────────────────────

const MALAY_MONTHS = [
  'Januari', 'Februari', 'Mac', 'April', 'Mei', 'Jun',
  'Julai', 'Ogos', 'September', 'Oktober', 'November', 'Disember',
]
const MALAY_DAYS = ['Ahad', 'Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu']

function formatMalayDate(dateStr: string, includeDay = false): string {
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = MALAY_MONTHS[d.getMonth()]
  const year = d.getFullYear()
  if (includeDay) return `${day} ${month} ${year} (${MALAY_DAYS[d.getDay()]})`
  return `${day} ${month} ${year}`
}

// ── Number to Malay words ─────────────────────────────────────────────────────

const ONES = [
  '', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Lapan', 'Sembilan',
  'Sepuluh', 'Sebelas', 'Dua Belas', 'Tiga Belas', 'Empat Belas', 'Lima Belas',
  'Enam Belas', 'Tujuh Belas', 'Lapan Belas', 'Sembilan Belas',
]
const TENS = [
  '', '', 'Dua Puluh', 'Tiga Puluh', 'Empat Puluh', 'Lima Puluh',
  'Enam Puluh', 'Tujuh Puluh', 'Lapan Puluh', 'Sembilan Puluh',
]

function toWords(n: number): string {
  if (n <= 0) return ''
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')
  if (n < 1000) {
    const h = Math.floor(n / 100)
    const rem = n % 100
    return (h === 1 ? 'Seratus' : ONES[h] + ' Ratus') + (rem ? ' ' + toWords(rem) : '')
  }
  if (n < 1000000) {
    const t = Math.floor(n / 1000)
    const rem = n % 1000
    return (t === 1 ? 'Seribu' : toWords(t) + ' Ribu') + (rem ? ' ' + toWords(rem) : '')
  }
  const m = Math.floor(n / 1000000)
  const rem = n % 1000000
  return toWords(m) + ' Juta' + (rem ? ' ' + toWords(rem) : '')
}

function budgetLabel(amount: number): string {
  const whole = Math.floor(amount)
  const cents = Math.round((amount - whole) * 100)
  let words = toWords(whole) + ' Ringgit'
  if (cents > 0) words += ` Dan ${toWords(cents)} Sen`
  return `RM${amount.toFixed(2)} (${words} Sahaja)`
}

// ── Static conditions (i – xix) ───────────────────────────────────────────────
// Condition ix is dynamic (budget). Pass null to mark it as a placeholder.

const CONDITIONS_STATIC: (string | null)[] = [
  // i
  'Pelaksanaan aktiviti yang melibatkan organisasi luar Universiti dan dalam kampus serta melibatkan kutipan kewangan/penajaan hendaklah terlebih dahulu mendapat kelulusan bertulis daripada Pro-Naib Canselor UTM Kuala Lumpur atau Timbalan Naib Canselor (Hal Ehwal Pelajar);',
  // ii
  'Laporan Aktiviti Mahasiswa hendaklah dikemukakan ke pejabat ini dalam tempoh 10 (sepuluh) hari bekerja selepas aktiviti berakhir dengan menggunakan format yang telah disediakan oleh Pejabat Hal Ehwal Pelajar;',
  // iii
  'Sila lampirkan gambar-gambar program, senarai nama Peserta dan Sekretariat Program beserta no.k/pengenalan dalam bentuk softcopy dan hardcopy bersama-sama Laporan Program;',
  // iv
  'Pembatalan dan perubahan tarikh aktiviti hendaklah dimaklumkan ke pejabat ini untuk kelulusan SEBELUM tarikh sebenar program akan diadakan;',
  // v
  'Pelaksanaan aktiviti secara Ad-Hoc, pihak Sekretariat Program hendaklah mengemukakan kertas kerja permohonan ke Pejabat Hal Ehwal Pelajar untuk pertimbangan kelulusan;',
  // vi
  'Penglibatan Sekretariat Program bagi sesuatu program hendaklah terdiri daripada Berbilang Kaum kecuali Persatuan Agama;',
  // vii
  'Penganjur TIDAK dibenarkan menampal sebarang bahan promosi/iklan bercetak di mana-mana dinding bangunan di dalam kampus kecuali papan-papan kenyataan yang telah disediakan oleh Universiti. Penggantungan kain rentang dan bunting hendaklah mendapat permit dari Pejabat Hal Ehwal Korporat terlebih dahulu;',
  // viii
  'Peruntukan yang telah diluluskan untuk sesuatu aktiviti tidak boleh dipindahkan/dikumpulkan bagi menjalankan program yang lain;',
  // ix — dynamic, filled at render time
  null,
  // x
  'Setelah peruntukan diluluskan, saudara/saudari dikehendaki menurunkan tandatangan pada Baucer Pengeluaran Cek yang telah disediakan;',
  // xi
  'Saudara/saudari dikehendaki menghantar Laporan Kewangan (Penuh) dan semua resit perbelanjaan dalam tempoh 10 (sepuluh) hari bekerja selepas aktiviti berakhir;',
  // xii
  'Sekiranya gagal mengemukakan resit-resit dalam tempoh yang ditetapkan, mahasiswa akan dikenakan tindakan TEGAS. Jika disabitkan kesalahan, mahasiswa akan ditafsirkan sebagai STATUS BERHUTANG kepada Universiti;',
  // xiii
  'Mahasiswa dilarang meminda resit perbelanjaan. Jika disabitkan kesalahan, mahasiswa akan dikenakan tindakan tatatertib yang BERAT di bawah Kaedah-kaedah Tatatertib Mahasiswa UTM (1992);',
  // xiv
  'Semua perbelanjaan hendaklah mengikut perancangan sepertimana yang terdapat dalam kertas kerja yang diluluskan;',
  // xv
  'Segala Perbelanjaan Perolehan hendaklah mengikut Pekeliling Bendahari Bil.2/2000 (Aturcara Perolehan Universiti) bertarikh 15 Mei 2000 [UTM.03/10.12/3 Jld. 2 (6)];',
  // xvi
  'Kos bagi T-shirt program (jika ada) hendaklah ditanggung di bawah peruntukan penganjur dan bukan di bawah peruntukan yang telah diberikan oleh Pejabat Hal Ehwal Pelajar;',
  // xvii
  'Semua aktiviti sukan, rekreasi dan aktiviti berisiko tinggi HENDAKLAH terlebih dahulu mendapatkan kebenaran bertulis dari Pusat Kecemerlangan Sukan dan Pejabat OSHE UTM Kuala Lumpur;',
  // xviii
  'Semua aktiviti yang dibuat di luar kampus hendaklah mematuhi Pekeliling Pentadbiran bil. 29/2016 (Pematuhan Aspek Keselamatan Dan Kesihatan Pekerjaan Bagi Semua Program Rasmi UTM) dan wajib disertai oleh seorang Pegawai Pengiring. Tuntutan perjalanan pengiring adalah tertakluk di bawah peruntukan PTJ pegawai pengiring atau dana program;',
  // xix
  'Sebarang aktiviti yang bercorak keagamaan (Islam) yang melibatkan penceramah luar hendaklah mendapatkan konsultasi daripada Pusat Islam UTM.',
]

const ROMAN = [
  'i','ii','iii','iv','v','vi','vii','viii','ix','x',
  'xi','xii','xiii','xiv','xv','xvi','xvii','xviii','xix',
]

// ── Image loader ──────────────────────────────────────────────────────────────

async function loadImageDataUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url)
    const blob = await r.blob()
    return await new Promise((resolve) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as string)
      fr.readAsDataURL(blob)
    })
  } catch {
    return null
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

interface ProgrammeData {
  id: string
  name: string
  organiser: string
  venue: string
  budget: number
  start_date: string
  end_date: string
  approved_at?: string | null
  approved_by_admin_name?: string | null
}

// Deterministic 2-digit sequence number from programme UUID
function programmeSeq(id: string): string {
  let h = 7
  for (const c of id) h = ((h * 31) + c.charCodeAt(0)) >>> 0
  return String((h % 99) + 1).padStart(2, '0')
}

interface DirectorData {
  full_name: string
  matric_number: string
}

export async function generateApprovalLetter(
  programme: ProgrammeData,
  directorInfo: DirectorData | null,
): Promise<void> {
  const bg = await loadImageDataUrl('/approvalTemplate/UTM_letterhead_bg.jpeg')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // ── Layout constants ────────────────────────────────────────────────────────
  const PW = 210       // page width
  const PH = 297       // page height
  const ML = 25        // left margin
  const MR = 185       // right margin  (PW - 25)
  const CW = MR - ML  // content width = 160
  const BOT = 268      // bottom boundary before footer
  const LH = 5.2       // standard line height (mm)
  const LH_SM = 4.8    // tighter line height for wrapped paragraphs

  let y = 0
  let pageNum = 0

  // ── Page management ─────────────────────────────────────────────────────────

  function startPage() {
    if (pageNum > 0) doc.addPage()
    pageNum++
    if (bg && pageNum === 1) doc.addImage(bg, 'JPEG', 0, 0, PW, PH)
    y = pageNum === 1 ? 55 : 24
  }

  function guard(needed: number) {
    if (y + needed > BOT) startPage()
  }

  // ── Text helpers ─────────────────────────────────────────────────────────────

  function setStyle(size: number, style: 'normal' | 'bold' | 'italic' = 'normal') {
    doc.setFont('helvetica', style)
    doc.setFontSize(size)
  }

  // Write a single line and advance y
  function line(text: string, x: number, size = 10, bold = false) {
    setStyle(size, bold ? 'bold' : 'normal')
    doc.text(text, x, y)
    y += LH
  }

  // Write wrapped text block and advance y; returns final y
  function block(
    text: string,
    x: number,
    maxW: number,
    size = 10,
    bold = false,
    lh = LH_SM,
  ) {
    setStyle(size, bold ? 'bold' : 'normal')
    const lines = doc.splitTextToSize(text, maxW)
    for (const l of lines) {
      guard(lh + 2)
      doc.text(l, x, y)
      y += lh
    }
  }

  function gap(mm = LH) { y += mm }

  // ── Begin document ───────────────────────────────────────────────────────────

  startPage()

  // Reference / Date block — right-side, colons vertically aligned
  const refLabelX = 128  // where labels start
  const refColonX = 146  // where ":" sits (aligned for both rows)
  const refValueX = 149  // where values start

  const approvalDate = programme.approved_at ? new Date(programme.approved_at) : new Date()
  const approvalDay = String(approvalDate.getDate()).padStart(2, '0')
  const approvalMonth = MALAY_MONTHS[approvalDate.getMonth()]
  const approvalYear = approvalDate.getFullYear()
  const seq = programmeSeq(programme.id)

  y = 50
  setStyle(10)
  doc.text('Ruj. Kami', refLabelX, y)
  doc.text(':', refColonX, y)
  doc.text(`UTM.K.06.01/13.16/11 (${seq})`, refValueX, y)
  y += LH
  doc.text('Tarikh', refLabelX, y)
  doc.text(':', refColonX, y)
  doc.text(`${approvalDay} ${approvalMonth} ${approvalYear}`, refValueX, y)

  gap(LH * 2.5)

  // ── Recipient block ──────────────────────────────────────────────────────────

  y = Math.max(y, 50)
  setStyle(10, 'bold')
  doc.text(`Saudara/i ${directorInfo?.full_name ?? ''}`, ML, y)
  y += LH
  setStyle(10)
  doc.text('Pengarah Program', ML, y);         y += LH
  const organiserLines = doc.splitTextToSize(programme.organiser ?? 'Jawatankuasa Kolej Mahasiswa Pelajar Kolej Siswa Jaya (JKM KSJ)', CW)
  for (const l of organiserLines) { doc.text(l, ML, y); y += LH }
  doc.text('UTM Kuala Lumpur', ML, y)

  gap(LH * 2)

  // Salutation
  line('Saudara/i,', ML)
  gap(LH * 1.5)

  // ── Subject ──────────────────────────────────────────────────────────────────

  const subject =
    `KELULUSAN PENGANJURAN PROGRAM ${programme.name.toUpperCase()} ` +
    `ANJURAN ${(programme.organiser ?? 'JAWATANKUASA KOLEJ MAHASISWA PELAJAR KOLEJ SISWA JAYA (JKM KSJ)').toUpperCase()}`

  block(subject, ML, CW, 10, true, LH)
  gap(LH * 1.5)

  // ── Para 1 ───────────────────────────────────────────────────────────────────

  setStyle(10)
  doc.text('Dengan segala hormatnya perkara di atas adalah dirujuk.', ML, y)
  gap(LH * 2)

  // ── Para 2 ───────────────────────────────────────────────────────────────────

  const INDENT_PARA = 14  // indent after paragraph number
  guard(LH * 4)
  setStyle(10)
  doc.text('2.', ML, y)
  const para2 =
    'sukacita dimaklumkan bahawa permohonan pihak saudara untuk menganjurkan program ' +
    'tersebut adalah diluluskan. Butiran program adalah seperti yang berikut.'
  block(para2, ML + INDENT_PARA, CW - INDENT_PARA, 10, false, LH_SM)
  gap(LH)

  // ── Programme details table ───────────────────────────────────────────────────

  const TBL_X = ML + 8       // table indent
  const TBL_COLON_X = TBL_X + 30
  const TBL_VAL_X = TBL_COLON_X + 4
  const TBL_VAL_W = MR - TBL_VAL_X

  const startDateStr = formatMalayDate(programme.start_date, true)
  const endDateStr   = formatMalayDate(programme.end_date, true)
  const dateDisplay  = programme.start_date === programme.end_date
    ? startDateStr
    : `${startDateStr} - ${endDateStr}`

  const tableRows: [string, string][] = [
    ['Tarikh',      dateDisplay],
    ['Tempat',      programme.venue],
    ['Peruntukan',  budgetLabel(programme.budget)],
  ]

  for (const [label, value] of tableRows) {
    guard(LH * 3)
    setStyle(10, 'bold')
    doc.text(label, TBL_X, y)
    doc.text(':', TBL_COLON_X, y)
    setStyle(10, label === 'Peruntukan' ? 'bold' : 'normal')
    const valLines = doc.splitTextToSize(value, TBL_VAL_W)
    doc.text(valLines[0], TBL_VAL_X, y)
    y += LH_SM
    for (let i = 1; i < valLines.length; i++) {
      guard(LH_SM)
      doc.text(valLines[i], TBL_VAL_X, y)
      y += LH_SM
    }
    y += 1.5
  }

  gap(LH)

  // ── Para 3 intro ─────────────────────────────────────────────────────────────

  guard(LH * 3)
  setStyle(10)
  doc.text('3.', ML, y)
  block(
    'Kelulusan ini juga adalah tertakluk kepada syarat-syarat (jika berkaitan) berikut :-',
    ML + INDENT_PARA,
    CW - INDENT_PARA,
  )
  gap(LH * 0.5)

  // ── Conditions i – xix ────────────────────────────────────────────────────────

  const COND_NUM_X = ML + 8
  const COND_TXT_X = ML + 20
  const COND_W = MR - COND_TXT_X

  const conditions = CONDITIONS_STATIC.map((c, i) => {
    if (c !== null) return c
    // ix (index 8) — dynamic budget condition
    return `Peruntukan yang diluluskan adalah sebanyak ${budgetLabel(programme.budget)}`
  })

  for (let i = 0; i < conditions.length; i++) {
    const txt = conditions[i]
    setStyle(10)
    const wrapped = doc.splitTextToSize(txt, COND_W)
    const blockH = wrapped.length * LH_SM + 2.5
    guard(blockH)
    doc.text(`${ROMAN[i]})`, COND_NUM_X, y)
    for (const l of wrapped) {
      doc.text(l, COND_TXT_X, y)
      y += LH_SM
    }
    gap(2)
  }

  gap(LH+40)

  // ── Para 4 ───────────────────────────────────────────────────────────────────

  guard(LH * 4)
  setStyle(10)
  doc.text('4.', ML, y)
  block(
    'Segala kerjasama dan perhatian daripada pihak saudara/saudari dalam menjayakan ' +
    'program ini amatlah dihargai dan diucapkan jutaan terima kasih.',
    ML + INDENT_PARA,
    CW - INDENT_PARA,
  )
  gap(LH)

  // Sekian
  guard(LH * 2)
  line('Sekian, harap maklum.', ML)
  gap(LH * 2.5)

  // ── Closing mottos ────────────────────────────────────────────────────────────

  guard(LH * 6)
  line('"MALAYSIA MADANI"', ML, 10, true)
  gap(LH * 0.5)
  line('"BERKHIDMAT UNTUK NEGARA KERANA ALLAH"', ML, 10, true)
  gap(LH * 2)

  line('Saya yang menjalankan amanah,', ML)
  gap(LH * 5)  // space for signature

  // ── Signatory block ───────────────────────────────────────────────────────────

  guard(LH * 7)
  line('(DR. MOHAMED AZLAN BIN SUHOT)', ML, 10, true)
  line('Pengetua Kolej Siswa Jaya', ML)
  line('Pejabat Timbalan Naib Canselor (Hal Ehwal Pelajar dan Alumni)', ML)
  line('UTM Kuala Lumpur', ML)
  line('Tel: 03-2615 4421', ML)
  line('E: azlans.kl@utm.my', ML)

  gap(LH * 2)

  // ── s.k (carbon copy) ─────────────────────────────────────────────────────────

  guard(LH * 3)
  setStyle(10)
  doc.text('s.k', ML, y);  y += LH
  const advisorName = programme.approved_by_admin_name ?? 'Felo/Penasihat Program'
  doc.text(`-  ${advisorName}`, ML + 8, y);  y += LH
  doc.text('Felo/Penasihat Program', ML + 11, y)

  // ── Save ──────────────────────────────────────────────────────────────────────

  const safeName = programme.name.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-').toLowerCase()
  doc.save(`surat-kelulusan-${safeName}.pdf`)
}