-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Only admins can insert lift types" ON lift_types;
DROP POLICY IF EXISTS "Only admins can update lift types" ON lift_types;
DROP POLICY IF EXISTS "Only admins can delete lift types" ON lift_types;

-- Create new policies to allow all authenticated users to manipulate lift types
CREATE POLICY "All users can insert lift types" 
  ON lift_types FOR INSERT 
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "All users can update lift types" 
  ON lift_types FOR UPDATE 
  TO authenticated
  USING (true);

CREATE POLICY "All users can delete lift types" 
  ON lift_types FOR DELETE 
  TO authenticated
  USING (true);
