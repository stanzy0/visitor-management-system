-- Migration: Rename ICT Officer to ICT Staff in positions table
-- Date: 2026-07-29
-- Description: Update existing position title from ICT Officer to ICT Staff

UPDATE positions
SET title = 'ICT Staff'
WHERE title = 'ICT Officer';
