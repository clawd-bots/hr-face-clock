-- Run this SQL in your Supabase SQL Editor to create the required tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Employees table
create table if not exists employees (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  role text default '',
  department text default '',
  face_descriptors jsonb default '[]'::jsonb,
  photo_url text,
  created_at timestamp with time zone default now(),
  active boolean default true
);

-- Time logs table
create table if not exists time_logs (
  id uuid primary key default uuid_generate_v4(),
  employee_id uuid not null references employees(id) on delete cascade,
  clock_in timestamp with time zone not null,
  clock_out timestamp with time zone,
  hours_worked numeric(6,2),
  date date not null default current_date,
  created_at timestamp with time zone default now()
);

-- Index for fast lookups
create index if not exists idx_time_logs_employee_date on time_logs(employee_id, date);
create index if not exists idx_time_logs_date on time_logs(date);
create index if not exists idx_employees_active on employees(active);

-- Enable Row Level Security (optional - disable for simplicity)
-- alter table employees enable row level security;
-- alter table time_logs enable row level security;

-- Allow public access (for development - restrict in production)
create policy "Allow all on employees" on employees for all using (true) with check (true);
create policy "Allow all on time_logs" on time_logs for all using (true) with check (true);
