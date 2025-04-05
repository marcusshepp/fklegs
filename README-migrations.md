# Supabase Migration Guide

## Setup

1. Install the Supabase CLI:

```bash
npm install -g supabase
```

2. Login to Supabase:

```bash
supabase login
```

3. Initialize Supabase in your project:

```bash
supabase init
```

4. Link your project:

```bash
supabase link --project-ref your-project-reference-id
```

You can find your project reference ID in the URL of your Supabase dashboard: `https://app.supabase.com/project/your-project-reference-id`

## Creating Migrations

1. Create a new migration:

```bash
supabase migration new create_workout_tables
```

This creates a new timestamped SQL file in the `supabase/migrations` directory.

2. Add your SQL to the migration file.

## Applying Migrations

Apply migrations to your remote Supabase project:

```bash
supabase db push
```

This will apply all pending migrations to your Supabase project.

## Generating TypeScript Types

Generate TypeScript types from your database schema:

```bash
supabase gen types typescript --linked > src/types/supabase.ts
```

This creates TypeScript types based on your database schema, which you can use in your application for type safety.

## Local Development

For local development, you can start a local Supabase instance:

```bash
supabase start
```

This starts a local Docker container with Supabase services, including PostgreSQL.

## Seeding Data

Create a seed file in `supabase/seed.sql` to populate your database with initial data:

```sql
-- Example seed data
INSERT INTO lift_types (name) VALUES
('Dumbbell rows'),
('Weighted Pull Ups'),
-- ... other lift types
ON CONFLICT (name) DO NOTHING;
```

Apply seed data:

```bash
supabase db reset
```

This resets your local database and applies all migrations and seed data.

## Continuous Integration

In a CI/CD pipeline, you can automate migrations:

```yaml
- name: Apply database migrations
  run: supabase db push
```

## Recommended Workflow

1. Make schema changes locally first
2. Create migrations for those changes
3. Test locally
4. Push migrations to your remote Supabase project
5. Generate updated TypeScript types
