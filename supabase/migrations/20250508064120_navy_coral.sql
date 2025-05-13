/*
  # Add notes column to qr_codes table

  1. Changes
    - Add notes column to store user notes about QR codes
*/

-- Add notes column
ALTER TABLE qr_codes
ADD COLUMN IF NOT EXISTS notes text;