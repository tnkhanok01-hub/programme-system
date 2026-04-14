"use client"
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import { Pencil, Trash, CirclePlus, Table, Save, CircleX} from "lucide-react"

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

  // ─── Helpers ──────────────────────────────────────────────────────────────

  // Get the current session token to pass as Bearer to API routes
  const getToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token ?? null
  }

  const canEditOrDelete = (programmeId: string) => {
    if (currentUserRole === "superadmin" || currentUserRole === "admin") return true
    return directorProgrammeIds.includes(programmeId)
  }

  // ─── Open edit modal ───────────────────────────────────────────────────────
  const handleEdit = (programme: any) => {
    setEditForm(programme)
    setShowEditModal(true)
  }

  const handleEditChange = (e: any) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  // ─── Update (PUT /api/programmes/[id]) ────────────────────────────────────
  const handleUpdate = async () => {
    const token = await getToken()
    if (!token) return alert("You must be logged in.")

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
      // Update UI instantly using the returned programme
      setProgrammes((prev) =>
        prev.map((p) => (p.id === editForm.id ? data.programme : p))
      )
      setShowEditModal(false)
    }
  }

  // ─── Delete (DELETE /api/programmes/[id]) ─────────────────────────────────
  const handleDelete = async (id: string) => {
    const confirmDelete = confirm("Are you sure you want to delete this programme?")
    if (!confirmDelete) return

    const token = await getToken()
    if (!token) return alert("You must be logged in.")

    const res = await fetch(`/api/programmes/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    })

    // Safely parse — some responses may have an empty body
    const text = await res.text()
    const data = text ? JSON.parse(text) : {}

    if (!res.ok) {
      alert("Failed to delete: " + (data.error ?? "Unknown error"))
    } else {
      setProgrammes((prev) => prev.filter((p) => p.id !== id))
    }
  }

  // ─── Fetch programmes on mount ────────────────────────────────────────────
  useEffect(() => {
    const fetchProgrammes = async () => {
      setLoading(true)
      setError("")

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError("You must be logged in.")
        setLoading(false)
        return
      }

      const userId = session.user.id
      setCurrentUserId(userId)

      // Fetch global role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single()
      setCurrentUserRole(profile?.role ?? null)

      // Fetch which programmes this user is director of
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

  // ─── Status badge styles ──────────────────────────────────────────────────
  const getStatusStyle = (status: string) => {
    if (status === "Pending")  return "text-yellow-400 bg-yellow-400/20"
    if (status === "Approved") return "text-green-400 bg-green-400/20"
    if (status === "Rejected") return "text-red-400 bg-red-400/20"
    return ""
  }

  // ─── UI ───────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-slate-900">
      <div className="w-full max-w-[1400px] bg-slate-800 rounded-xl shadow-md p-7">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="flex items-center gap-2 text-white text-xl">
            <Table size={22} />
            Programme List
          </h2>

          <button
            onClick={() => router.push("/create-programme-form")}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-md transition cursor-pointer"
          >
            <CirclePlus size={25} />
            Create Programme
          </button>
        </div>

        {/* STATES */}
        {loading && <p className="text-slate-400">Loading...</p>}
        {error && <p className="text-red-400">{error}</p>}

        {/* TABLE */}
        <table className="w-full mt-4 text-white border-collapse">
          <thead>
            <tr>
              {["Name", "Category", "Start", "End", "Venue", "Budget", "Approval", "Actions"].map((h) => (
                <th key={h} className="text-left text-slate-400 font-semibold p-3 border-b border-slate-700">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {!loading && programmes.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-3 text-slate-400">
                  No programmes yet
                </td>
              </tr>
            ) : (
              programmes.map((p) => (
                <tr key={p.id} className="hover:bg-slate-700">
                  <td className="p-3 border-b border-slate-700 max-w-[250px] break-words">{p.name}</td>
                  <td className="p-3 border-b border-slate-700">{p.category}</td>
                  <td className="p-3 border-b border-slate-700">{p.start_date}</td>
                  <td className="p-3 border-b border-slate-700">{p.end_date}</td>
                  <td className="p-3 border-b border-slate-700">{p.venue}</td>
                  <td className="p-3 border-b border-slate-700">
                    RM {p.budget !== null ? Number(p.budget).toFixed(2) : "—"}
                  </td>

                  {/* STATUS */}
                  <td className="p-3 border-b border-slate-700 text-left">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(p.status)}`}>
                      {p.status}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="p-3 border-b border-slate-700">
                    {canEditOrDelete(p.id) ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(p)}
                          className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md cursor-pointer"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md cursor-pointer"
                        >
                          <Trash size={16} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-sm">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* EDIT MODAL */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-6 rounded-xl w-full max-w-[500px]">

              <h2 className="flex items-center gap-2 text-white text-xl mb-4">
                <Pencil size={22} />
                Edit Programme</h2>

              {/* NAME */}
              <input
                name="name"
                value={editForm.name || ""}
                onChange={handleEditChange}
                className="w-full p-3 mb-3 bg-slate-700 text-white rounded"
                placeholder="Programme Name"
              />

              {/* CATEGORY */}
              <select
                name="category"
                value={editForm.category || ""}
                onChange={handleEditChange}
                className="w-full p-3 mb-3 bg-slate-700 text-white rounded"
              >
                <option value="">Select category</option>
                <option value="Academic">Academic</option>
                <option value="Sports">Sports</option>
                <option value="Community Service">Community Service</option>
                <option value="Others">Others</option>
              </select>

              <div className="grid grid-cols-2 gap-3 mb-3">
                {/* START DATE */}
                <input
                  type="date"
                  name="start_date"
                  value={editForm.start_date || ""}
                  onChange={handleEditChange}
                  className="w-full p-3 bg-slate-700 text-white rounded"
                />

                {/* END DATE */}
                <input
                  type="date"
                  name="end_date"
                  value={editForm.end_date || ""}
                  onChange={handleEditChange}
                  className="w-full p-3 bg-slate-700 text-white rounded"
                />
              </div>

              {/* VENUE */}
              <input
                name="venue"
                value={editForm.venue || ""}
                onChange={handleEditChange}
                className="w-full p-3 mb-3 bg-slate-700 text-white rounded"
                placeholder="Venue"
              />

              {/* BUDGET */}
              <input
                name="budget"
                value={editForm.budget || ""}
                onChange={handleEditChange}
                className="w-full p-3 mb-4 bg-slate-700 text-white rounded"
                placeholder="Budget"
              />

              {/* BUTTONS */}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded text-white cursor-pointer"
                >
                  <CircleX size={20} />
                  Cancel
                </button>

                <button
                  onClick={handleUpdate}
                  className="flex items-center gap-2 bg-green-500 hover:bg-green-600 px-4 py-2 rounded text-white cursor-pointer"
                >
                  <Save size={20} />
                  Save
                </button>
              </div>

            </div>
          </div>
        )}

      </div>
    </main>
  )
}
