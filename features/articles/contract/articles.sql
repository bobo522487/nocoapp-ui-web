-- 规格第 3.2 节：谱文 PostgreSQL 表结构（供后端仓库原样执行）

CREATE TABLE articles (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  project_id uuid NOT NULL,
  title text NOT NULL DEFAULT '',
  subtitle text,
  author text,
  doc_type text NOT NULL DEFAULT 'custom',
  status text NOT NULL DEFAULT 'draft',
  privacy text NOT NULL DEFAULT 'clan',
  content_json jsonb,
  content_html text NOT NULL DEFAULT '',
  linked_chart_ids uuid[] NOT NULL DEFAULT '{}',
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  word_count integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX articles_tenant_project_idx ON articles (tenant_id, project_id);

CREATE TABLE article_person_links (
  tenant_id uuid NOT NULL,
  article_id uuid NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  person_id uuid NOT NULL,
  PRIMARY KEY (tenant_id, article_id, person_id)
);

CREATE INDEX article_person_links_person_idx ON article_person_links (tenant_id, person_id);

CREATE TABLE article_revisions (
  id uuid PRIMARY KEY,
  tenant_id uuid NOT NULL,
  article_id uuid NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  version integer NOT NULL,
  title text NOT NULL,
  status text NOT NULL,
  content_json jsonb NOT NULL,
  content_html text NOT NULL,
  word_count integer NOT NULL,
  summary text,
  author_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX article_revisions_article_idx ON article_revisions (tenant_id, article_id, version);

ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles FORCE ROW LEVEL SECURITY;
ALTER TABLE article_person_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_person_links FORCE ROW LEVEL SECURITY;
ALTER TABLE article_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE article_revisions FORCE ROW LEVEL SECURITY;

CREATE POLICY articles_tenant ON articles
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY article_person_links_tenant ON article_person_links
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

CREATE POLICY article_revisions_tenant ON article_revisions
  USING (tenant_id = current_setting('app.tenant_id')::uuid)
  WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);

-- CAS 正文更新：同一事务里先执行这条 UPDATE。
-- 影响行数为 0 时返回 409，不写 article_revisions，也不改 article_person_links。
-- 影响行数为 1 时，删除该 article_id 的旧 link 行，再按 linkedPersonIds 插入新行，并插入一条 article_revisions。
UPDATE articles
SET content_json = $1,
    content_html = $2,
    word_count = $3,
    version = version + 1,
    updated_at = now()
WHERE id = $4
  AND tenant_id = current_setting('app.tenant_id')::uuid
  AND version = $5
RETURNING version;