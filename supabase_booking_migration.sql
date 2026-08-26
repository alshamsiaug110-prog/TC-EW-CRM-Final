-- Eye World / Top Care booking module v1
-- Run this after the existing CRM schema in Supabase SQL Editor.

ALTER TABLE leads ADD COLUMN IF NOT EXISTS "customerId" TEXT;
CREATE INDEX IF NOT EXISTS leads_customer_id_idx ON leads ("customerId");

CREATE TABLE IF NOT EXISTS doctors (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  clinic TEXT NOT NULL DEFAULT 'Eye World',
  department TEXT NOT NULL DEFAULT 'Eye World Hospital',
  degree TEXT NOT NULL DEFAULT '',
  specialty TEXT NOT NULL DEFAULT '',
  branch TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  "consultationFee" TEXT NOT NULL DEFAULT '',
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT NOT NULL DEFAULT '',
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL
);

ALTER TABLE doctors ADD COLUMN IF NOT EXISTS clinic TEXT NOT NULL DEFAULT 'Eye World';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS department TEXT NOT NULL DEFAULT 'Eye World Hospital';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS degree TEXT NOT NULL DEFAULT '';
ALTER TABLE doctors ADD COLUMN IF NOT EXISTS "consultationFee" TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS doctor_availability (
  id TEXT PRIMARY KEY,
  "doctorId" TEXT NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  "dayOfWeek" INTEGER NOT NULL CHECK ("dayOfWeek" BETWEEN 0 AND 6),
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  "slotDurationMinutes" INTEGER NOT NULL DEFAULT 30 CHECK ("slotDurationMinutes" BETWEEN 5 AND 240),
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE ("doctorId", "dayOfWeek")
);

CREATE TABLE IF NOT EXISTS appointments (
  id TEXT PRIMARY KEY,
  "leadId" TEXT,
  "customerId" TEXT,
  "patientName" TEXT NOT NULL,
  "patientPhone" TEXT NOT NULL,
  "doctorId" TEXT NOT NULL REFERENCES doctors(id),
  "doctorName" TEXT NOT NULL,
  branch TEXT NOT NULL,
  "appointmentDate" TEXT NOT NULL,
  "startTime" TEXT NOT NULL,
  "endTime" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Canceled', 'Rescheduled', 'Completed', 'No-Show')),
  "bookingSource" TEXT NOT NULL DEFAULT 'Other',
  notes TEXT NOT NULL DEFAULT '',
  "createdBy" TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "canceledReason" TEXT
);

CREATE INDEX IF NOT EXISTS appointments_date_idx ON appointments ("appointmentDate");
CREATE INDEX IF NOT EXISTS appointments_doctor_date_idx ON appointments ("doctorId", "appointmentDate");
CREATE UNIQUE INDEX IF NOT EXISTS appointments_active_slot_idx
  ON appointments ("doctorId", "appointmentDate", "startTime")
  WHERE status IN ('Pending', 'Confirmed');

-- Compatibility policies for the existing PIN-based CRM. Replace these with
-- authenticated, least-privilege policies before production use.
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctor_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anon booking access" ON doctors;
CREATE POLICY "Allow anon booking access" ON doctors FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon availability access" ON doctor_availability;
CREATE POLICY "Allow anon availability access" ON doctor_availability FOR ALL TO anon USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon appointment access" ON appointments;
CREATE POLICY "Allow anon appointment access" ON appointments FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated booking access" ON doctors;
CREATE POLICY "Allow authenticated booking access" ON doctors FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated availability access" ON doctor_availability;
CREATE POLICY "Allow authenticated availability access" ON doctor_availability FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Allow authenticated appointment access" ON appointments;
CREATE POLICY "Allow authenticated appointment access" ON appointments FOR ALL TO authenticated USING (true) WITH CHECK (true);
