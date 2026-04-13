"use client"
import React, { useState } from "react"
import styles from "./styles.module.css"
import { useRouter } from "next/navigation"

export default function ProgrammePage() {
    const [programmes, setProgrammes] = useState<any[]>([])
    const router = useRouter()
  
    return (
    <main className={styles.wrapper}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
            <h2 className={styles.title}>Programme List</h2>
      
            <button
                className={styles.submitBtn}
                onClick={() => router.push("/create-programme-form")}
            >
                Create Programme
            </button>
        </div>

        <table className={styles.table}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Category</th>
              <th>Start</th>
              <th>End</th>
              <th>Venue</th>
              <th>Budget</th>
              <th>Approval</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {programmes.length === 0 ? (
              <tr>
                <td colSpan={8}>No programme yet</td>
              </tr>
            ) : (
              programmes.map((p, i) => (
                <tr key={i}>
                  <td>{p.name}</td>
                  <td>{p.category}</td>
                  <td>{p.startDate}</td>
                  <td>{p.endDate}</td>
                  <td>{p.venue}</td>
                  <td>RM {p.budget}</td>
                  <td>{p.approvalStatus}</td>
                  <td>-</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

    </main>
  )
}