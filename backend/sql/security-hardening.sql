-- ============================================================
-- DESIGLOV DATABASE SECURITY HARDENING
-- ============================================================
--
-- DesiGlov business data is accessed through the Express API.
-- Browser clients must not access these public tables directly
-- through the Supabase Data API.
--
-- The backend uses its trusted PostgreSQL connection.
--
-- IMPORTANT:
-- RLS is intentionally ENABLED but not FORCED because the
-- trusted backend/database owner must continue to access these
-- tables.
-- ============================================================


-- ============================================================
-- 1. ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.users
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.addresses
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.products
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.orders
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.order_items
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.admin_audit_log
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.password_reset_tokens
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.discount_codes
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_size_stock
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.newsletter_subscribers
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.product_reviews
  ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 2. REMOVE DIRECT BROWSER DATABASE ACCESS
-- ============================================================
--
-- Authentication still uses Supabase Auth.
-- Storage still uses Supabase Storage.
--
-- These REVOKEs apply only to the DesiGlov business tables
-- listed below.
-- ============================================================

REVOKE ALL PRIVILEGES
ON TABLE public.users
FROM anon, authenticated;

REVOKE ALL PRIVILEGES
ON TABLE public.addresses
FROM anon, authenticated;

REVOKE ALL PRIVILEGES
ON TABLE public.products
FROM anon, authenticated;

REVOKE ALL PRIVILEGES
ON TABLE public.orders
FROM anon, authenticated;

REVOKE ALL PRIVILEGES
ON TABLE public.order_items
FROM anon, authenticated;

REVOKE ALL PRIVILEGES
ON TABLE public.admin_audit_log
FROM anon, authenticated;

REVOKE ALL PRIVILEGES
ON TABLE public.password_reset_tokens
FROM anon, authenticated;

REVOKE ALL PRIVILEGES
ON TABLE public.discount_codes
FROM anon, authenticated;

REVOKE ALL PRIVILEGES
ON TABLE public.product_size_stock
FROM anon, authenticated;

REVOKE ALL PRIVILEGES
ON TABLE public.newsletter_subscribers
FROM anon, authenticated;

REVOKE ALL PRIVILEGES
ON TABLE public.product_reviews
FROM anon, authenticated;


-- ============================================================
-- 3. IDENTITY BINDING
-- ============================================================
--
-- Preserve DesiGlov's existing local users.id values while
-- permanently binding each account to its Supabase Auth UUID.
-- ============================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS supabase_user_id UUID;

CREATE UNIQUE INDEX IF NOT EXISTS
  users_supabase_user_id_unique
ON public.users (supabase_user_id)
WHERE supabase_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS
  users_email_lower_unique
ON public.users (LOWER(email));


-- ============================================================
-- 4. SUPABASE-AUTH COMPATIBILITY
-- ============================================================
--
-- Passwords are managed by Supabase Auth.
-- New DesiGlov local user records therefore do not require a
-- local password hash.
-- ============================================================

ALTER TABLE public.users
  ALTER COLUMN password_hash DROP NOT NULL;


-- ============================================================
-- 5. FOREIGN-KEY SUPPORTING INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS
  orders_address_index
ON public.orders (address_id);

CREATE INDEX IF NOT EXISTS
  product_reviews_user_index
ON public.product_reviews (user_id);


-- ============================================================
-- END OF DESIGLOV SECURITY HARDENING
-- ============================================================
