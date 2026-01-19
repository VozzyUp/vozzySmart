-- =============================================================================
-- Migration: 0004_add_campaign_folders_and_tags.sql
-- Feature: Campaign organization with folders and tags
-- =============================================================================

-- FOLDERS (1 nível, sem hierarquia)
CREATE TABLE IF NOT EXISTS campaign_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT campaign_folders_name_unique UNIQUE (name)
);

-- FK em campaigns (0 ou 1 pasta por campanha)
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS folder_id UUID REFERENCES campaign_folders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_campaigns_folder_id ON campaigns(folder_id);

-- TAGS (definição)
CREATE TABLE IF NOT EXISTS campaign_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6B7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT campaign_tags_name_unique UNIQUE (name)
);

-- TAGS (junção many-to-many)
-- Nota: campaign_id é TEXT porque campaigns.id é TEXT com prefixo c_
CREATE TABLE IF NOT EXISTS campaign_tag_assignments (
  campaign_id TEXT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES campaign_tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (campaign_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_campaign_tag_assignments_campaign
  ON campaign_tag_assignments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_tag_assignments_tag
  ON campaign_tag_assignments(tag_id);

-- RLS POLICIES (single-tenant: authenticated users have full access)
ALTER TABLE campaign_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_tag_assignments ENABLE ROW LEVEL SECURITY;

-- Folders
CREATE POLICY "campaign_folders_select" ON campaign_folders
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "campaign_folders_insert" ON campaign_folders
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "campaign_folders_update" ON campaign_folders
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "campaign_folders_delete" ON campaign_folders
  FOR DELETE TO authenticated USING (true);

-- Tags
CREATE POLICY "campaign_tags_select" ON campaign_tags
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "campaign_tags_insert" ON campaign_tags
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "campaign_tags_update" ON campaign_tags
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "campaign_tags_delete" ON campaign_tags
  FOR DELETE TO authenticated USING (true);

-- Tag Assignments
CREATE POLICY "campaign_tag_assignments_select" ON campaign_tag_assignments
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "campaign_tag_assignments_insert" ON campaign_tag_assignments
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "campaign_tag_assignments_delete" ON campaign_tag_assignments
  FOR DELETE TO authenticated USING (true);

-- Trigger para updated_at em folders
CREATE OR REPLACE FUNCTION update_campaign_folders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_campaign_folders_updated_at ON campaign_folders;
CREATE TRIGGER trg_campaign_folders_updated_at
  BEFORE UPDATE ON campaign_folders
  FOR EACH ROW EXECUTE FUNCTION update_campaign_folders_updated_at();
