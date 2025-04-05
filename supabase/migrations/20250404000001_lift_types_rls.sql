-- Enable RLS on lift_types
ALTER TABLE lift_types ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all authenticated users to view lift types
CREATE POLICY "All users can view lift types" 
  ON lift_types FOR SELECT 
  TO authenticated
  USING (true);

-- Create policy to allow only admins to insert lift types (optional)
-- You can modify this if you want regular users to be able to add lift types
CREATE POLICY "Only admins can insert lift types" 
  ON lift_types FOR INSERT 
  TO authenticated
  WITH CHECK (auth.uid() IN (
    SELECT auth.uid() FROM auth.users
    -- You can add a condition here to check for admin role if you implement that
  ));

-- Create policy to allow only admins to update lift types (optional)
CREATE POLICY "Only admins can update lift types" 
  ON lift_types FOR UPDATE 
  TO authenticated
  USING (auth.uid() IN (
    SELECT auth.uid() FROM auth.users
    -- You can add a condition here to check for admin role if you implement that
  ));

-- Create policy to allow only admins to delete lift types (optional)
CREATE POLICY "Only admins can delete lift types" 
  ON lift_types FOR DELETE 
  TO authenticated
  USING (auth.uid() IN (
    SELECT auth.uid() FROM auth.users
    -- You can add a condition here to check for admin role if you implement that
  ));
