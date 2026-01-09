# Supabase Migrations

This directory contains SQL migrations for the JustArt database schema.

## Setup

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Link your project:
```bash
supabase link --project-ref your-project-ref
```

3. Apply migrations:
```bash
supabase db push
```

## Creating New Migrations

1. Create a new migration file with a timestamp and descriptive name:
```bash
supabase migration new add_column_name
```

2. Write your SQL migration in the generated file

3. Test locally (optional):
```bash
supabase start
supabase db reset
```

4. Apply to production:
```bash
supabase db push
```

## Migration Files

- `001_initial_schema.sql` - Initial database schema with users, galleries, likes, and nft_ratings tables

## Schema Overview

### Tables

- **users** - Stores user wallet addresses
- **galleries** - NFT gallery configurations and metadata
- **likes** - Gallery likes by wallet addresses
- **nft_ratings** - Star ratings (1-5) for NFTs within galleries

### Key Features

- RLS (Row Level Security) enabled on all tables
- Indexes for performance optimization
- Automatic timestamp updates
- Cascading deletes
- Check constraints for data validation

## Troubleshooting

If you encounter "column does not exist" errors after deploying, ensure migrations have been applied:

```bash
supabase db push
```

To check current schema:
```bash
supabase db diff
```
