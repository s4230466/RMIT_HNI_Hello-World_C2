"use client";

import { TideCloakProvider } from "@tidecloak/nextjs";
import { CareAuthProvider } from "./care-auth";

export function Providers({
  children,
  adapter,
  demoMode,
}: {
  children: React.ReactNode;
  adapter: Record<string, unknown> | null;
  demoMode: boolean;
}) {
  if (demoMode) {
    return <CareAuthProvider demoMode>{children}</CareAuthProvider>;
  }
  if (!adapter) {
    throw new Error("TideCloak is not bootstrapped. Run `npm run init` or enable local demo mode.");
  }
  return (
    <TideCloakProvider
      config={{ ...adapter, useDPoP: { mode: "strict", alg: "ES256" } }}
    >
      <CareAuthProvider demoMode={false}>{children}</CareAuthProvider>
    </TideCloakProvider>
  );
}
