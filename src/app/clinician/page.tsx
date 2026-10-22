"use client";

import { useCallback, useEffect, useState } from "react";
import { useCareAuth } from "../care-auth";
import { buttonStyle, CareHeader, cardStyle, careFetch, inputStyle, Notice, pageStyle } from "../care-ui";

interface CareRecord {
  id: string;
  ownerEmail: string;
  title: string;
  category: string;
  value: string;
  createdAt: string;
}

interface EmergencyRequest {
  id: string;
  recordId: string;
  recordTitle: string;
  approvals: number;
  requiredApprovals: number;
  unlocked: boolean;
}

export default function ClinicianPage() {
  const { authenticated, login, logout, token, secureFetch, username, isInitializing, demoMode } = useCareAuth();
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [recordId, setRecordId] = useState("");
  const [status, setStatus] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [recordData, requestData] = await Promise.all([
        careFetch<{ records: CareRecord[] }>(secureFetch, token, "/api/records"),
        careFetch<{ requests: EmergencyRequest[] }>(secureFetch, token, "/api/emergency"),
      ]);
      setRecords(recordData.records);
      setRequests(requestData.requests);
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to load Clinician data.");
    }
  }, [token, secureFetch]);

  useEffect(() => {
    if (authenticated) void refresh();
  }, [authenticated, refresh]);

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

  const requestEmergencyAccess = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await careFetch(secureFetch, token, "/api/emergency", {
        method: "POST",
        body: JSON.stringify({ recordId }),
      });
      setRecordId("");
      setStatus("Emergency request sent. The record unlocks only after two different trusted contacts approve.");
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to request emergency access.");
    }
  };

  return (
    <main style={pageStyle}>
      <CareHeader role="Clinician" username={username} logout={() => void logout()} />
      <p>Only records shared with your account or unlocked by two trusted contacts appear below.</p>
      <section style={cardStyle}>
        <h2>Request emergency access</h2>
        <form onSubmit={requestEmergencyAccess}>
          <input style={inputStyle} placeholder="Patient-provided record ID" value={recordId} onChange={(event) => setRecordId(event.target.value)} required />
          <button style={buttonStyle} type="submit">Request access</button>
        </form>
      </section>
      {status && <Notice>{status}</Notice>}
      <section>
        <h2>Accessible records ({records.length})</h2>
        {records.length === 0 && <p>No records are currently available to this account.</p>}
        {records.map((record) => (
          <article key={record.id} style={cardStyle}>
            <h3>{record.title} <small>({record.category})</small></h3>
            <p>{record.value}</p>
            <small>Patient: {record.ownerEmail} · ID: <code>{record.id}</code></small>
          </article>
        ))}
      </section>
      <section>
        <h2>Your emergency requests</h2>
        {requests.map((request) => (
          <article key={request.id} style={cardStyle}>
            <strong>{request.recordTitle}</strong>
            <p>{request.approvals}/{request.requiredApprovals} approvals · {request.unlocked ? "unlocked" : "waiting for trusted contacts"}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
