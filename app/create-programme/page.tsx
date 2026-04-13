"use client"
import React, { useState, useEffect } from "react"
import styles from "./styles.module.css"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabaseClient"

export default function ProgrammePage() {
    const [programmes, setProgrammes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const router = useRouter()

    useEffect(() => {
        const fetchProgrammes = async () => {
            setLoading(true)
            setError("")

            // 1. Get current session
            const { data: { session } } = await supabase.auth.getSession()

            if (!session) {
                setError("You must be logged in to view programmes.")
                setLoading(false)
                return
            }

            // 2. Fetch programmes from DB
            const { data, error: fetchError } = await supabase
                .from("programmes")
                .select("*")
                .order("created_at", { ascending: false })

            if (fetchError) {
                setError("Failed to load programmes: " + fetchError.message)
            } else {
                setProgrammes(data || [])
            }

            setLoading(false)
        }

        fetchProgrammes()
    }, [])

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

                {/* Loading & error states */}
                {loading && <p style={{ color: "#94a3b8", padding: "10px" }}>Loading programmes...</p>}
                {error && <p style={{ color: "#f87171", padding: "10px" }}>{error}</p>}

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
                        {!loading && programmes.length === 0 ? (
                            <tr>
                                <td colSpan={8}>No programmes yet</td>
                            </tr>
                        ) : (
                            programmes.map((p) => (
                                <tr key={p.id}>
                                    <td>{p.name}</td>
                                    <td>{p.category || "—"}</td>
                                    <td>{p.start_date}</td>   {/* fix: was p.startDate */}
                                    <td>{p.end_date}</td>     {/* fix: was p.endDate */}
                                    <td>{p.venue || "—"}</td>
                                    <td>RM {p.budget ?? "—"}</td>
                                    <td><td>
                                    <span
                                        className={
                                        p.status === "Pending"
                                            ? styles.pending
                                            : p.status === "Approved"
                                            ? styles.approved
                                            : p.status === "Rejected"
                                            ? styles.rejected
                                            : ""
                                        }
                                    >
                                        {p.status}
                                    </span>
                                    </td></td>    

                                    <td>—</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </main>
    )
}