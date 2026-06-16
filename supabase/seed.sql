-- ============================================================
-- Forager Seed Data: Sunrise Community Health
-- Hand-curated demo tenant for development and testing.
-- ============================================================

-- 1. Tenant
INSERT INTO tenants (id, name, slug, settings) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Sunrise Community Health',
  'sunrise',
  '{
    "grant_categories": ["community_health", "behavioral_health", "maternal_child", "substance_use", "health_equity"],
    "max_concurrent_runs": 5,
    "features": {
      "scout_enabled": true,
      "librarian_enabled": false,
      "architect_enabled": false,
      "liaison_enabled": false
    }
  }'::jsonb
);

-- 2. Users
INSERT INTO users (id, tenant_id, email, full_name, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'maria.gonzalez@sunrisehealth.org', 'Maria Gonzalez', 'owner'),
  ('22222222-2222-2222-2222-222222222222', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'james.chen@sunrisehealth.org', 'James Chen', 'admin'),
  ('33333333-3333-3333-3333-333333333333', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'aisha.patel@sunrisehealth.org', 'Aisha Patel', 'member');

-- 3. Organization Profile
INSERT INTO org_profiles (tenant_id, name, mission, focus_areas, annual_budget, location, org_type, ein, website) VALUES (
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'Sunrise Community Health',
  'To provide accessible, high-quality healthcare to underserved communities in the rural Western frontier. We serve as the region''s only Federally Qualified Health Center, delivering integrated primary care, behavioral health, dental, and pharmacy services to over 12,000 patients annually regardless of ability to pay.',
  ARRAY['community_health', 'behavioral_health', 'maternal_child', 'substance_use', 'health_equity'],
  4200000,
  'Western Colorado',
  'nonprofit',
  '84-1234567',
  'https://sunrisehealth.org'
);

-- 4. Vault Documents (5 realistic organizational documents)

INSERT INTO vault_documents (id, tenant_id, title, file_path, file_type, file_size_bytes, status, chunk_count) VALUES
  (
    'd0c11111-0001-0001-0001-000000000001',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'FY2025 Annual Report',
    'vault/seed/fy2025-annual-report.pdf',
    'application/pdf',
    2450000,
    'indexed',
    34
  ),
  (
    'd0c11111-0001-0001-0001-000000000002',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    '2024-2027 Strategic Plan',
    'vault/seed/strategic-plan-2024-2027.pdf',
    'application/pdf',
    1890000,
    'indexed',
    28
  ),
  (
    'd0c11111-0001-0001-0001-000000000003',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Community Needs Assessment 2024',
    'vault/seed/community-needs-assessment-2024.pdf',
    'application/pdf',
    3100000,
    'indexed',
    42
  ),
  (
    'd0c11111-0001-0001-0001-000000000004',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Board of Directors & Leadership',
    'vault/seed/board-and-leadership.pdf',
    'application/pdf',
    520000,
    'indexed',
    8
  ),
  (
    'd0c11111-0001-0001-0001-000000000005',
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'HRSA CHW Training Grant Application (2023)',
    'vault/seed/hrsa-chw-grant-application-2023.pdf',
    'application/pdf',
    1750000,
    'indexed',
    31
  );

-- 5. Sample Vault Chunks (representative excerpts from each document)
-- These provide the Scout agent with searchable organizational knowledge.

-- Annual Report excerpts
INSERT INTO vault_chunks (document_id, tenant_id, content, chunk_index) VALUES
  ('d0c11111-0001-0001-0001-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'In FY2025, Sunrise Community Health served 12,347 unduplicated patients across our three clinic locations. Our patient population is 68% Hispanic/Latino, 22% non-Hispanic White, and 10% other racial/ethnic groups. Approximately 71% of our patients live at or below 200% of the Federal Poverty Level. We maintained a sliding fee discount program that provided $2.1 million in uncompensated care.',
   0),
  ('d0c11111-0001-0001-0001-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Our behavioral health program expanded significantly in FY2025, integrating two additional Licensed Clinical Social Workers into our primary care teams. This Collaborative Care Model resulted in a 34% increase in depression screening rates and a 28% improvement in PHQ-9 response rates among patients with moderate-to-severe depression. SBIRT screenings for substance use increased by 45%.',
   1),
  ('d0c11111-0001-0001-0001-000000000001', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Total revenue for FY2025 was $4.2 million, comprising: Federal grants (HRSA Section 330) $1.8M (43%), patient revenue and third-party reimbursement $1.6M (38%), state grants $450K (11%), and private foundation support $350K (8%). Operating expenses totaled $3.9M, yielding a modest surplus of $300K directed to capital reserves for our planned telehealth expansion.',
   2);

-- Strategic Plan excerpts
INSERT INTO vault_chunks (document_id, tenant_id, content, chunk_index) VALUES
  ('d0c11111-0001-0001-0001-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Strategic Priority 1: Expand Access through Telehealth. By 2027, Sunrise will establish a comprehensive telehealth platform capable of delivering primary care, behavioral health, and specialty consultations to patients in our 4,200 square mile service area. Target: 30% of all visits delivered via telehealth by FY2027, up from 8% in FY2024.',
   0),
  ('d0c11111-0001-0001-0001-000000000002', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Strategic Priority 3: Workforce Development. Develop a Community Health Worker (CHW) program to extend our reach into isolated frontier communities. Train and deploy 6 CHWs by FY2026, focusing on culturally concordant outreach to Spanish-speaking families in agricultural communities. Partner with Mesa County Workforce Center for CHW certification training.',
   1);

-- Needs Assessment excerpts
INSERT INTO vault_chunks (document_id, tenant_id, content, chunk_index) VALUES
  ('d0c11111-0001-0001-0001-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Our service area encompasses three counties in Western Colorado designated as Health Professional Shortage Areas (HPSAs) for primary care, dental, and mental health. The primary care HPSA score is 18 (out of 25), indicating severe shortage. The nearest Level I trauma center is 250 miles from our most remote service location. Maternal mortality rates in the region are 2.3x the state average.',
   0),
  ('d0c11111-0001-0001-0001-000000000003', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Key findings from community focus groups: (1) Transportation remains the #1 barrier to care access, with 43% of respondents reporting missed appointments due to travel distance; (2) Stigma around behavioral health treatment is significant, particularly in agricultural communities; (3) 67% of Spanish-speaking respondents prefer receiving health information from promotores or community health workers rather than clinic-based providers.',
   1);

-- Board document excerpts
INSERT INTO vault_chunks (document_id, tenant_id, content, chunk_index) VALUES
  ('d0c11111-0001-0001-0001-000000000004', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Board of Directors: Dr. Elena Ramirez (Chair, Family Medicine physician), Marcus Thompson (Vice Chair, Mesa County Commissioner), Sofia Hernandez-Vega (Secretary, Community Organizer), Robert Chen CPA (Treasurer), Dr. Patricia Whitehorse (Tribal Health Director, Southern Ute), James O''Brien (Patient Representative), Dr. Aminata Diallo (University of Colorado School of Public Health).',
   0);

-- Past grant application excerpts
INSERT INTO vault_chunks (document_id, tenant_id, content, chunk_index) VALUES
  ('d0c11111-0001-0001-0001-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Project Narrative: Sunrise Community Health proposes to train and deploy 8 Community Health Workers (CHWs) across three frontier counties in Western Colorado. Our CHW program will target three priority populations: (1) Spanish-speaking agricultural worker families, (2) elderly residents in isolated rural communities, and (3) individuals with co-occurring behavioral health and substance use disorders.',
   0),
  ('d0c11111-0001-0001-0001-000000000005', 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
   'Organizational Capacity: Sunrise Community Health has operated as a Federally Qualified Health Center since 2003 and has been a HRSA Health Center Program grantee for 20 consecutive years. We have successfully managed federal awards totaling over $25 million, including three HRSA Service Expansion grants, two SAMHSA behavioral health integration awards, and one CDC chronic disease prevention cooperative agreement. Our most recent single audit (FY2024) contained zero findings.',
   1);

-- 6. Grant Opportunities (at various pipeline stages)
INSERT INTO grant_opportunities (tenant_id, title, funder, description, amount_min, amount_max, deadline, url, status, tags) VALUES
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Community Health Worker Training Initiative',
    'HRSA Bureau of Health Workforce',
    'Funding to support the training and deployment of community health workers in medically underserved areas. Eligible applicants include FQHCs, community-based organizations, and tribal health programs. Priority given to programs addressing health disparities in rural and frontier communities.',
    250000, 500000,
    '2026-07-15T23:59:59Z',
    'https://grants.hrsa.gov/example/chw-training',
    'matched',
    ARRAY['community_health', 'workforce_development', 'health_equity']
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Behavioral Health Integration Program',
    'SAMHSA',
    'Grants to support the integration of behavioral health services into primary care settings. Focus on expanding access to mental health and substance use disorder treatment in community health centers.',
    300000, 750000,
    '2026-08-30T23:59:59Z',
    'https://www.samhsa.gov/grants/example/bhi',
    'screening',
    ARRAY['behavioral_health', 'integration', 'substance_use']
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Maternal and Child Health Services Block Grant',
    'HRSA Maternal and Child Health Bureau',
    'Block grant funding for states and jurisdictions to improve the health of mothers and children.',
    100000, 350000,
    '2026-06-01T23:59:59Z',
    'https://mchb.hrsa.gov/example/block-grant',
    'drafting',
    ARRAY['maternal_child', 'prenatal', 'pediatric']
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Rural Health Outreach Grant Program',
    'Federal Office of Rural Health Policy',
    'Supports consortia in developing and implementing outreach programs to improve access to healthcare in rural communities. Emphasis on telehealth expansion and mobile health units.',
    200000, 600000,
    '2026-09-15T23:59:59Z',
    'https://www.hrsa.gov/rural-health/example/outreach',
    'discovered',
    ARRAY['rural_health', 'telehealth', 'outreach']
  ),
  (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'Health Disparities Research Grant',
    'NIH NIMHD',
    'R01-equivalent funding for community-engaged research addressing social determinants of health and health disparities in underserved populations.',
    400000, 1200000,
    '2026-10-01T23:59:59Z',
    'https://grants.nih.gov/example/health-disparities',
    'discovered',
    ARRAY['health_equity', 'research', 'social_determinants']
  );
