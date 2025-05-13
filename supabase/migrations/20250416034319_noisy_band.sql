/*
  # Add storage policies for avatar uploads

  1. Storage Bucket
    - Create 'avatars' storage bucket if it doesn't exist
    - Enable RLS on the bucket
  
  2. Security Policies
    - Allow authenticated users to read their own avatars
    - Allow authenticated users to update their own avatars
    - Allow authenticated users to delete their own avatars
    - Ensure file paths start with user ID for security
*/

-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name)
SELECT 'avatars', 'avatars'
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'avatars'
);

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Avatar Read Policy'
  ) THEN
    CREATE POLICY "Avatar Read Policy"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
      bucket_id = 'avatars' AND 
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- Policy to allow users to insert their own avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Avatar Insert Policy'
  ) THEN
    CREATE POLICY "Avatar Insert Policy"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'avatars' AND 
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- Policy to allow users to update their own avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Avatar Update Policy'
  ) THEN
    CREATE POLICY "Avatar Update Policy"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
      bucket_id = 'avatars' AND 
      (storage.foldername(name))[1] = auth.uid()::text
    )
    WITH CHECK (
      bucket_id = 'avatars' AND 
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;

-- Policy to allow users to delete their own avatars
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Avatar Delete Policy'
  ) THEN
    CREATE POLICY "Avatar Delete Policy"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'avatars' AND 
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;
END $$;