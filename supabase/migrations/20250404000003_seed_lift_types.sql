-- Seed data for lift types
INSERT INTO lift_types (name) VALUES
('Dumbbell rows'),
('Weighted Pull Ups'),
('Tricep barbell press'),
('Leg extension'),
('Barbell overhead press'),
('Barbell squats'),
('Cable row'),
('Deadlift'),
('Dumbbell curl'),
('Dumbbell flat press'),
('Dumbbell shoulder raise'),
('Incline press'),
('Pull down'),
('Pull ups'),
('Rear delt cable'),
('Rear delt machine'),
('Tricep push down'),
('Calf Raise'),
('Dips'),
('Cable lat pull'),
('Dumbbell incline bench'),
('Cable chest flys'),
('Cable shoulder raise'),
('Cable Curls'),
('Chest supported row'),
('Hamstring curls'),
('Leg press'),
('Dumbbell shoulder press')
ON CONFLICT (name) DO NOTHING;
