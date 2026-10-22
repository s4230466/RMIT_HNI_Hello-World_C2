"use client";

import type { ReactNode } from "react";

export const pageStyle: React.CSSProperties = {
  maxWidth: 820,
  margin: "2rem auto",
  padding: "0 1rem 3rem",
  color: "#202124",
  fontFamily: "Arial, sans-serif",
};

export const cardStyle: React.CSSProperties = {
  border: "1px solid #d7dce2",
  borderRadius: 8,
  padding: "1rem",
  margin: "1rem 0",
  background: "#fff",
};

export const inputStyle: React.CSSProperties = {
  display: "block",
  boxSizing: "border-box",
  width: "100%",
  margin: "0.5rem 0",
  padding: "0.65rem",
  border: "1px solid #aeb7c2",
  borderRadius: 4,
  font: "inherit",
};

export const buttonStyle: React.CSSProperties = {
  padding: "0.6rem 0.9rem",
  border: 0,
  borderRadius: 4,
  background: "#155eef",
  color: "#fff",
  cursor: "pointer",
  margin: "0.2rem",
};

export function CareHeader({
  role,
  username,
  logout,
}: {
  role: string;
  username: string;
  logout: () => void;
}) {
  return (
    <header style={{ display: "flex", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
      <div>
        <h1 style={{ marginBottom: "0.2rem" }}>Care Passport</h1>
        <span>{role} · {username}</span>
      </div>
      <div>
        <a href="/" style={{ marginRight: "0.8rem" }}>Home</a>
        <button onClick={logout} style={buttonStyle}>Log out</button>
      </div>
    </header>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <p role="status" style={{ padding: "0.75rem", background: "#f1f5f9", borderRadius: 4 }}>
      {children}
    </p>
  );
}

export async function careFetch<T>(
  secureFetch: ((url: string | URL | RequestInfo, init?: RequestInit) => Promise<Response>) | null,
  token: string | null,
  input: string | URL,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const url = new URL(input.toString(), window.location.origin).href;
  if (secureFetch) {
    if (!token) throw new Error("TideCloak access token is unavailable.");
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = secureFetch
    ? await secureFetch(url, { ...init, headers })
    : await fetch(url, { ...init, headers });
  const data: unknown = await response.json();
  if (!response.ok) {
    const message = data && typeof data === "object" && "error" in data
      ? String(data.error)
      : `Request failed with status ${response.status}.`;
    throw new Error(message);
  }
  return data as T;
}
