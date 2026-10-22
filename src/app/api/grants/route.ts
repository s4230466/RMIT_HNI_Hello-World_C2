import { withRole } from "@/lib/auth/middleware";
import { hasRole } from "@/lib/auth/tideJWT";
import { isEmail, normalizeEmail, readCareRecords, writeCareRecords } from "@/lib/carePassport";

export const POST = withRole("patient", async (req, jwt) => {
  if (hasRole(jwt, "platform-admin") || hasRole(jwt, "clinician")) {
    return Response.json({ error: "Only Patient accounts can change record access." }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !jwt.sub) return Response.json({ error: "Record id is required." }, { status: 400 });
  if (jwt.email_verified !== true) {
    return Response.json({ error: "A verified account email is required." }, { status: 403 });
  }
  const body: unknown = await req.json();
  const clinicianEmail = body && typeof body === "object"
    ? (body as Record<string, unknown>).clinicianEmail
    : undefined;
  if (!isEmail(clinicianEmail)) {
    return Response.json({ error: "A valid clinician email is required." }, { status: 400 });
  }

  const records = readCareRecords();
  const record = records.find((item) => item.id === id && item.ownerId === jwt.sub);
  if (!record) return Response.json({ error: "Record not found." }, { status: 404 });
  const email = normalizeEmail(clinicianEmail);
  if (record.ownerEmail === email) {
    return Response.json({ error: "You cannot grant access to your own account." }, { status: 400 });
  }
  record.grants = record.grants.filter((grant) => grant.clinicianEmail !== email);
  record.grants.push({ clinicianEmail: email, grantedAt: new Date().toISOString() });
  writeCareRecords(records);
  return Response.json({ success: true });
});

export const DELETE = withRole("patient", async (req, jwt) => {
  if (hasRole(jwt, "platform-admin") || hasRole(jwt, "clinician")) {
    return Response.json({ error: "Only Patient accounts can change record access." }, { status: 403 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !jwt.sub) return Response.json({ error: "Record id is required." }, { status: 400 });
  if (jwt.email_verified !== true) {
    return Response.json({ error: "A verified account email is required." }, { status: 403 });
  }
  const clinicianEmail = url.searchParams.get("clinicianEmail");
  if (!clinicianEmail || !isEmail(clinicianEmail)) {
    return Response.json({ error: "A valid clinician email is required." }, { status: 400 });
  }
  const records = readCareRecords();
  const record = records.find((item) => item.id === id && item.ownerId === jwt.sub);
  if (!record) return Response.json({ error: "Record not found." }, { status: 404 });
  record.grants = record.grants.filter(
    (grant) => grant.clinicianEmail !== normalizeEmail(clinicianEmail)
  );
  writeCareRecords(records);
  return Response.json({ success: true });
});
