/*
  # Create storage bucket for QR files

  1. New Storage Bucket
    - Creates a new public storage bucket named 'qr-files'
    - Enables public access for QR code file sharing
  
  2. Security
    - Enables RLS on the bucket
    - Adds policy for authenticated users to upload files
    - Adds policy for public read access to files
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('qr-files', 'qr-files', true);

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to upload files
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'qr-files' AND auth.uid() = owner);

-- Allow public read access to files
CREATE POLICY "Anyone can view files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'qr-files');