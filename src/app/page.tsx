"use client";

import { useState } from "react";
import { useCareAuth } from "./care-auth";
import { buttonStyle, inputStyle, Notice, pageStyle } from "./care-ui";

export default function HomePage() {
  const { authenticated, login, logout, username, isInitializing, demoMode } = useCareAuth();
  const [role, setRole] = useState("patient");
  const [email, setEmail] = useState("patient@example.test");
  const [status, setStatus] = useState("");

  if (isInitializing) return <main style={pageStyle}>Loading TideCloak…</main>;

  return (
    <main style={{ ...pageStyle, maxWidth: 640, textAlign: "center" }}>
      <h1>Care Passport</h1>
      <p>Synthetic health-record sharing and emergency-access prototype.</p>
      {!authenticated ? demoMode ? (
        <form
          style={{ ...pageStyle, maxWidth: 420, textAlign: "left", margin: "1rem auto" }}
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await login(role, email);
              setStatus("");
            } catch (error) {
              setStatus(error instanceof Error ? error.message : "Local demo sign-in failed.");
            }
          }}
        >
          <h2>Local demo sign-in</h2>
          <label htmlFor="demo-role">Choose a role</label>
          <select id="demo-role" value={role} onChange={(event) => setRole(event.target.value)} style={inputStyle}>
            <option value="patient">Patient</option>
            <option value="clinician">Clinician</option>
            <option value="platform-admin">Platform Admin</option>
          </select>
          <label htmlFor="demo-email">Demo account email</label>
          <input id="demo-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} style={inputStyle} required />
          <button type="submit" style={buttonStyle}>Enter local demo</button>
          {status && <Notice>{status}</Notice>}
          <p style={{ color: "#555" }}>Local prototype only; use synthetic data. Choose other emails to simulate clinicians and trusted contacts.</p>
        </form>
      ) : (
        <button onClick={() => void login()} style={buttonStyle}>Sign in with Tide</button>
      ) : (
        <>
          <p>Signed in as {username}</p>
          <nav style={{ display: "flex", gap: "0.5rem", justifyContent: "center", flexWrap: "wrap" }}>
            <a href="/patient" style={buttonStyle}>Patient page</a>
            <a href="/clinician" style={buttonStyle}>Clinician page</a>
            <a href="/admin" style={buttonStyle}>Platform Admin page</a>
          </nav>
          <p style={{ color: "#555" }}>{demoMode ? "Local demo role controls which protected APIs respond." : "Your TideCloak role determines which protected APIs respond."}</p>
          <button onClick={() => void logout()} style={{ ...buttonStyle, background: "#555" }}>Log out</button>
        </>
      )}
    </main>
  );
}
