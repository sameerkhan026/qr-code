/*
  # Add template column to qr_codes table

  1. Changes
    - Add template column to store QR code template selection
    - Add template_config column to store template-specific settings
*/

-- Add template column
ALTER TABLE qr_codes
ADD COLUMN IF NOT EXISTS template text;

-- Add template_config column for storing template-specific settings
ALTER TABLE qr_codes
ADD COLUMN IF NOT EXISTS template_config jsonb DEFAULT '{}'::jsonb;