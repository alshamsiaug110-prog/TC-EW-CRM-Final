-- Booking directory seed from the supplied schedule images.
-- Run after supabase_booking_migration.sql.
-- Eye World doctor hours are intentionally not seeded here where the image time text is unclear;
-- verify those hours in the Admin availability editor before accepting bookings.

INSERT INTO doctors (id, name, clinic, department, degree, specialty, branch, phone, "consultationFee", "isActive", notes, "createdAt", "updatedAt") VALUES
('ew-ihab-saad-othman', 'أ.د. إيهاب سعد عثمان', 'Eye World', 'Eye World Hospital', 'أستاذ استشاري', 'شبكية / قرنية / قزحية / أورام عيون / مياه بيضاء / زرقاء / شبكية أطفال / تصحيح إبصار', 'مستشفى دنيا العيون', '', '1200 كشف / 250 استشارة / 1500 مستعجل', TRUE, 'Imported from supplied Eye World schedule image; verify availability before booking.', now()::text, now()::text),
('ew-hesham-ghareeb', 'د. هشام غريب', 'Eye World', 'Eye World Hospital', 'استشاري', 'قرنية / مياه بيضاء / جلوكوما / تصحيح إبصار', 'مستشفى دنيا العيون', '', '900', TRUE, 'Imported from supplied Eye World schedule image; verify availability before booking.', now()::text, now()::text),
('ew-mahmoud-elbanna', 'د. محمود البنا', 'Eye World', 'Eye World Hospital', 'استشاري', 'شبكية / جسم زجاجي', 'مستشفى دنيا العيون', '', '900', TRUE, 'Imported from supplied Eye World schedule image; verify availability before booking.', now()::text, now()::text),
('ew-youssef-fouad', 'د. يوسف فؤاد', 'Eye World', 'Eye World Hospital', 'استشاري', 'الشبكية / التهاب القزحية / حقن للشبكية', 'مستشفى دنيا العيون', '', '900', TRUE, 'Imported from supplied Eye World schedule image; verify availability before booking.', now()::text, now()::text),
('ew-ahmed-essam', 'د. أحمد عصام', 'Eye World', 'Eye World Hospital', 'استشاري', 'مياه بيضاء', 'مستشفى دنيا العيون', '', '900', TRUE, 'Imported from supplied Eye World schedule image; verify availability before booking.', now()::text, now()::text),
('ew-asmaa-mohamed-wahba', 'د. أسماء محمد وهبة', 'Eye World', 'Eye World Hospital', 'أخصائي', 'قنوات دمعية / تجميل جفون', 'مستشفى دنيا العيون', '', '500', TRUE, 'Imported from supplied Eye World schedule image; verify availability before booking.', now()::text, now()::text),
('ew-shimaa-eltaher', 'د. شيماء الطاهر', 'Eye World', 'Eye World Hospital', 'استشاري', 'تجميل جفون / قنوات دمعية', 'مستشفى دنيا العيون', '', '900', TRUE, 'Imported from supplied Eye World schedule image; verify availability before booking.', now()::text, now()::text),
('ew-nermin-behgat', 'د. نرمين بهجت', 'Eye World', 'Eye World Hospital', 'استشاري', 'أطفال / حول / كسل', 'مستشفى دنيا العيون', '', '900', TRUE, 'Imported from supplied Eye World schedule image; verify availability before booking.', now()::text, now()::text),
('ew-esraa-elkholy', 'د. إسراء الخولي', 'Eye World', 'Eye World Hospital', 'أخصائي', 'أطفال / حول / كسل', 'مستشفى دنيا العيون', '', '500', TRUE, 'Imported from supplied Eye World schedule image; verify availability before booking.', now()::text, now()::text),
('tc-kariman', 'د. كاريمان', 'Top Care', 'Dermatology', 'أخصائي', 'جلدية', 'Top Care', '', '', TRUE, 'Saturday schedule from supplied Top Care image.', now()::text, now()::text),
('tc-raeda-youssef', 'د. رائدة يوسف', 'Top Care', 'Dermatology', 'أستاذ استشاري', 'جلدية', 'Top Care', '', '', TRUE, 'Sunday schedule from supplied Top Care image.', now()::text, now()::text),
('tc-mona-elkolyoby', 'د. منى القليوبي', 'Top Care', 'Dermatology', 'استشاري', 'جلدية', 'Top Care', '', '', TRUE, 'Sunday schedule from supplied Top Care image.', now()::text, now()::text),
('tc-gihad', 'د. جهاد', 'Top Care', 'Dermatology', 'أخصائي', 'جلدية', 'Top Care', '', '', TRUE, 'Sunday schedule from supplied Top Care image.', now()::text, now()::text),
('tc-nehla-hantar', 'د. نهلة حنتر', 'Top Care', 'Dermatology', 'أستاذ استشاري', 'جلدية', 'Top Care', '', '', TRUE, 'Sunday schedule from supplied Top Care image.', now()::text, now()::text),
('tc-samia-esmat', 'د. سامية عصمت', 'Top Care', 'Dermatology', 'أستاذ استشاري', 'جلدية', 'Top Care', '', '', TRUE, 'Monday schedule from supplied Top Care image.', now()::text, now()::text),
('tc-eman-seny', 'د. إيمان سني', 'Top Care', 'Dermatology', 'استشاري', 'جلدية', 'Top Care', '', '', TRUE, 'Monday schedule from supplied Top Care image.', now()::text, now()::text),
('tc-sara-elsayed', 'د. سارة السيد', 'Top Care', 'Dermatology', 'أخصائي', 'جلدية', 'Top Care', '', '', TRUE, 'Monday schedule from supplied Top Care image.', now()::text, now()::text),
('tc-hesham-hamdy', 'د. هشام حمدي', 'Top Care', 'Dermatology', 'أخصائي', 'جلدية', 'Top Care', '', '', TRUE, 'Monday schedule from supplied Top Care image.', now()::text, now()::text),
('tc-enas-shaker', 'د. إيناس شاكر', 'Top Care', 'Dermatology', 'أستاذ استشاري', 'جلدية', 'Top Care', '', '', TRUE, 'Tuesday schedule from supplied Top Care image.', now()::text, now()::text),
('tc-noura-adel', 'د. نورة عادل', 'Top Care', 'Dermatology', 'أخصائي', 'جلدية', 'Top Care', '', '', TRUE, 'Tuesday schedule from supplied Top Care image.', now()::text, now()::text),
('tc-moataz', 'د. معتز', 'Top Care', 'Dermatology', 'أخصائي', 'جلدية', 'Top Care', '', '', TRUE, 'Wednesday doctor imported; time marker is not sufficiently clear in the image.', now()::text, now()::text),
('tc-ahmed-soliman', 'د. أحمد سليمان', 'Top Care', 'Dermatology', 'استشاري', 'جلدية', 'Top Care', '', '', TRUE, 'Wednesday schedule from supplied Top Care image.', now()::text, now()::text),
('tc-yasmin-obaid', 'د. ياسمين عبيد', 'Top Care', 'Dermatology', 'أخصائي', 'جلدية', 'Top Care', '', '', TRUE, 'Thursday schedule from supplied Top Care image.', now()::text, now()::text),
('dent-islam-hegazy', 'د. إسلام حجازي', 'Top Care', 'Dentistry', 'طبيب أسنان', 'أسنان', 'Top Care', '', '', TRUE, 'Saturday schedule from supplied Dentistry image.', now()::text, now()::text),
('dent-ahmed-ali', 'د. أحمد علي', 'Top Care', 'Dentistry', 'طبيب أسنان', 'أسنان', 'Top Care', '', '', TRUE, 'Sunday, Monday, and Tuesday schedules from supplied Dentistry image.', now()::text, now()::text),
('dent-nader-abdelghany', 'د. نادر عبد الغني', 'Top Care', 'Dentistry', 'طبيب أسنان', 'أسنان', 'Top Care', '', '', TRUE, 'Sunday and Wednesday schedules from supplied Dentistry image.', now()::text, now()::text),
('dent-karim-abdelghany', 'د. كريم عبد الغني', 'Top Care', 'Dentistry', 'طبيب أسنان', 'أسنان', 'Top Care', '', '', TRUE, 'Monday schedule from supplied Dentistry image.', now()::text, now()::text)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, clinic = EXCLUDED.clinic, department = EXCLUDED.department, degree = EXCLUDED.degree, specialty = EXCLUDED.specialty, branch = EXCLUDED.branch, "consultationFee" = EXCLUDED."consultationFee", "isActive" = EXCLUDED."isActive", notes = EXCLUDED.notes, "updatedAt" = now()::text;

-- Top Care dermatology weekly availability. Times are stored in 24-hour format.
INSERT INTO doctor_availability (id, "doctorId", "dayOfWeek", "startTime", "endTime", "slotDurationMinutes", "isActive") VALUES
('av-tc-kariman-sat', 'tc-kariman', 6, '14:00', '18:00', 30, TRUE),
('av-tc-raeda-sun', 'tc-raeda-youssef', 0, '12:00', '14:00', 30, TRUE),
('av-tc-mona-sun', 'tc-mona-elkolyoby', 0, '15:00', '17:00', 30, TRUE),
('av-tc-gihad-sun', 'tc-gihad', 0, '13:00', '17:00', 30, TRUE),
('av-tc-nehla-sun', 'tc-nehla-hantar', 0, '19:00', '21:00', 30, TRUE),
('av-tc-samia-mon', 'tc-samia-esmat', 1, '16:00', '21:00', 30, TRUE),
('av-tc-eman-mon', 'tc-eman-seny', 1, '16:00', '21:00', 30, TRUE),
('av-tc-sara-mon', 'tc-sara-elsayed', 1, '13:00', '17:00', 30, TRUE),
('av-tc-hesham-mon', 'tc-hesham-hamdy', 1, '17:00', '21:00', 30, TRUE),
('av-tc-enas-tue', 'tc-enas-shaker', 2, '16:00', '22:00', 30, TRUE),
('av-tc-noura-tue', 'tc-noura-adel', 2, '13:00', '17:00', 30, TRUE),
('av-tc-ahmed-soliman-wed', 'tc-ahmed-soliman', 3, '13:00', '17:00', 30, TRUE),
('av-tc-yasmin-thu', 'tc-yasmin-obaid', 4, '13:00', '17:00', 30, TRUE)
ON CONFLICT (id) DO UPDATE SET "doctorId" = EXCLUDED."doctorId", "dayOfWeek" = EXCLUDED."dayOfWeek", "startTime" = EXCLUDED."startTime", "endTime" = EXCLUDED."endTime", "slotDurationMinutes" = EXCLUDED."slotDurationMinutes", "isActive" = EXCLUDED."isActive";

-- Top Care dentistry weekly availability. Times are stored in 24-hour format.
INSERT INTO doctor_availability (id, "doctorId", "dayOfWeek", "startTime", "endTime", "slotDurationMinutes", "isActive") VALUES
('av-dent-islam-sat', 'dent-islam-hegazy', 6, '10:00', '16:00', 30, TRUE),
('av-dent-ahmed-sun', 'dent-ahmed-ali', 0, '10:00', '16:00', 30, TRUE),
('av-dent-nader-sun', 'dent-nader-abdelghany', 0, '16:00', '22:00', 30, TRUE),
('av-dent-ahmed-mon', 'dent-ahmed-ali', 1, '16:00', '22:00', 30, TRUE),
('av-dent-karim-mon', 'dent-karim-abdelghany', 1, '10:00', '16:00', 30, TRUE),
('av-dent-ahmed-tue', 'dent-ahmed-ali', 2, '10:00', '16:00', 30, TRUE),
('av-dent-nader-wed', 'dent-nader-abdelghany', 3, '10:00', '16:00', 30, TRUE)
ON CONFLICT (id) DO UPDATE SET "doctorId" = EXCLUDED."doctorId", "dayOfWeek" = EXCLUDED."dayOfWeek", "startTime" = EXCLUDED."startTime", "endTime" = EXCLUDED."endTime", "slotDurationMinutes" = EXCLUDED."slotDurationMinutes", "isActive" = EXCLUDED."isActive";
