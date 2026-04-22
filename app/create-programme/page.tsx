"use client"
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import {
  Pencil,
  Trash,
  CirclePlus,
  Table,
  ArrowLeft,
  Upload,
  Eye,
  Download
} from "lucide-react"

function getLifecycle(start_date: string | null, end_date: string | null) {
  if (!start_date || !end_date) return "N/A"

  const today = new Date()
  const start = new Date(start_date)
  const end = new Date(end_date)

  if (today < start) return "Pre"
  if (today >= start && today <= end) return "During"
  return "Post"
}

export default function ProgrammePage() {
  const router = useRouter()

  const [programmes, setProgrammes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [documents, setDocuments] = useState<any[]>([])

  const [openDocsId, setOpenDocsId] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<any | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace("/login")
        return
      }

      const { data, error } = await supabase
        .from("programmes")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) setError(error.message)
      else setProgrammes(data || [])

      const { data: docs } = await supabase
        .from("programme_documents")
        .select("*")

      setDocuments(docs || [])
      setLoading(false)
    }

    fetchData()
  }, [router])

  const handleUpload = async (programmeId: string) => {
    if (!file) {
      alert("Please select a file first")
      return
    }

    const formData = new FormData()
    formData.append("file", file)
    formData.append("programme_id", programmeId)

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    })

    const data = await res.json()

    // ✔ ADDED FEEDBACK ONLY (NO OTHER CHANGES)
    if (!res.ok) {
      alert("Upload failed: " + (data.error || "Unknown error"))
      return
    }

    alert("Upload successful 🎉")

    const { data: docs } = await supabase
      .from("programme_documents")
      .select("*")

    setDocuments(docs || [])
    setFile(null)
    setSelectedProgrammeId(null)
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/programmes/${id}`, { method: "DELETE" })
    setProgrammes(prev => prev.filter(p => p.id !== id))
  }

  if (loading) {
    return <div className="text-white text-center mt-10">Loading...</div>
  }

  return (
    <main className="min-h-screen bg-slate-900 p-4 flex justify-center">
      <div className="w-full max-w-[1400px] bg-slate-800 p-5 rounded-xl">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">

          <button
            onClick={() => window.location.href = "/create-programme"}
            className="text-white flex items-center gap-2"
          >
            <ArrowLeft size={16} /> Back
          </button>

          <h2 className="text-white flex items-center gap-2">
            <Table size={20} /> Programme List
          </h2>

          <button
            onClick={() => window.scrollTo(0, 0)}
            className="bg-blue-500 px-3 py-2 rounded text-white flex items-center gap-2"
          >
            <CirclePlus size={18} /> Top
          </button>
        </div>

        {error && <p className="text-red-400">{error}</p>}

        {/* TABLE */}
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">

            <table className="w-full text-white">
              <thead>
                <tr>
                  {["Name", "Category", "Start", "End", "Lifecycle", "Venue", "Budget", "Status", "Actions"].map(h => (
                    <th key={h} className="text-left p-3 border-b border-slate-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {programmes.map(p => {
                  const programmeFiles = documents.filter(d => d.programme_id === p.id)
                  const lifecycle = getLifecycle(p.start_date, p.end_date)

                  return (
                    <tr key={p.id}>

                      <td className="p-3">{p.name}</td>
                      <td className="p-3">{p.category}</td>
                      <td className="p-3">{p.start_date}</td>
                      <td className="p-3">{p.end_date}</td>

                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          lifecycle === "Pre"
                            ? "bg-blue-500"
                            : lifecycle === "During"
                              ? "bg-green-500"
                              : "bg-gray-500"
                        }`}>
                          {lifecycle}
                        </span>
                      </td>

                      <td className="p-3">{p.venue}</td>
                      <td className="p-3">RM {p.budget}</td>

                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          p.status === "Pending"
                            ? "bg-yellow-500"
                            : p.status === "Approved"
                              ? "bg-green-500"
                              : "bg-red-500"
                        }`}>
                          {p.status}
                        </span>
                      </td>

                      <td className="p-3">

                        <div className="flex gap-2">
                          <button className="bg-blue-500 p-2 rounded"><Pencil size={14} /></button>
                          <button onClick={() => handleDelete(p.id)} className="bg-red-500 p-2 rounded"><Trash size={14} /></button>

                          <button
                            onClick={() => setSelectedProgrammeId(p.id)}
                            className="bg-green-500 p-2 rounded"
                          >
                            <Upload size={14} />
                          </button>
                        </div>

                        {selectedProgrammeId === p.id && (
                          <div className="mt-2 flex gap-2 items-center">
                            <input
                              type="file"
                              onChange={(e) => setFile(e.target.files?.[0] || null)}
                              className="text-xs text-white"
                            />
                            <button
                              onClick={() => handleUpload(p.id)}
                              className="bg-blue-600 px-2 py-1 rounded text-xs text-white"
                            >
                              Upload
                            </button>
                          </div>
                        )}

                        <div className="mt-2">
                          <button
                            onClick={() => setOpenDocsId(openDocsId === p.id ? null : p.id)}
                            className="text-xs text-blue-400 underline"
                          >
                            View Documents
                          </button>

                          {openDocsId === p.id && (
                            <div className="mt-2 bg-slate-700 p-2 rounded max-h-32 overflow-y-auto">

                              {programmeFiles.map(f => (
                                <div key={f.id} className="flex justify-between text-xs p-1">

                                  <span className="truncate max-w-[120px]">
                                    {f.file_name}
                                  </span>

                                  <div className="flex gap-2">

                                    <button
                                      onClick={() => setPreviewFile(f)}
                                      className="text-blue-400 flex items-center gap-1"
                                    >
                                      <Eye size={12} /> View
                                    </button>

                                    <button
                                      onClick={async () => {
                                        const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${f.file_path}`

                                        const res = await fetch(url)
                                        const blob = await res.blob()

                                        const blobUrl = window.URL.createObjectURL(blob)

                                        const a = document.createElement("a")
                                        a.href = blobUrl
                                        a.download = f.file_name

                                        document.body.appendChild(a)
                                        a.click()

                                        document.body.removeChild(a)
                                        window.URL.revokeObjectURL(blobUrl)
                                      }}
                                      className="text-green-400 flex items-center gap-1"
                                    >
                                      <Download size={12} /> Download
                                    </button>

                                  </div>

                                </div>
                              ))}

                            </div>
                          )}
                        </div>

                      </td>
                    </tr>
                  )
                })}
              </tbody>

            </table>

          </div>
        </div>

        {previewFile && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">

            <div className="bg-slate-900 w-[90%] max-w-lg rounded p-3 relative">

              <button
                onClick={() => setPreviewFile(null)}
                className="absolute top-2 right-3 text-white"
              >
                ✕
              </button>

              <h3 className="text-white text-sm mb-2 truncate">
                {previewFile.file_name}
              </h3>

              <iframe
                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${previewFile.file_path}`}
                className="w-full h-[300px] bg-white rounded"
              />

            </div>
          </div>
        )}

      </div>
    </main>
  )
}