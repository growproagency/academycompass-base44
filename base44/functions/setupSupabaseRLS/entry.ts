// This file documents the SQL commands to run in Supabase SQL Editor
// to set up Row Level Security policies for organization-based data isolation

/*

-- 1. Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategic_plans ENABLE ROW LEVEL SECURITY;

-- 2. Profiles table policies
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = auth_user_id);

-- Admins can read all profiles in their organization
CREATE POLICY "Admins can read org profiles"
  ON profiles FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Admins can update profiles in their organization
CREATE POLICY "Admins can update org profiles"
  ON profiles FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- 3. Organizations table policies
-- Users can read their own organization
CREATE POLICY "Users can read own organization"
  ON organizations FOR SELECT
  USING (
    id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
    )
  );

-- 4. Rocks table policies
-- Users can read rocks in their organization
CREATE POLICY "Users can read org rocks"
  ON rocks FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

-- Users can create rocks in their organization
CREATE POLICY "Users can create org rocks"
  ON rocks FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

-- Users can update rocks in their organization
CREATE POLICY "Users can update org rocks"
  ON rocks FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

-- Users can delete rocks in their organization
CREATE POLICY "Users can delete org rocks"
  ON rocks FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

-- 5. Tasks table policies (same pattern as rocks)
CREATE POLICY "Users can read org tasks"
  ON tasks FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

CREATE POLICY "Users can create org tasks"
  ON tasks FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

CREATE POLICY "Users can update org tasks"
  ON tasks FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

CREATE POLICY "Users can delete org tasks"
  ON tasks FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

-- 6. Milestones table policies (same pattern)
CREATE POLICY "Users can read org milestones"
  ON milestones FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

CREATE POLICY "Users can create org milestones"
  ON milestones FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

CREATE POLICY "Users can update org milestones"
  ON milestones FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

CREATE POLICY "Users can delete org milestones"
  ON milestones FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

-- 7. Announcements table policies (same pattern)
CREATE POLICY "Users can read org announcements"
  ON announcements FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

CREATE POLICY "Users can create org announcements"
  ON announcements FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

CREATE POLICY "Users can update org announcements"
  ON announcements FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

CREATE POLICY "Users can delete org announcements"
  ON announcements FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

-- 8. Strategic Plans table policies (same pattern)
CREATE POLICY "Users can read org strategic plans"
  ON strategic_plans FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

CREATE POLICY "Users can create org strategic plans"
  ON strategic_plans FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

CREATE POLICY "Users can update org strategic plans"
  ON strategic_plans FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

CREATE POLICY "Users can delete org strategic plans"
  ON strategic_plans FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM profiles 
      WHERE auth_user_id = auth.uid()
      AND status IN ('approved', 'active')
    )
  );

*/