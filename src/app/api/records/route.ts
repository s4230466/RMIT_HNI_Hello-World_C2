import { withAuth, withRole } from "@/lib/auth/middleware";
import { hasRole } from "@/lib/auth/tideJWT";
import {
  createCareRecord,
  isEmail,
  normalizeEmail,
  readCareRecords,
  writeCareRecords,
} from "@/lib/carePassport";

export const GET = withAuth(async (_req, jwt) => {
  if (hasRole(jwt, "platform-admin")) {
    return Response.json({ error: "Platform Admin cannot read health records." }, { status: 403 });
  }

  if (hasRole(jwt, "clinician")) {
    const email = typeof jwt.email === "string" ? normalizeEmail(jwt.email) : "";
    if (!email || jwt.email_verified !== true) {
      return Response.json({ error: "A verified account email is required." }, { status: 403 });
    }
    const records = readCareRecords()
      .filter((record) =>
        record.grants.some((grant) => grant.clinicianEmail === email) ||
        record.emergencyRequests.some((request) =>
          request.clinicianEmail === email && request.unlockedAt && !request.revokedAt
        )
      )
      .map(({ id, ownerEmail, title, category, value, createdAt }) => ({
        id,
        ownerEmail,
        title,
        category,
        value,
        createdAt,
      }));
    return Response.json({ records });
  }

  if (hasRole(jwt, "patient")) {
    const records = readCareRecords().filter((record) => record.ownerId === jwt.sub);
    return Response.json({ records });
  }

  return Response.json({ error: "This role cannot read health records." }, { status: 403 });
});

export const POST = withRole("patient", async (req, jwt) => {
  if (hasRole(jwt, "platform-admin") || hasRole(jwt, "clinician")) {
    return Response.json({ error: "Only Patient accounts can create health records." }, { status: 403 });
  }
  if (!jwt.sub) return Response.json({ error: "User identity is missing." }, { status: 403 });
  const body: unknown = await req.json();
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid record." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const ownerEmail = typeof jwt.email === "string" ? normalizeEmail(jwt.email) : "";
  if (!ownerEmail || jwt.email_verified !== true) {
    return Response.json({ error: "Your TideCloak account must have a verified email address." }, { status: 403 });
  }
  const contacts = Array.isArray(input.trustedContacts)
    ? input.trustedContacts.filter(isEmail).map(normalizeEmail)
    : [];

  if (
    typeof input.title !== "string" || input.title.trim().length < 1 || input.title.length > 120 ||
    typeof input.category !== "string" || input.category.trim().length < 1 || input.category.length > 80 ||
    typeof input.value !== "string" || input.value.trim().length < 1 || input.value.length > 2000 ||
    contacts.length !== 3 || new Set(contacts).size !== 3 ||
    contacts.includes(ownerEmail)
  ) {
    return Response.json({
      error: "Provide a title, category, value, and three distinct trusted-contact emails other than your own.",
    }, { status: 400 });
  }

  const record = createCareRecord({
    ownerId: jwt.sub,
    ownerEmail,
    title: input.title.trim(),
    category: input.category.trim(),
    value: input.value.trim(),
    trustedContacts: contacts,
  });
  const records = readCareRecords();
  records.push(record);
  writeCareRecords(records);
  return Response.json({ record }, { status: 201 });
});
