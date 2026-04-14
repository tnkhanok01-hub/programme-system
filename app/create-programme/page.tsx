"use client"
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import { Pencil, Trash, CirclePlus, Table, Save, CircleX } from "lucide-react"

export default function ProgrammePage() {
  const [programmes, setProgrammes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [directorProgrammeIds, setDirectorProgrammeIds] = useState<string[]>([])

  // ─── SESSION TOKEN ─────────────────────────────────────────────
  const getToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  const canEditOrDelete = (programmeId: string) => {
    if (currentUserRole === "superadmin" || currentUserRole === "admin") return true
    return directorProgrammeIds.includes(programmeId)
  }

  // ─── AUTH LISTENER (auto logout redirect) ──────────────────────
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        router.replace("/login")
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  // ─── FETCH DATA ────────────────────────────────────────────────
  useEffect(() => {
    const fetchProgrammes = async () => {
      setLoading(true)
      setError("")

      const { data: { session } } = await supabase.auth.getSession()

      // ✅ Redirect if not logged in
      if (!session) {
        router.replace("/login")
        return
      }

      const userId = session.user.id
      setCurrentUserId(userId)

      // Get role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single()

      setCurrentUserRole(profile?.role ?? null)

      // Get programme roles
      const { data: roleRows } = await supabase
        .from("programme_roles")
        .select("programme_id")
        .eq("user_id", userId)
        .eq("role", "Programme Director")

      setDirectorProgrammeIds(roleRows?.map((r: any) => r.programme_id) ?? [])

      // Fetch programmes
      const { data, error } = await supabase
        .from("programmes")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) setError(error.message)
      else setProgrammes(data || [])

      setLoading(false)
    }

    fetchProgrammes()
  }, [])

  // ─── EDIT ──────────────────────────────────────────────────────
  const handleEdit = (programme: any) => {
    setEditForm(programme)
    setShowEditModal(true)
  }

  const handleEditChange = (e: any) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  const handleUpdate = async () => {
    const token = await getToken()
    if (!token) return router.replace("/login")

    const res = await fetch(`/api/programmes/${editForm.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: editForm.name,
        category: editForm.category,
        venue: editForm.venue,
        budget: editForm.budget,
        start_date: editForm.start_date,
        end_date: editForm.end_date,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      alert("Update failed: " + data.error)
    } else {
      setProgrammes((prev) =>
        prev.map((p) => (p.id === editForm.id ? data.programme : p))
      )
      setShowEditModal(false)
    }
  }

  // ─── DELETE ────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const confirmDelete = confirm("Are you sure you want to delete this programme?")
    if (!confirmDelete) return

    const token = await getToken()
    if (!token) return router.replace("/login")

    const res = await fetch(`/api/programmes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })

    const text = await res.text()
    const data = text ? JSON.parse(text) : {}

    if (!res.ok) {
      alert("Failed to delete: " + (data.error ?? "Unknown error"))
    } else {
      setProgrammes((prev) => prev.filter((p) => p.id !== id))
    }
  }

  // ─── STATUS STYLE ──────────────────────────────────────────────
  const getStatusStyle = (status: string) => {
    if (status === "Pending") return "text-yellow-400 bg-yellow-400/20"
    if (status === "Approved") return "text-green-400 bg-green-400/20"
    if (status === "Rejected") return "text-red-400 bg-red-400/20"
    return ""
  }

  // ─── LOADING GUARD ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    )
  }

  // ─── UI ────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-slate-900">
      <div className="w-full max-w-[1200px] bg-slate-800 rounded-xl shadow-md p-7">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="flex items-center gap-2 text-white text-xl">
            <Table size={22} />
            Programme List
          </h2>

          <button
            onClick={() => router.push("/create-programme-form")}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-md"
          >
            <CirclePlus size={25} />
            Create Programme
          </button>
        </div>

        {error && <p className="text-red-400">{error}</p>}

        {/* TABLE */}
        <table className="w-full mt-4 text-white border-collapse">
          <thead>
            <tr>
              {["Name", "Category", "Start", "End", "Venue", "Budget", "Approval", "Actions"].map((h) => (
                <th key={h} className="text-left text-slate-400 p-3 border-b border-slate-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {programmes.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-3 text-slate-400">
                  No programmes yet
                </td>
              </tr>
            ) : (
              programmes.map((p) => (
                <tr key={p.id} className="hover:bg-slate-700">
                  <td className="p-3 border-b border-slate-700">{p.name}</td>
                  <td className="p-3 border-b border-slate-700">{p.category}</td>
                  <td className="p-3 border-b border-slate-700">{p.start_date}</td>
                  <td className="p-3 border-b border-slate-700">{p.end_date}</td>
                  <td className="p-3 border-b border-slate-700">{p.venue}</td>
                  <td className="p-3 border-b border-slate-700">
                    RM {p.budget ? Number(p.budget).toFixed(2) : "—"}
                  </td>
                  <td className="p-3 border-b border-slate-700">
                    <span className={`px-3 py-1 rounded-full text-xs ${getStatusStyle(p.status)}`}>
                      {p.status}
                    </span>
                  </td>

                  <td className="p-3 border-b border-slate-700">
                    {canEditOrDelete(p.id) ? (
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(p)} className="bg-blue-500 p-2 rounded">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => handleDelete(p.id)} className="bg-red-500 p-2 rounded">
                          <Trash size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

      </div>
    </main>
  )
}