# Care Passport

Care Passport is a prototype for sharing synthetic health records with patient-controlled, clinician-specific access and a two-contact emergency approval.

#### 1. Vision & originality
Care Passport treats each health record as something a patient shares deliberately, not as an all-or-nothing patient chart. Patients can grant or revoke access for a specific clinician, record by record.

#### 2. Trust constraint insight
Sharing health information across care settings is difficult when patients cannot limit who sees it, or when emergency access depends on a single person. This prototype explores a narrower grant and an emergency path that needs agreement from two of three trusted contacts.

#### 3. Value & impact
Patients get more control over sensitive details; clinicians can access information relevant to care. For example, a clinician without a grant can request an allergy record in an emergency, but cannot read it until two trusted contacts approve.

#### 4. Why TideCloak matters
The TideCloak-backed app path is designed to use TideCloak sign-in, verified role claims, and JWT/DPoP-protected API requests. Those identity and request protections complement the app's per-record sharing rules. TideCloak initialization currently fails during upstream ORK key generation, so the working walkthrough uses a local demo session instead; that mode does not use TideCloak.

#### 5. Prototype & storytelling
The local prototype demonstrates patient record creation, clinician-specific grants and revocation, and emergency access after two distinct trusted-contact approvals. Judges can create a mock record, sign in as the clinician to see access denied, then approve as two contacts and return as that clinician to see it unlocked. The Platform Admin role cannot read records through the app.

## Setup instructions

### Run the standalone prototype

Prerequisite: Node.js 20 or newer. The standalone demo uses a local, signed session to simulate the three roles. It does not use TideCloak and is only for local synthetic-data testing. In PowerShell run:

```powershell
Set-Location C:\Users\Admin\Desktop\care_passport
npm install
npm run demo
```

Open `http://127.0.0.1:3000`, choose a role and enter a demo email. Use three different emails to simulate a patient, clinician, and trusted contacts. The app stores synthetic records in `data/care-passport.json`.

If the app previously failed during TideCloak bootstrap, do not rerun `npm run init` for the standalone demo.

### Optional: run with TideCloak

The TideCloak-backed setup requires Node.js, Docker Desktop, Git Bash, `curl`, and `jq`. Configure the Tide bootstrap values in the ignored `.env`, start Docker Desktop, then run:

```powershell
Set-Location C:\Users\Admin\Desktop\care_passport
npm run init
npm run dev
```

The init script creates a local TideCloak realm and prints an account-link invite. Open it in a browser and complete the link step. The initial Tide key-generation failure (`TIDE-IDPEXT-VENDOR-KEYGEN_FAILED`) is an upstream ORK setup error; the standalone prototype does not depend on it.

## Roles and access rules

The realm defines `patient`, `clinician`, and `platform-admin` roles. New accounts receive no app role by default; assign exactly one of these roles to each test account in TideCloak. The API also gives `platform-admin` precedence and denies its record and access-rule requests if roles are accidentally combined.

- **Patient:** creates mock records, grants/revokes access by the clinician's exact verified account email, defines three trusted-contact emails per record, and can revoke emergency access.
- **Clinician:** reads only records granted to that verified email, or records whose emergency request has two distinct trusted-contact approvals.
- **Platform Admin:** has no record-read or access-rule API; the page is informational only.
- **Trusted contacts:** any authenticated, non-admin account with a verified email matching one of the three patient-specified contacts can approve once. The record unlocks after two distinct contacts approve.

In TideCloak mode, TideCloak enforces sign-in, verified JWT/DPoP requests, and role claims. In standalone demo mode, a signed, HTTP-only local session simulates a chosen role and account. The app's protected API enforces record ownership, per-email grants/revocations, and the 2-of-3 approval threshold in both modes. These rules are application logic, not a TideCloak/Forseti policy or a multi-admin governance contract.

## Prototype limitations

- Use **synthetic data only**. The demo API stores record values as plain text in `data/care-passport.json`; the app Platform Admin role cannot retrieve that file through the app, but a machine/operator with filesystem or database access can. This is not suitable for real health information.
- Standalone demo sign-in is role simulation, not identity verification. Anyone with local access can choose any role; keep the server bound to `127.0.0.1` using `npm run demo`. Demo mode is disabled when `NODE_ENV=production`.
- The Tide E2EE starter's self-encryption does not support clinician sharing. Tide's network-enforced shared encryption requires additional realm roles and a browser policy-signing ceremony; it is not wired into this prototype.
- App roles cannot modify the access rules through the app. A realm owner with direct TideCloak administration can still alter role assignments or the deployment; production needs separate, governed realm administration and shared-encryption policies.
- Storage is a local JSON file with no production concurrency, audit, backup, or retention guarantees. Revocation blocks subsequent app reads but cannot retract information a clinician already viewed or copied.

## Pages

- `/patient`
- `/clinician`
- `/admin`

All protected API requests use Tide's `secureFetch`, and server routes verify the JWT and DPoP proof.
