-- Create tables for workout tracking

-- Lift types table
CREATE TABLE IF NOT EXISTS lift_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Workouts table
CREATE TABLE IF NOT EXISTS workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (Row Level Security) on workouts
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own workouts
CREATE POLICY "Users can view their own workouts" 
  ON workouts FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert their own workouts
CREATE POLICY "Users can insert their own workouts" 
  ON workouts FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update their own workouts
CREATE POLICY "Users can update their own workouts" 
  ON workouts FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy to allow users to delete their own workouts
CREATE POLICY "Users can delete their own workouts" 
  ON workouts FOR DELETE 
  USING (auth.uid() = user_id);

-- Exercises table
CREATE TABLE IF NOT EXISTS exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  lift_type_id UUID REFERENCES lift_types(id),
  name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on exercises
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only exercises from their workouts
CREATE POLICY "Users can view their own exercises" 
  ON exercises FOR SELECT 
  USING (
    workout_id IN (
      SELECT id FROM workouts WHERE user_id = auth.uid()
    )
  );

-- Create policy to allow users to insert exercises to their workouts
CREATE POLICY "Users can insert exercises to their workouts" 
  ON exercises FOR INSERT 
  WITH CHECK (
    workout_id IN (
      SELECT id FROM workouts WHERE user_id = auth.uid()
    )
  );

-- Create policy to allow users to update their exercises
CREATE POLICY "Users can update their exercises" 
  ON exercises FOR UPDATE 
  USING (
    workout_id IN (
      SELECT id FROM workouts WHERE user_id = auth.uid()
    )
  );

-- Create policy to allow users to delete their exercises
CREATE POLICY "Users can delete their exercises" 
  ON exercises FOR DELETE 
  USING (
    workout_id IN (
      SELECT id FROM workouts WHERE user_id = auth.uid()
    )
  );

-- Sets table
CREATE TABLE IF NOT EXISTS sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  weight NUMERIC(10, 2) NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sets
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only sets from their exercises
CREATE POLICY "Users can view their own sets" 
  ON sets FOR SELECT 
  USING (
    exercise_id IN (
      SELECT e.id FROM exercises e
      JOIN workouts w ON e.workout_id = w.id
      WHERE w.user_id = auth.uid()
    )
  );

-- Create policy to allow users to insert sets to their exercises
CREATE POLICY "Users can insert sets to their exercises" 
  ON sets FOR INSERT 
  WITH CHECK (
    exercise_id IN (
      SELECT e.id FROM exercises e
      JOIN workouts w ON e.workout_id = w.id
      WHERE w.user_id = auth.uid()
    )
  );

-- Create policy to allow users to update their sets
CREATE POLICY "Users can update their sets" 
  ON sets FOR UPDATE 
  USING (
    exercise_id IN (
      SELECT e.id FROM exercises e
      JOIN workouts w ON e.workout_id = w.id
      WHERE w.user_id = auth.uid()
    )
  );

-- Create policy to allow users to delete their sets
CREATE POLICY "Users can delete their sets" 
  ON sets FOR DELETE 
  USING (
    exercise_id IN (
      SELECT e.id FROM exercises e
      JOIN workouts w ON e.workout_id = w.id
      WHERE w.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS workouts_user_id_idx ON workouts (user_id);
CREATE INDEX IF NOT EXISTS exercises_workout_id_idx ON exercises (workout_id);
CREATE INDEX IF NOT EXISTS exercises_lift_type_id_idx ON exercises (lift_type_id);
CREATE INDEX IF NOT EXISTS sets_exercise_id_idx ON sets (exercise_id);
