"use client"
import React, { useState } from "react"
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from "next/navigation"
import { CircleChevronLeft, CalendarPlus, CirclePlus } from "lucide-react"

export default function CreateProgrammePage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [start_date, setStartDate] = useState("")
  const [end_date, setEndDate] = useState("")
  const [budget, setBudget] = useState("")
  const [venue, setVenue] = useState("")

  const [budgetError, setBudgetError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const budgetValue = parseFloat(budget)

    if (budgetValue > 5000) {
      alert("Budget must be below RM 5000")
      return
    }

    if (budgetValue <= 0) {
      alert("Budget must be more than RM 0")
      return
    }

    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      alert('You must be logged in')
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
              className="w-full mt-1 p-3 rounded-md bg-slate-700 text-white outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Badminton Competition"
            />
          </label>

          {/* DESCRIPTION */}
          <label className="text-slate-200 text-sm">
            Description
            <textarea
              className="w-full mt-1 p-3 rounded-md bg-slate-700 text-white outline-none min-h-[100px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
            />
          </label>

          {/* CATEGORY */}
          <label className="text-slate-200 text-sm">
            Category
            <select
              className="w-full mt-1 p-3 rounded-md bg-slate-700 text-white outline-none"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select category</option>
              <option value="Academic">Academic</option>
              <option value="Sports">Sports</option>
              <option value="Community Service">Community Service</option>
              <option value="Others">Others</option>
            </select>
          </label>

          {/* DATES */}
          <div className="grid grid-cols-2 gap-3 max-sm:grid-cols-1">
            <label className="text-slate-200 text-sm">
              Start Date
              <input
                type="date"
                className="w-full mt-1 p-3 rounded-md bg-slate-700 text-white outline-none"
                value={start_date}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>

            <label className="text-slate-200 text-sm">
              End Date
              <input
                type="date"
                className="w-full mt-1 p-3 rounded-md bg-slate-700 text-white outline-none"
                value={end_date}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
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
                  setBudgetError("Must be exactly 2 decimal places (e.g. 1000.00)")
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
              className="w-full mt-1 p-3 rounded-md bg-slate-700 text-white outline-none"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g., Foyer Block A, KSJ"
            />
          </label>

          {/* ACTIONS */}
          <div className="flex justify-between items-center mt-3">
            <button
              type="button"
              onClick={() => router.push("/create-programme")}
              className=" flex items-center gap-2 bg-slate-600 hover:bg-slate-500 text-white px-4 py-2 rounded-md cursor-pointer"
            >
              <CircleChevronLeft size={30}/>
              Back  
            </button>

            <button
              type="submit"
              className=" flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-md transition cursor-pointer"
            >
              <CirclePlus size={25} />
              Create Programme
            </button>
          </div>

        </form>
      </div>
    </main>
  )
}