/*
  # Add INSERT policy for users table

  1. Security Changes
    - Add INSERT policy for users table to allow new user registrations
    - Policy ensures users can only insert rows with their own ID
*/

CREATE POLICY "Users can insert own data"
  ON users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);