"use client"
import React, { useState } from "react"
import styles from "./styles.module.css"

export default function CreateProgrammePage() {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [committee, setCommittee] = useState("") 
  const [budget, setBudget] = useState("")
  const [venue, setVenue] = useState("") 

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const payload = {
      name,
      description,
      category,
      startDate,
      endDate,
      committee,
      budget,
      venue
    }

    console.log("Create programme payload:", payload)
    alert("Programme submitted (check console).")
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
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </label>

            <label className={styles.labelSmall}>
              End date
              <input
                type="date"
                className={styles.input}
                value={endDate}
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
              placeholder="e.g., Must Below RM 5000"
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
            <button type="submit" className={styles.submitBtn}>
              Create Programme
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}