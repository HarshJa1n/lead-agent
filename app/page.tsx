export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "32px",
      }}
    >
      <div
        style={{
          maxWidth: "720px",
          background: "#fffdf8",
          border: "1px solid #ded7cb",
          borderRadius: "24px",
          padding: "32px",
          boxShadow: "0 20px 60px rgba(22, 22, 22, 0.08)",
        }}
      >
        <p
          style={{
            margin: 0,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontSize: "12px",
            color: "#7b6f5c",
          }}
        >
          harshja1n / lead-review
        </p>
        <h1 style={{ margin: "12px 0 16px", fontSize: "40px", lineHeight: 1.05 }}>
          Slack lead review agent is ready for wiring.
        </h1>
        <p style={{ margin: 0, fontSize: "18px", lineHeight: 1.6, color: "#3b3b3b" }}>
          Deploy this app on Vercel, connect Slack event URLs, add your Anthropic managed
          agent IDs, and the workflow routes will handle threaded lead review and follow-up
          questions.
        </p>
      </div>
    </main>
  );
}
