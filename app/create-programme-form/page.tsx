"use client"
import React, { useState, useEffect, useRef } from "react"
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from "next/navigation"
import {
  CircleChevronLeft, CalendarPlus, CirclePlus,
  Paperclip, X, FileText, CheckCircle, Loader2
} from "lucide-react"

export default function CreateProgrammePage() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // form fields
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [start_date, setStartDate] = useState("")
  const [end_date, setEndDate] = useState("")
  const [budget, setBudget] = useState("")
  const [venue, setVenue] = useState("")
  const [budgetError, setBudgetError] = useState("")

  // file upload state
  const [files, setFiles] = useState<File[]>([])

  // session check
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.replace("/login"); return }
      setLoading(false)
    }
    checkSession()
  }, [])

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) router.replace("/login")
    })
    return () => { listener.subscription.unsubscribe() }
  }, [])

  // handle file selection — allow multiple files
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || [])
    setFiles(prev => {
      // prevent duplicates by name
      const existing = new Set(prev.map(f => f.name))
      return [...prev, ...selected.filter(f => !existing.has(f.name))]
    })
    // reset input so same file can be re-selected after removal
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeFile = (name: string) => {
    setFiles(prev => prev.filter(f => f.name !== name))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (budgetError) return

    setSubmitting(true)

    const budgetValue = parseFloat(budget)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) { router.replace("/login"); return }

    // Step 1: Create the programme
    const response = await fetch('/api/programmes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ name, description, category, start_date, end_date, budget: budgetValue, venue })
    })

    const result = await response.json()

    if (!response.ok) {
      alert(result.error)
      setSubmitting(false)
      return
    }

    const programmeId = result.programme?.id

    // Step 2: Upload each file if any were attached
    if (files.length > 0 && programmeId) {
      for (const file of files) {
        const formData = new FormData()
        formData.append("file", file)
        formData.append("programme_id", programmeId)

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!uploadRes.ok) {
          const uploadData = await uploadRes.json()
          console.error(`Failed to upload ${file.name}:`, uploadData.error)
          // continue uploading remaining files even if one fails
        }
      }
    }

    setSubmitting(false)
    alert("Programme created!" + (files.length > 0 ? ` ${files.length} file(s) uploaded.` : ""))
    router.push("/create-programme")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white bg-slate-900">
        Loading...
      </div>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-slate-900">
      <div className="w-full max-w-[820px] bg-slate-800 rounded-xl shadow-md p-7">

        <h1 className="flex items-center gap-2 text-white text-2xl mb-6 justify-center">
          <CalendarPlus size={28} />
          Create Programme
        </h1>

        <form onSubmit={handleSubmit} className="grid gap-4">

          {/* NAME */}
          <label className="text-slate-200 text-sm">
            Programme Name
            <input
              className="w-full mt-1 p-3 rounded-md bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Badminton Competition"
              required
            />
          </label>

          {/* DESCRIPTION */}
          <label className="text-slate-200 text-sm">
            Description
            <textarea
              className="w-full mt-1 p-3 rounded-md bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description about the programme"
              rows={3}
            />
          </label>

          {/* CATEGORY */}
          <label className="text-slate-200 text-sm">
            Category
            <select
              className="w-full mt-1 p-3 bg-slate-700 text-white rounded outline-none focus:ring-2 focus:ring-blue-500"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Select category</option>
              <option value="Academic">Academic</option>
              <option value="Sports">Sports</option>
              <option value="Community Service">Community Service</option>
              <option value="Others">Others</option>
            </select>
          </label>

          {/* DATES */}
          <div className="grid grid-cols-2 gap-3">
            <label className="text-slate-200 text-sm">
              Start Date
              <input type="date" value={start_date} onChange={(e) => setStartDate(e.target.value)}
                className="w-full mt-1 p-3 bg-slate-700 text-white rounded outline-none focus:ring-2 focus:ring-blue-500" required />
            </label>
            <label className="text-slate-200 text-sm">
              End Date
              <input type="date" value={end_date} onChange={(e) => setEndDate(e.target.value)}
                className="w-full mt-1 p-3 bg-slate-700 text-white rounded outline-none focus:ring-2 focus:ring-blue-500" required />
            </label>
          </div>

          {/* BUDGET */}
          <label className="text-slate-200 text-sm">
            Budget (RM)
            <input
              type="text"
              inputMode="decimal"
              className="w-full mt-1 p-3 rounded-md bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
              value={budget}
              onChange={(e) => {
                const value = e.target.value
                if (!/^\d*\.?\d*$/.test(value)) return
                setBudget(value)
                if (!value) { setBudgetError(""); return }
                const num = Number(value)
                if (!/^\d+(\.\d{2})$/.test(value)) { setBudgetError("Must be exactly 2 decimal places (e.g. 2000.00)"); return }
                if (num >= 5000) { setBudgetError("Budget must be below RM 5000.00"); return }
                if (num <= 0) { setBudgetError("Budget must be more than RM 0.00"); return }
                setBudgetError("")
              }}
              onBlur={() => {
                if (budget && !isNaN(Number(budget))) setBudget(Number(budget).toFixed(2))
              }}
              placeholder="e.g. 4999.99"
              required
            />
            {budgetError && <p className="text-red-400 text-xs mt-1">{budgetError}</p>}
          </label>

          {/* VENUE */}
          <label className="text-slate-200 text-sm">
            Venue
            <input
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Foyer Block A, KSJ"
              className="w-full mt-1 p-3 bg-slate-700 text-white rounded-md outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </label>

          {/* ── FILE UPLOAD ── */}
          <div>
            <p className="text-slate-200 text-sm mb-2">
              Programme Paperwork
              <span className="text-slate-400 font-normal ml-1">(optional — PDF, Word, images)</span>
            </p>

            {/* Drop zone / click to browse */}
            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed border-slate-600 hover:border-blue-500 rounded-lg p-5 flex flex-col items-center gap-2 transition-colors bg-slate-700/40"
            >
              <Paperclip size={22} className="text-slate-400" />
              <p className="text-slate-300 text-sm font-medium">Click to attach files</p>
              <p className="text-slate-500 text-xs">PDF, DOCX, JPG, PNG — multiple files allowed</p>
            </div>

            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.ppt,.pptx"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* File list */}
            {files.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {files.map(f => (
                  <div key={f.name} className="flex items-center justify-between bg-slate-700 rounded-lg px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={15} className="text-blue-400 flex-shrink-0" />
                      <span className="text-slate-200 text-sm truncate">{f.name}</span>
                      <span className="text-slate-500 text-xs flex-shrink-0">{formatFileSize(f.size)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(f.name)}
                      className="text-slate-400 hover:text-red-400 ml-2 flex-shrink-0 transition-colors"
                    >
                      <X size={15} />
                    </button>
                  </div>
                ))}
                <p className="text-slate-500 text-xs">{files.length} file{files.length > 1 ? "s" : ""} attached</p>
              </div>
            )}
          </div>

          {/* ACTIONS */}
          <div className="flex justify-between mt-3">
            <button
              onClick={() => router.push("/create-programme")}
              type="button"
              className="flex items-center gap-2 bg-slate-600 hover:bg-slate-500 px-4 py-2 rounded text-white transition-colors"
            >
              <CircleChevronLeft size={18} />
              Back
            </button>

            <button
              type="submit"
              disabled={submitting || !!budgetError}
              className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed px-5 py-2 rounded text-white font-medium transition-colors"
            >
              {submitting ? (
                <><Loader2 size={18} className="animate-spin" />Creating...</>
              ) : (
                <><CirclePlus size={18} />Create Programme</>
              )}
            </button>
          </div>

        </form>
      </div>
    </main>
  )
}
