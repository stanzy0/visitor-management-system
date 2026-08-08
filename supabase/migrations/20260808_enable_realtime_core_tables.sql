-- Migration: Enable Realtime on core dashboard tables
-- Date: 2026-08-08
-- Description: Enable Supabase Realtime on visitors, visits, appointments, employees, notifications, and audit_logs tables for dashboard live updates.

ALTER PUBLICATION supabase_realtime ADD TABLE public.visitors;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visits;
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
