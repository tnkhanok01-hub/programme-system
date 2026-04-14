"use client"
import React, { useState, useEffect } from "react"
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from "next/navigation"
import { CircleChevronLeft, CalendarPlus, CirclePlus, Circle } from "lucide-react"

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
              onChange={(e) => setName(e.target.value)} placeholder="eg. Badminton Competition"
            />
          </label>

          {/* DESCRIPTION */}
          <label className="text-slate-200 text-sm">
            Description
            <textarea
              className="w-full mt-1 p-3 rounded-md bg-slate-700 text-white"
              value={description}
              onChange={(e) => setDescription(e.target.value)} placeholder="Brief description about the programme"  
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
          <label className="text-slate-200 text-sm">
            Budget (RM)

            <input
              type="text"
              inputMode="decimal"
              className="w-full mt-1 p-3 rounded-md bg-slate-700 text-white outline-none"
              value={budget}
              onChange={(e) => {
                const value = e.target.value

                // allow only numbers + decimal
                if (!/^\d*\.?\d*$/.test(value)) return

                setBudget(value)

                if (!value) {
                  setBudgetError("")
                  return
                }

                const num = Number(value)

                // ❌ must be exactly 2 decimal places
                if (!/^\d+(\.\d{2})$/.test(value)) {
                  setBudgetError("Must be exactly 2 decimal places (e.g. 2000.00)")
                  return
                }

                if (num >= 5000) {
                  setBudgetError("Budget must be below RM 5000.00")
                  return
                }

                if (num <= 0) {
                  setBudgetError("Budget must be more than RM 0.00")
                  return
                }

                setBudgetError("")
              }}
              onBlur={() => {
                // auto format to 2 decimal places
                if (budget && !isNaN(Number(budget))) {
                  setBudget(Number(budget).toFixed(2))
                }
              }}
              placeholder="e.g. 4999.99"
            />

            {budgetError && (
              <p className="text-red-400 text-xs mt-1">
                {budgetError}
              </p>
            )}
          </label>

          {/* VENUE */}
          <label className="text-slate-200 text-sm">
            Venue 
            <input
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Foyer Block A, KSJ"
              className="w-full mt-1 p-3 bg-slate-700 text-white rounded-md outline-none"
            />
          </label>

          {/* ACTIONS */}
          <div className="flex justify-between mt-3">
            <button onClick={() => router.push("/create-programme")} type="button" className="flex items-center gap-2 bg-slate-600 px-4 py-2 rounded text-white">
              <CircleChevronLeft size={18} />
              Back
            </button>

            <button type="submit" className=" flex items-center gap-2 bg-blue-500 px-4 py-2 rounded text-white">
              <CirclePlus size={18} />
              Create
            </button>
          </div>

        </form>
      </div>
    </main>
  )
}