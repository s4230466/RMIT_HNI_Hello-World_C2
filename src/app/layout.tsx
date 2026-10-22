import { Providers } from "./providers";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

const demoMode =
  process.env.CARE_PASSPORT_DEMO_MODE === "true" &&
  process.env.NODE_ENV !== "production";

function loadAdapter(): Record<string, unknown> | null {
  const adapterPath = join(process.cwd(), "data", "tidecloak.json");
  if (!existsSync(adapterPath)) return null;
  const adapter: unknown = JSON.parse(readFileSync(adapterPath, "utf8"));
  if (!adapter || typeof adapter !== "object" || Array.isArray(adapter)) {
    throw new Error("data/tidecloak.json must contain TideCloak adapter configuration.");
  }
  return adapter as Record<string, unknown>;
}

export const metadata = {
  title: "Care Passport",
  description: "Synthetic health-record sharing prototype",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "1rem", background: "#f8fafc", color: "#202124" }}>
        <Providers adapter={demoMode ? null : loadAdapter()} demoMode={demoMode}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
