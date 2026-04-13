"use client"
import React, { useState } from "react"
import { supabase } from '../../lib/supabaseClient'
import styles from "./styles.module.css"
import { useRouter } from "next/navigation"

export default function CreateProgrammePage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [start_date, setStartDate] = useState("")
  const [end_date, setEndDate] = useState("")
  const [committee, setCommittee] = useState("") 
  const [budget, setBudget] = useState("")
  const [venue, setVenue] = useState("") 

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


    // 1. Get current session token
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      alert('You must be logged in to create a programme.')
      return
    }

    // Build Payload
    const payload = {
      name,
      description,
      category,
      start_date,
      end_date,
      budget: budgetValue ? parseFloat(budget) : null,
      venue
    }

    // 3. Call the API with auth token
    const response = await fetch('/api/programmes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`  // fix: was missing
      },
      body: JSON.stringify(payload)
    })

    const result = await response.json()

    if (!response.ok) {
      alert('Error: ' + result.error)
    } else {
      alert('Programme created successfully!')
      router.push('/create-programme')
    }
  }

  return (
    <main className={styles.wrapper}>
      <div className={styles.card}>
        <h1 className={styles.title}>Create Programme</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
       
          <label className={styles.label}>
            Programme Name
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Badminton Competition"
            />
          </label>

  
          <label className={styles.label}>
            Description
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
            />
          </label>

   
          <label className={styles.label}>
            Category
            <select
              className={styles.input}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Select category</option>
              <option value="academic">Academic</option>
              <option value="sports">Sports</option>
              <option value="community">Community Service</option>
              <option value="others">Others</option>
            </select>
          </label>

    
          <div className={styles.row}>
            <label className={styles.labelSmall}>
              Start date
              <input
                type="date"
                className={styles.input}
                value={start_date}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>

            <label className={styles.labelSmall}>
              End date
              <input
                type="date"
                className={styles.input}
                value={end_date}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </label>
          </div>

          
          <label className={styles.label}>
            Budget (RM)
            <input
              type="number"
              className={styles.input}
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g., Must Below RM 5000.00"
            />
          </label>

          <label className={styles.label}>
            Venue
            <input
                type="text"
                className={styles.input}
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g., Foyer Block A, KSJ"
            />
          </label>

          <div className={styles.actions}>
              
            <button type="button" className={styles.submitBtn} 
              onClick={() => router.push("/create-programme")}>
              ← Back
            </button>

            <button type="submit" className={styles.submitBtn}>
              Create Programme
            </button>
          </div>

        </form>
      </div>
    </main>
  )
}