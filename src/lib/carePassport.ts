import { randomUUID } from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

export interface EmergencyRequest {
  id: string;
  clinicianId: string;
  clinicianEmail: string;
  approvals: string[];
  requestedAt: string;
  unlockedAt?: string;
  revokedAt?: string;
}

export interface CareRecord {
  id: string;
  ownerId: string;
  ownerEmail: string;
  title: string;
  category: string;
  value: string;
  createdAt: string;
  trustedContacts: string[];
  grants: Array<{ clinicianEmail: string; grantedAt: string }>;
  emergencyRequests: EmergencyRequest[];
}

const DATA_DIR = join(process.cwd(), "data");
const DATA_FILE = join(DATA_DIR, "care-passport.json");

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isEmail(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  );
}

export function readCareRecords(): CareRecord[] {
  if (!existsSync(DATA_FILE)) return [];
  const contents = readFileSync(DATA_FILE, "utf8");
  const records: unknown = JSON.parse(contents);
  if (!Array.isArray(records)) {
    throw new Error("Care Passport data file must contain a record array.");
  }
  return records as CareRecord[];
}

export function writeCareRecords(records: CareRecord[]): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), "utf8");
}

export function createCareRecord(input: Omit<CareRecord, "id" | "createdAt" | "grants" | "emergencyRequests">): CareRecord {
  return {
    ...input,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    grants: [],
    emergencyRequests: [],
  };
}
