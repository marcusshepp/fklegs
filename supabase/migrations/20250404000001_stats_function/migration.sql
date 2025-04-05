-- Create a function to get statistics for a specific lift type
CREATE OR REPLACE FUNCTION get_lift_type_stats(
  p_lift_type_id UUID,
  p_user_id UUID,
  p_sql_date_filter TEXT DEFAULT ''
)
RETURNS TABLE (
  workout_date TIMESTAMP WITH TIME ZONE,
  max_weight NUMERIC,
  total_volume NUMERIC,
  total_sets INTEGER,
  average_reps NUMERIC
) AS $$
DECLARE
  query TEXT;
BEGIN
  query := '
    WITH workout_exercises AS (
      SELECT 
        w.id AS workout_id,
        w.date AS workout_date,
        e.id AS exercise_id
      FROM workouts w
      JOIN exercises e ON w.id = e.workout_id
      WHERE w.user_id = ''' || p_user_id || '''
        AND e.lift_type_id = ''' || p_lift_type_id || '''
        ' || p_sql_date_filter || '
    ),
    exercise_stats AS (
      SELECT 
        we.workout_date,
        we.exercise_id,
        MAX(s.weight) AS max_weight,
        SUM(s.weight * s.reps) AS total_volume,
        COUNT(s.id) AS total_sets,
        AVG(s.reps) AS average_reps
      FROM workout_exercises we
      JOIN sets s ON we.exercise_id = s.exercise_id
      GROUP BY we.workout_date, we.exercise_id
    )
    SELECT 
      workout_date,
      MAX(max_weight) AS max_weight,
      SUM(total_volume) AS total_volume,
      SUM(total_sets) AS total_sets,
      AVG(average_reps) AS average_reps
    FROM exercise_stats
    GROUP BY workout_date
    ORDER BY workout_date ASC
  ';
  
  RETURN QUERY EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
