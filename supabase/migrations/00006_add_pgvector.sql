-- Migration: 00006_add_pgvector
-- Enable pgvector extension for embedding storage.

CREATE EXTENSION IF NOT EXISTS vector;
