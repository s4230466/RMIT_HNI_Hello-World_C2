"use client";

import { useState } from "react";
import { useCareAuth } from "../care-auth";
import { buttonStyle, CareHeader, cardStyle, Notice, pageStyle } from "../care-ui";

export default function PlatformAdminPage() {
  const { authenticated, login, logout, username, isInitializing, demoMode } = useCareAuth();
  const [status, setStatus] = useState("");

  if (isInitializing) return <main style={pageStyle}>Loading TideCloak…</main>;
  if (!authenticated) {
    return (
      <main style={pageStyle}>
        <p>{demoMode ? "Choose a demo role and account from the home page." : "Sign in to continue."}</p>
        {demoMode ? (
          <a href="/" style={buttonStyle}>Choose demo account</a>
        ) : (
          <button
            onClick={() => void login().catch((error: unknown) =>
              setStatus(error instanceof Error ? error.message : "Sign-in failed.")
            )}
            style={buttonStyle}
          >
            Sign in with Tide
          </button>
        )}
        {status && <Notice>{status}</Notice>}
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <CareHeader role="Platform Admin" username={username} logout={() => void logout()} />
      <section style={cardStyle}>
        <h2>Platform administration</h2>
        <p>This role has no health-record read endpoint and cannot grant, revoke, or approve access by itself.</p>
        <p>Record access is controlled by the Patient and the two-of-three trusted-contact emergency workflow.</p>
      </section>
    </main>
  );
}
