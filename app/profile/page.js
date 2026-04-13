export default function ProfilePage() {
  return (
    <div style={styles.container}>
      
      <div style={styles.header}>
        <h1 style={styles.systemName}>
          UTM Smart Programme Management System
        </h1>
        <p style={styles.systemCode}>(UTM-SPMS)</p>
      </div>

      <div style={styles.card}>

        <div style={styles.avatar}>
          U
        </div>

        <h2 style={styles.title}>User Profile</h2>

        <div style={styles.infoGrid}>
          
          <div style={styles.box}>
            <p style={styles.label}>Status</p>
            <p style={styles.value}>No user logged in</p>
          </div>

          <div style={styles.box}>
            <p style={styles.label}>Message</p>
            <p style={styles.value}>Please login to view profile data</p>
          </div>

        </div>

        <button style={styles.button} disabled>
          Login
        </button>

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#0b1220",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    fontFamily: "Arial, sans-serif",
  },

  header: {
    textAlign: "center",
    marginBottom: "20px",
  },

  systemName: {
    color: "#ffffff",
    fontSize: "18px",
    fontWeight: "700",
    margin: 0,
  },

  systemCode: {
    color: "#94a3b8",
    fontSize: "14px",
    marginTop: "5px",
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#111c33",
    width: "100%",
    maxWidth: "420px",
    borderRadius: "16px",
    padding: "30px",
    textAlign: "center",
    boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
    border: "1px solid rgba(255,255,255,0.05)",
  },

  avatar: {
    width: "80px",
    height: "80px",
    borderRadius: "50%",
    backgroundColor: "#1e293b",
    color: "#fff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: "26px",
    fontWeight: "bold",
    margin: "0 auto",
  },

  title: {
    color: "#ffffff",
    marginTop: "15px",
    marginBottom: "20px",
    fontSize: "20px",
  },

  infoGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginBottom: "20px",
  },

  box: {
    backgroundColor: "#0f172a",
    padding: "14px",
    borderRadius: "10px",
    textAlign: "left",
  },

  label: {
    color: "#94a3b8",
    fontSize: "12px",
    marginBottom: "5px",
  },

  value: {
    color: "#ffffff",
    fontSize: "14px",
  },

  button: {
    width: "100%",
    padding: "12px",
    borderRadius: "10px",
    border: "none",
    backgroundColor: "#3b82f6",
    color: "#fff",
    fontWeight: "600",
    opacity: 0.6,
    cursor: "not-allowed",
  },
};