-- Phase 1: Authentication, RBAC & Multi-Tenancy Foundation
-- Run this in Supabase SQL Editor after the initial schema

-- Enable UUID extension (should already exist)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Companies table (multi-tenancy root)
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);

-- User profiles (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id),
  employee_id uuid REFERENCES employees(id),
  system_role text NOT NULL DEFAULT 'employee'
    CHECK (system_role IN ('super_admin','company_admin','hr_manager','payroll_officer','department_manager','employee')),
  email text NOT NULL,
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  active boolean DEFAULT true
);

-- Add company_id to existing tables
ALTER TABLE employees ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);
ALTER TABLE time_logs ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES companies(id);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id uuid NOT NULL REFERENCES companies(id),
  user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  changes jsonb,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_company ON user_profiles(company_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_employee ON user_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_company ON employees(company_id);
CREATE INDEX IF NOT EXISTS idx_time_logs_company ON time_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_entity ON audit_logs(company_id, entity_type, created_at DESC);
