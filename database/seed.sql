-- Seed users are created via backend/scripts/seed_users.py
-- Run: python backend/scripts/seed_users.py

INSERT INTO system_activity (activity_type, message) VALUES
('system', 'Drone SOC platform initialized successfully'),
('system', 'Database schema deployed - all modules online')
ON CONFLICT DO NOTHING;
