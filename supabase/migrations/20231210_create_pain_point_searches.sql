-- Create a table for pain point analysis searches
create table pain_point_searches (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  industry text not null,
  results jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create an RLS policy to ensure users can only see their own searches
alter table pain_point_searches enable row level security;

create policy "Users can view their own searches"
  on pain_point_searches for select
  using (auth.uid() = user_id);

-- Updated insert policy to automatically set user_id
create policy "Users can insert their own searches"
  on pain_point_searches for insert
  with check (auth.uid() = user_id AND user_id = auth.uid());

-- Add delete policy to allow users to delete their own searches
create policy "Users can delete their own searches"
  on pain_point_searches for delete
  using (auth.uid() = user_id);

-- Create an index on user_id and created_at for faster queries
create index pain_point_searches_user_id_created_at_idx
  on pain_point_searches (user_id, created_at desc); 