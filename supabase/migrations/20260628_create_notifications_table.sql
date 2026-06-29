-- Migration: Create notifications table
-- Date: 2026-06-27
-- Description: In-app notification system for Armed Forces Command and Staff College Visitor Management System

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_roles(user_id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at_desc ON notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view their own notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
  user_id IS NULL OR
  user_id = (SELECT user_id FROM user_roles WHERE user_id = (SELECT auth.uid())) OR
  (SELECT role FROM user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
);

CREATE POLICY "Admin can view all notifications"
ON notifications
FOR SELECT
TO authenticated
USING (
  (SELECT role FROM user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
);

CREATE POLICY "Authenticated users can create notifications"
ON notifications
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update their own notifications"
ON notifications
FOR UPDATE
TO authenticated
USING (
  user_id IS NULL OR
  user_id = (SELECT user_id FROM user_roles WHERE user_id = (SELECT auth.uid())) OR
  (SELECT role FROM user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
);

CREATE POLICY "Authenticated users can delete their own notifications"
ON notifications
FOR DELETE
TO authenticated
USING (
  user_id IS NULL OR
  user_id = (SELECT user_id FROM user_roles WHERE user_id = (SELECT auth.uid())) OR
  (SELECT role FROM user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
);