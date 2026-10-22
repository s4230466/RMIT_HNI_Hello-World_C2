import { NextRequest } from "next/server";
import {
  createDemoSession,
  DEMO_COOKIE,
  demoRoleFromSession,
  isDemoMode,
  verifyDemoSession,
} from "@/lib/demoSession";

export async function GET(request: NextRequest) {
  if (!isDemoMode()) return Response.json({ error: "Local demo mode is disabled." }, { status: 404 });
  const session = verifyDemoSession(request);
  return Response.json({
    enabled: true,
    session: session
      ? { email: session.email, role: demoRoleFromSession(session) }
      : null,
  });
}

export async function POST(request: NextRequest) {
  if (!isDemoMode()) return Response.json({ error: "Local demo mode is disabled." }, { status: 404 });
  try {
    const body: unknown = await request.json();
    const session = body && typeof body === "object"
      ? createDemoSession(
          (body as Record<string, unknown>).role,
          (body as Record<string, unknown>).email
        )
      : null;
    if (!session) return Response.json({ error: "Role and email are required." }, { status: 400 });
    const response = Response.json({ authenticated: true });
    response.headers.append(
      "Set-Cookie",
      `${DEMO_COOKIE}=${session}; HttpOnly; Path=/; SameSite=Strict; Max-Age=28800`
    );
    return response;
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unable to start local demo session." },
      { status: 400 }
    );
  }
}

export async function DELETE() {
  if (!isDemoMode()) return Response.json({ error: "Local demo mode is disabled." }, { status: 404 });
  const response = Response.json({ authenticated: false });
  response.headers.append(
    "Set-Cookie",
    `${DEMO_COOKIE}=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0`
  );
  return response;
}
