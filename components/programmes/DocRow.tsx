import {
  ArrowLeft, CheckCircle, XCircle, AlertCircle, Clock,
  Calendar, MapPin, DollarSign, BookOpen, RefreshCw,
  Upload, FileText, Download, Eye, X, Trash2,
  Users, UserPlus, UserX, Hash,
} from 'lucide-react'

/* ─── DocRow ────────────────────────────────────────────────────────────── */
export default function DocRow({ doc, phaseInfo, canUpload, onPreview, onDownload, onDelete }: {
  doc: PhaseDoc; phaseInfo: typeof PHASES[0]; canUpload: boolean
  onPreview: (d: PhaseDoc) => void; onDownload: (d: PhaseDoc) => void; onDelete: (d: PhaseDoc) => void
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', background: '#0c1526', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
        <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: phaseInfo.activeBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileText size={13} color={phaseInfo.color} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>{doc.file_name}</p>
          <p style={{ margin: '1px 0 0', fontSize: '10px', color: '#475569' }}>
            {new Date(doc.created_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '4px', flexShrink: 0, marginLeft: '8px' }}>
        <button onClick={() => onPreview(doc)} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 8px', borderRadius: '5px', border: '1px solid rgba(96,165,250,0.2)', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', fontSize: '11px', cursor: 'pointer' }}>
          <Eye size={11} />View
        </button>
        <button onClick={() => onDownload(doc)} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 8px', borderRadius: '5px', border: '1px solid rgba(52,211,153,0.2)', background: 'rgba(52,211,153,0.1)', color: '#34d399', fontSize: '11px', cursor: 'pointer' }}>
          <Download size={11} />
        </button>
        {canUpload && (
          <button onClick={() => onDelete(doc)} style={{ display: 'flex', alignItems: 'center', gap: '3px', padding: '4px 8px', borderRadius: '5px', border: '1px solid rgba(248,113,113,0.15)', background: 'rgba(248,113,113,0.08)', color: '#f87171', fontSize: '11px', cursor: 'pointer' }}>
            <Trash2 size={11} />
          </button>
        )}
      </div>
    </div>
  )
}