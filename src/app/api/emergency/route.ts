import { withAuth, withRole } from "@/lib/auth/middleware";
import { hasRole } from "@/lib/auth/tideJWT";
import { randomUUID } from "crypto";
import { normalizeEmail, readCareRecords, writeCareRecords } from "@/lib/carePassport";

export const GET = withAuth(async (_req, jwt) => {
  if (!jwt.sub || hasRole(jwt, "platform-admin")) {
    return Response.json({ error: "This role cannot view emergency requests." }, { status: 403 });
  }
  const email = typeof jwt.email === "string" ? normalizeEmail(jwt.email) : "";
  const verifiedEmail = jwt.email_verified === true ? email : "";
  const requests = readCareRecords().flatMap((record) =>
    record.emergencyRequests
      .filter((request) =>
        (hasRole(jwt, "patient") && record.ownerId === jwt.sub) ||
        (hasRole(jwt, "clinician") && request.clinicianId === jwt.sub) ||
        (verifiedEmail !== "" && record.trustedContacts.includes(verifiedEmail))
      )
      .map((request) => ({
        id: request.id,
        recordId: record.id,
        recordTitle: hasRole(jwt, "clinician") && !request.unlockedAt
          ? "Pending emergency request"
          : record.title,
        ownerEmail: hasRole(jwt, "clinician") && !request.unlockedAt ? null : record.ownerEmail,
        clinicianEmail: request.clinicianEmail,
        approvals: request.approvals.length,
        requiredApprovals: 2,
        requestedAt: request.requestedAt,
        unlocked: Boolean(request.unlockedAt && !request.revokedAt),
        canApprove: record.trustedContacts.includes(verifiedEmail) && record.ownerId !== jwt.sub,
        ownedByMe: record.ownerId === jwt.sub,
      }))
  );
  return Response.json({ requests });
});

export const POST = withRole("clinician", async (req, jwt) => {
  if (hasRole(jwt, "platform-admin")) {
    return Response.json({ error: "Platform Admin cannot request emergency access." }, { status: 403 });
  }
  if (!jwt.sub || typeof jwt.email !== "string" || jwt.email_verified !== true) {
    return Response.json({ error: "Clinician identity and verified email are required." }, { status: 403 });
  }
  const body: unknown = await req.json();
  const recordId = body && typeof body === "object"
    ? (body as Record<string, unknown>).recordId
    : undefined;
  if (typeof recordId !== "string" || !recordId) {
    return Response.json({ error: "Record id is required." }, { status: 400 });
  }

  const records = readCareRecords();
  const record = records.find((item) => item.id === recordId);
  if (!record) return Response.json({ error: "Record not found." }, { status: 404 });
  const email = normalizeEmail(jwt.email);
  if (record.grants.some((grant) => grant.clinicianEmail === email)) {
    return Response.json({ error: "This record is already shared with your account." }, { status: 409 });
  }
  const existing = record.emergencyRequests.find(
    (request) => request.clinicianId === jwt.sub && !request.revokedAt
  );
  if (existing) return Response.json({ error: "An active emergency request already exists." }, { status: 409 });

  record.emergencyRequests.push({
    id: randomUUID(),
    clinicianId: jwt.sub,
    clinicianEmail: email,
    approvals: [],
    requestedAt: new Date().toISOString(),
  });
  writeCareRecords(records);
  return Response.json({ success: true }, { status: 201 });
});

export const DELETE = withRole("patient", async (req, jwt) => {
  if (hasRole(jwt, "platform-admin") || hasRole(jwt, "clinician")) {
    return Response.json({ error: "Only Patient accounts can revoke emergency access." }, { status: 403 });
  }
  const requestId = new URL(req.url).searchParams.get("requestId");
  if (!jwt.sub || !requestId) {
    return Response.json({ error: "Emergency request id is required." }, { status: 400 });
  }
  const records = readCareRecords();
  const request = records
    .filter((record) => record.ownerId === jwt.sub)
    .flatMap((record) => record.emergencyRequests)
    .find((item) => item.id === requestId);
  if (!request) return Response.json({ error: "Emergency request not found." }, { status: 404 });
  request.revokedAt = new Date().toISOString();
  writeCareRecords(records);
  return Response.json({ success: true });
});
