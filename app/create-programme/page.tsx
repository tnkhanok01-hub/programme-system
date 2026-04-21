"use client"
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import { Pencil, Trash, CirclePlus, Table, Save, CircleX, ArrowLeft } from "lucide-react"

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
  const [programmes, setProgrammes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()

  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<any>({})
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [directorProgrammeIds, setDirectorProgrammeIds] = useState<string[]>([])

  const getToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  const canEditOrDelete = (programmeId: string) => {
    if (currentUserRole === "superadmin" || currentUserRole === "admin") return true
    return directorProgrammeIds.includes(programmeId)
  }

  useEffect(() => {
    const fetchProgrammes = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace("/login")
        return
      }

      const userId = session.user.id
      setCurrentUserId(userId)

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single()

      setCurrentUserRole(profile?.role ?? null)

      const { data: roleRows } = await supabase
        .from("programme_roles")
        .select("programme_id")
        .eq("user_id", userId)
        .eq("role", "Programme Director")

      setDirectorProgrammeIds(roleRows?.map((r: any) => r.programme_id) ?? [])

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

  const handleEdit = (programme: any) => {
    setEditForm({
      ...programme,
      start_date: programme.start_date?.slice(0, 10),
      end_date: programme.end_date?.slice(0, 10),
    })
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
      body: JSON.stringify(editForm),
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

  const handleDelete = async (id: string) => {
    const confirmDelete = confirm("Delete this programme?")
    if (!confirmDelete) return

    const token = await getToken()
    if (!token) return router.replace("/login")

    await fetch(`/api/programmes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })

    setProgrammes((prev) => prev.filter((p) => p.id !== id))
  }

  const getStatusStyle = (status: string) => {
    if (status === "Pending") return "text-yellow-400 bg-yellow-400/20"
    if (status === "Approved") return "text-green-400 bg-green-400/20"
    if (status === "Rejected") return "text-red-400 bg-red-400/20"
    return ""
  }

  if (loading) {
    return <div className="text-white text-center mt-10">Loading...</div>
  }

  return (
    <main className="min-h-screen flex items-start md:items-center justify-center p-4 md:p-8 bg-slate-900">
      <div className="w-full max-w-[1400px] bg-slate-800 rounded-xl shadow-md p-4 md:p-7">

        {/* HEADER WITH BACK BUTTON */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">

          <div className="flex items-center gap-3">

            <button
              onClick={() => router.back()}
              className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-md flex items-center gap-2 cursor-pointer"
            >
              <ArrowLeft size={16} />
              Back
            </button>

            <h2 className="flex items-center gap-2 text-white text-xl">
              <Table size={22} />
              Programme List
            </h2>

          </div>

          <button
            onClick={() => router.push("/create-programme-form")}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md"
          >
            <CirclePlus size={20} />
            Create Programme
          </button>

        </div>

        {error && <p className="text-red-400">{error}</p>}

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full text-white">
            <thead>
              <tr>
                {["Name", "Category", "Start", "End", "Lifecycle", "Venue", "Budget", "Approval", "Actions"].map(h => (
                  <th key={h} className="text-left p-3 border-b border-slate-700">{h}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {programmes.map(p => (
                <tr key={p.id}>
                  <td className="p-3">{p.name}</td>
                  <td className="p-3">{p.category}</td>
                  <td className="p-3">{p.start_date}</td>
                  <td className="p-3">{p.end_date}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded ${getLifecycle(p.start_date, p.end_date) === "Pre"
                        ? "bg-blue-500"
                        : getLifecycle(p.start_date, p.end_date) === "During"
                          ? "bg-green-500"
                          : "bg-gray-500"
                      }`}>
                      {getLifecycle(p.start_date, p.end_date)}
                    </span>
                  </td>
                  <td className="p-3">{p.venue}</td>
                  <td className="p-3">RM {p.budget ? Number(p.budget).toFixed(2) : "—"}</td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded ${getStatusStyle(p.status)}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="p-3 flex gap-2">
                    <button onClick={() => handleEdit(p)} className="bg-blue-500 p-2 rounded">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="bg-red-500 p-2 rounded">
                      <Trash size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>

      </div>
    </main>
  )
}