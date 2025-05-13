/*
  # Add templates table for QR code templates

  1. New Tables
    - `templates`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to users.id)
      - `name` (text, required)
      - `config` (jsonb, stores template configuration)
      - `created_at` (timestamp with timezone)

  2. Security
    - Enable RLS on `templates` table
    - Add policies for authenticated users to:
      - Read their own templates
      - Insert their own templates
      - Update their own templates
      - Delete their own templates

  3. Relationships
    - Foreign key to users table
    - Cascade delete when user is deleted
*/

CREATE TABLE IF NOT EXISTS templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE templates ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to read their own templates
CREATE POLICY "Users can read own templates"
  ON templates
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

-- Policy to allow users to insert their own templates
CREATE POLICY "Users can insert own templates"
  ON templates
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own templates
CREATE POLICY "Users can update own templates"
  ON templates
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to delete their own templates
CREATE POLICY "Users can delete own templates"
  ON templates
  FOR DELETE
  TO public
  USING (auth.uid() = user_id);