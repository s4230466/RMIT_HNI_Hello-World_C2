"use client";

import { useCallback, useEffect, useState } from "react";
import { useCareAuth } from "../care-auth";
import { buttonStyle, CareHeader, cardStyle, careFetch, inputStyle, Notice, pageStyle } from "../care-ui";

interface CareRecord {
  id: string;
  title: string;
  category: string;
  value: string;
  createdAt: string;
  grants: Array<{ clinicianEmail: string; grantedAt: string }>;
}

interface EmergencyRequest {
  id: string;
  recordId: string;
  recordTitle: string;
  clinicianEmail: string;
  approvals: number;
  requiredApprovals: number;
  requestedAt: string;
  unlocked: boolean;
  canApprove: boolean;
  ownedByMe: boolean;
}

export default function PatientPage() {
  const { authenticated, login, logout, token, secureFetch, username, isInitializing, demoMode } = useCareAuth();
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [requests, setRequests] = useState<EmergencyRequest[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Allergy");
  const [value, setValue] = useState("");
  const [contacts, setContacts] = useState(["", "", ""]);
  const [grantEmails, setGrantEmails] = useState<Record<string, string>>({});
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
      setStatus(error instanceof Error ? error.message : "Unable to load Patient data.");
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

  const createRecord = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await careFetch(secureFetch, token, "/api/records", {
        method: "POST",
        body: JSON.stringify({ title, category, value, trustedContacts: contacts }),
      });
      setTitle("");
      setValue("");
      setContacts(["", "", ""]);
      setStatus("Synthetic record created.");
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to create record.");
    }
  };

  const changeGrant = async (recordId: string, clinicianEmail: string, grant: boolean) => {
    try {
      const url = grant
        ? `/api/grants?id=${encodeURIComponent(recordId)}`
        : `/api/grants?id=${encodeURIComponent(recordId)}&clinicianEmail=${encodeURIComponent(clinicianEmail)}`;
      await careFetch(secureFetch, token, url, {
        method: grant ? "POST" : "DELETE",
        ...(grant ? { body: JSON.stringify({ clinicianEmail }) } : {}),
      });
      setStatus(grant ? `Access granted to ${clinicianEmail}.` : `Access revoked for ${clinicianEmail}.`);
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to change record access.");
    }
  };

  const approveRequest = async (requestId: string) => {
    try {
      await careFetch(secureFetch, token, "/api/emergency/approvals", {
        method: "POST",
        body: JSON.stringify({ requestId }),
      });
      setStatus("Trusted-contact approval recorded.");
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to approve request.");
    }
  };

  const revokeEmergency = async (requestId: string) => {
    try {
      await careFetch(secureFetch, token, `/api/emergency?requestId=${encodeURIComponent(requestId)}`, { method: "DELETE" });
      setStatus("Emergency access revoked.");
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to revoke emergency access.");
    }
  };

  return (
    <main style={pageStyle}>
      <CareHeader role="Patient" username={username} logout={() => void logout()} />
      <p>Create synthetic records, grant access to one clinician by email, and review emergency requests.</p>
      <section style={cardStyle}>
        <h2>Create a mock health record</h2>
        <form onSubmit={createRecord}>
          <input style={inputStyle} placeholder="Record title (e.g. Penicillin allergy)" value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={120} />
          <select style={inputStyle} value={category} onChange={(event) => setCategory(event.target.value)}>
            <option>Allergy</option><option>Lab result</option><option>Medication</option><option>Other</option>
          </select>
          <textarea style={inputStyle} placeholder="Synthetic details only" value={value} onChange={(event) => setValue(event.target.value)} required maxLength={2000} rows={3} />
          <h3>Three trusted-contact emails</h3>
          <p>Each contact must sign in to this demo with the matching email. The patient account cannot approve its own request.</p>
          {contacts.map((contact, index) => (
            <input
              key={index}
              style={inputStyle}
              type="email"
              placeholder={`Trusted contact ${index + 1}`}
              value={contact}
              onChange={(event) => setContacts((current) => current.map((item, i) => i === index ? event.target.value : item))}
              required
            />
          ))}
          <button style={buttonStyle} type="submit">Create record</button>
        </form>
      </section>

      {status && <Notice>{status}</Notice>}

      <section>
        <h2>Your records ({records.length})</h2>
        {records.map((record) => (
          <article key={record.id} style={cardStyle}>
            <h3>{record.title} <small>({record.category})</small></h3>
            <p>{record.value}</p>
            <small>Record ID: <code>{record.id}</code></small>
            <p>Created {new Date(record.createdAt).toLocaleString()}</p>
            <div>
              <input
                style={inputStyle}
                type="email"
                placeholder="Specific clinician's verified email"
                value={grantEmails[record.id] || ""}
                onChange={(event) => setGrantEmails((current) => ({ ...current, [record.id]: event.target.value }))}
              />
              <button style={buttonStyle} onClick={() => void changeGrant(record.id, grantEmails[record.id] || "", true)}>Grant</button>
              {record.grants.map((grant) => (
                <button
                  key={grant.clinicianEmail}
                  style={{ ...buttonStyle, background: "#b42318" }}
                  onClick={() => void changeGrant(record.id, grant.clinicianEmail, false)}
                >
                  Revoke {grant.clinicianEmail}
                </button>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section>
        <h2>Emergency requests and trusted-contact approvals</h2>
        {requests.length === 0 && <p>No emergency requests.</p>}
        {requests.map((request) => (
          <article key={request.id} style={cardStyle}>
            <strong>{request.recordTitle}</strong>
            <p>Clinician {request.clinicianEmail} · {request.approvals}/{request.requiredApprovals} approvals · {request.unlocked ? "unlocked" : "locked"}</p>
            {request.canApprove && !request.unlocked && (
              <button style={buttonStyle} onClick={() => void approveRequest(request.id)}>Approve as trusted contact</button>
            )}
            {request.ownedByMe && (
              <button style={{ ...buttonStyle, background: "#b42318" }} onClick={() => void revokeEmergency(request.id)}>Revoke request/access</button>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
