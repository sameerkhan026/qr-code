/*
  # Add expiry_time to qr_codes table

  1. Changes
    - Add expiry_time column to qr_codes table
    - Add files array column to store multiple file URLs
    - Update existing rows with default expiry time
*/

-- Add expiry_time column
ALTER TABLE qr_codes
ADD COLUMN IF NOT EXISTS expiry_time timestamptz NOT NULL DEFAULT (now() + interval '2 hours');

-- Add files array column
ALTER TABLE qr_codes
ADD COLUMN IF NOT EXISTS files text[] DEFAULT '{}';

-- Update existing rows to expire in 2 hours from now
UPDATE qr_codes
SET expiry_time = created_at + interval '2 hours'
WHERE expiry_time IS NULL;