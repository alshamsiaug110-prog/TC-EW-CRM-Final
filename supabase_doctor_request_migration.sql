-- Doctor request cycle v1
-- Prerequisite: run supabase_booking_migration.sql first.
-- This script only adds tables, indexes, and access policies. It does not
-- delete, update, or reset any existing CRM, attendance, doctor, or booking data.

CREATE TABLE IF NOT EXISTS doctor_booking_requests (
  id TEXT PRIMARY KEY,
  "leadId" TEXT NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  "customerId" TEXT,
  "patientName" TEXT NOT NULL,
  "patientPhone" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL REFERENCES doctors(id) ON DELETE RESTRICT,
  "doctorName" TEXT NOT NULL,
  clinic TEXT NOT NULL,
  department TEXT NOT NULL,
  "requestedDate" TEXT NOT NULL,
  "requestedStartTime" TEXT NOT NULL,
  "requestedEndTime" TEXT NOT NULL,
  "requestStatus" TEXT NOT NULL DEFAULT 'Requested'
    CHECK ("requestStatus" IN ('Requested', 'Approved', 'Needs Reschedule', 'Declined', 'Patient Confirmed', 'Canceled')),
  "requestNote" TEXT NOT NULL DEFAULT '',
  "createdBy" TEXT NOT NULL,
  "createdByRole" TEXT NOT NULL,
  "doctorResponseNote" TEXT NOT NULL DEFAULT '',
  "respondedBy" TEXT,
  "respondedAt" TEXT,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS doctor_booking_requests_doctor_status_idx
  ON doctor_booking_requests ("doctorId", "requestStatus", "updatedAt" DESC);
CREATE INDEX IF NOT EXISTS doctor_booking_requests_lead_idx
  ON doctor_booking_requests ("leadId", "updatedAt" DESC);

CREATE TABLE IF NOT EXISTS booking_request_events (
  id TEXT PRIMARY KEY,
  "requestId" TEXT NOT NULL REFERENCES doctor_booking_requests(id) ON DELETE RESTRICT,
  "leadId" TEXT NOT NULL REFERENCES leads(id) ON DELETE RESTRICT,
  "eventType" TEXT NOT NULL,
  message TEXT NOT NULL,
  "actorName" TEXT NOT NULL,
  "actorRole" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS booking_request_events_lead_idx
  ON booking_request_events ("leadId", "createdAt" DESC);

-- Compatibility policies for the existing PIN-based CRM. Replace these with
-- authenticated least-privilege policies once application identities use Supabase Auth.
ALTER TABLE doctor_booking_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_request_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon doctor request access" ON doctor_booking_requests;
CREATE POLICY "Allow anon doctor request access"
  ON doctor_booking_requests FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated doctor request access" ON doctor_booking_requests;
CREATE POLICY "Allow authenticated doctor request access"
  ON doctor_booking_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon booking request event access" ON booking_request_events;
CREATE POLICY "Allow anon booking request event access"
  ON booking_request_events FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated booking request event access" ON booking_request_events;
CREATE POLICY "Allow authenticated booking request event access"
  ON booking_request_events FOR ALL TO authenticated USING (true) WITH CHECK (true);
