-- Migration 0004 — single DB-provisioned admin (non-destructive)
-- Apply: wrangler d1 execute al-saifee-db --remote --file=src/db/migration-0004.sql
-- The admin row itself is inserted manually (see worker/scripts/create-admin.mjs).
-- This migration only adds the guard trigger; existing data is untouched.

CREATE TRIGGER IF NOT EXISTS trg_single_admin
BEFORE INSERT ON admins
WHEN (SELECT COUNT(*) FROM admins) >= 1
BEGIN
  SELECT RAISE(ABORT, 'Only one admin allowed');
END;
