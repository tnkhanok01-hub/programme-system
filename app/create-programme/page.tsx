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
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-md transition"
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
                  <td className="p-3 border-b border-slate-700">RM {p.budget}</td>

                  {/* STATUS */}
                  <td className="p-3 border-b border-slate-700 text-left">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusStyle(p.status)}`}>
                      {p.status}
                    </span>
                  </td>

                  {/* ACTIONS */}
                  <td className="p-3 border-b border-slate-700">
                    <div className="flex gap-2">
                      <button className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-3 py-1 rounded-md">
                        <Pencil size={16} />
                      </button>
                      <button className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-md flex items-center justify-center">
                        <Trash size={16} />
                      </button>
                    </div>
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