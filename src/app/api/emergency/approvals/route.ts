import { withAuth } from "@/lib/auth/middleware";
import { hasRole } from "@/lib/auth/tideJWT";
import { normalizeEmail, readCareRecords, writeCareRecords } from "@/lib/carePassport";

export const POST = withAuth(async (req, jwt) => {
  if (
    !jwt.sub ||
    typeof jwt.email !== "string" ||
    jwt.email_verified !== true ||
    hasRole(jwt, "platform-admin")
  ) {
    return Response.json({ error: "A verified email on a non-admin trusted-contact account is required." }, { status: 403 });
  }
  const body: unknown = await req.json();
  const requestId = body && typeof body === "object"
    ? (body as Record<string, unknown>).requestId
    : undefined;
  if (typeof requestId !== "string" || !requestId) {
    return Response.json({ error: "Emergency request id is required." }, { status: 400 });
  }

  const email = normalizeEmail(jwt.email);
  const records = readCareRecords();
  const record = records.find((item) =>
    item.emergencyRequests.some((request) => request.id === requestId)
  );
  const request = record?.emergencyRequests.find((item) => item.id === requestId);
  if (!record || !request || request.revokedAt) {
    return Response.json({ error: "Emergency request not found or revoked." }, { status: 404 });
  }
  if (record.ownerId === jwt.sub || !record.trustedContacts.includes(email)) {
    return Response.json({ error: "Only a trusted contact can approve this request." }, { status: 403 });
  }
  if (request.approvals.includes(email)) {
    return Response.json({ error: "This trusted contact has already approved." }, { status: 409 });
  }

  request.approvals.push(email);
  if (request.approvals.length >= 2) request.unlockedAt = new Date().toISOString();
  writeCareRecords(records);
  return Response.json({
    approved: true,
    approvals: request.approvals.length,
    unlocked: Boolean(request.unlockedAt),
  });
});
