"use client"
import React, { useState, useEffect } from "react"
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from "next/navigation"
import { CircleChevronLeft, CalendarPlus, CirclePlus } from "lucide-react"

export default function CreateProgrammePage() {
  const router = useRouter()

  const [loading, setLoading] = useState(true)

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [start_date, setStartDate] = useState("")
  const [end_date, setEndDate] = useState("")
  const [budget, setBudget] = useState("")
  const [venue, setVenue] = useState("")
  const [budgetError, setBudgetError] = useState("")

  // ✅ SESSION CHECK (on page load)
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.replace("/login")
        return
      }

      setLoading(false)
    }

    checkSession()
  }, [])

  // ✅ AUTH LISTENER (auto redirect on logout)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const budgetValue = parseFloat(budget)

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      router.replace("/login")
      return
    }

    const payload = {
      name,
      description,
      category,
      start_date,
      end_date,
      budget: budgetValue,
      venue
    }

    const response = await fetch('/api/programmes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (!response.ok) {
      alert(result.error)
    } else {
      alert("Programme created!")
      router.push("/create-programme")
    }
  }

  // ✅ LOADING GUARD (prevents flicker)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-slate-900">
      <div className="w-full max-w-[820px] bg-slate-800 rounded-xl shadow-md p-7">

        <h1 className="flex items-center gap-2 text-white text-2xl mb-4 text-center">
          <CalendarPlus size={28} />
          Create Programme
        </h1>

        <form onSubmit={handleSubmit} className="grid gap-4">

          {/* NAME */}
          <label className="text-slate-200 text-sm">
            Programme Name
            <input
              className="w-full mt-1 p-3 rounded-md bg-slate-700 text-white"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          {/* DESCRIPTION */}
          <label className="text-slate-200 text-sm">
            Description
            <textarea
              className="w-full mt-1 p-3 rounded-md bg-slate-700 text-white"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>

          {/* CATEGORY */}
          <select
            className="w-full p-3 bg-slate-700 text-white rounded"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Select category</option>
            <option value="Academic">Academic</option>
            <option value="Sports">Sports</option>
            <option value="Community Service">Community Service</option>
            <option value="Others">Others</option>
          </select>

          {/* DATES */}
          <div className="grid grid-cols-2 gap-3">
            <input type="date" value={start_date} onChange={(e) => setStartDate(e.target.value)} className="p-3 bg-slate-700 text-white rounded"/>
            <input type="date" value={end_date} onChange={(e) => setEndDate(e.target.value)} className="p-3 bg-slate-700 text-white rounded"/>
          </div>

          {/* BUDGET */}
          <input
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="p-3 bg-slate-700 text-white rounded"
            placeholder="4999.99"
          />

          {/* VENUE */}
          <input
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className="p-3 bg-slate-700 text-white rounded"
          />

          {/* ACTIONS */}
          <div className="flex justify-between mt-3">
            <button onClick={() => router.push("/create-programme")} type="button" className="bg-slate-600 px-4 py-2 rounded text-white">
              Back
            </button>

            <button type="submit" className="bg-blue-500 px-4 py-2 rounded text-white">
              Create
            </button>
          </div>

        </form>
      </div>
    </main>
  )
}