/*
  # Add avatar_url to users table

  1. Changes
    - Add `avatar_url` column to users table
    - Add storage policy for avatar uploads

  2. Security
    - Enable public read access to avatars
    - Restrict uploads to authenticated users
*/

-- Add avatar_url column
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload avatars
CREATE POLICY "Users can upload avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public to read avatars
CREATE POLICY "Anyone can view avatars"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');