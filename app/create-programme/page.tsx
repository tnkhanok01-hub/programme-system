"use client"
import React, { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"
import { Pencil, Trash } from "lucide-react"

export default function ProgrammePage() {
  const [programmes, setProgrammes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const router = useRouter()
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<any>({})

  const handleEdit = (programme: any) => {
  setEditForm(programme)
  setShowEditModal(true)
    }
  
    const handleEditChange = (e: any) => {
  setEditForm({ ...editForm, [e.target.name]: e.target.value })
    }

  const handleUpdate = async () => {
  const { error } = await supabase
    .from("programmes")
    .update({
      name: editForm.name,
      category: editForm.category,
      venue: editForm.venue,
      budget: editForm.budget
    })
    .eq("id", editForm.id)

  if (error) {
    alert("Update failed: " + error.message)
  } else {
    // update UI instantly
    setProgrammes((prev) =>
      prev.map((p) => (p.id === editForm.id ? editForm : p))
    )

    setShowEditModal(false)
  }
    }

  const handleDelete = async (id: string) => {
        const confirmDelete = confirm("Are you sure you want to delete this programme?")
        if (!confirmDelete) return

        const { error } = await supabase
            .from("programmes")
            .delete()
            .eq("id", id)

        if (error) {
            alert("Failed to delete: " + error.message)
        } else {
            // ✅ update UI instantly (no refresh)
            setProgrammes((prev) => prev.filter((p) => p.id !== id))
        }
    }

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

  const getStatusStyle = (status: string) => {
    if (status === "Pending")
      return "text-yellow-400 bg-yellow-400/20"
    if (status === "Approved")
      return "text-green-400 bg-green-400/20"
    if (status === "Rejected")
      return "text-red-400 bg-red-400/20"
    return ""
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-slate-900">
      <div className="w-full max-w-[1200px] bg-slate-800 rounded-xl shadow-md p-7">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-xl">Programme List</h2>

          <button
            onClick={() => router.push("/create-programme-form")}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-md transition cursor-pointer"
          >
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
              {["Name","Category","Start","End","Venue","Budget","Approval","Actions"].map((h) => (
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
                  
                  <td className="p-3 border-b border-slate-700 whitespace-nowrap">{p.name}</td>
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
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(p)}
                        className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-md cursor-pointer"
                        >
                        <Pencil size={16} />
                      </button>
                      <button className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md flex items-center justify-center cursor-pointer">
                        <Trash size={16} />
                      </button>
                    </div>
                  </td>

                </tr>
              ))
            )}
          </tbody>
        </table>
        {showEditModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                
                <div className="bg-slate-800 p-6 rounded-xl w-full max-w-[500px]">

                <h2 className="text-white text-xl mb-4">Edit Programme</h2>

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
                    className="bg-gray-500 hover:bg-gray-600 px-4 py-2 rounded text-white cursor-pointer"
                    >
                    Cancel
                    </button>

                    <button
                    onClick={handleUpdate}
                    className="bg-green-500 hover:bg-green-600 px-4 py-2 rounded text-white cursor-pointer"
                    >
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