/*
  # Add template column to qr_codes table

  1. Changes
    - Add template column to store QR code template selection
*/

-- Add template column
ALTER TABLE qr_codes
ADD COLUMN IF NOT EXISTS template text;