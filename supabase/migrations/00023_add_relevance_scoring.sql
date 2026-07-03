-- Migration: 00023_add_relevance_scoring
-- Add scoring columns to grant_opportunities for the Wave 5 Scout Agent

ALTER TABLE grant_opportunities
  ADD COLUMN relevance_score INTEGER,
  ADD COLUMN relevance_rationale TEXT,
  ADD COLUMN scored_at TIMESTAMPTZ,
  ADD COLUMN scoring_model TEXT;
