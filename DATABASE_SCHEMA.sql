-- =====================================================
-- DFR Empire Database Schema Reference
-- =====================================================
-- WARNING: This schema is for context only and is not meant to be run directly.
-- Use this file as a reference when developing new features or fixes.
-- Last Updated: 2024-12-06
-- =====================================================

-- =====================================================
-- ENUM TYPES
-- =====================================================
-- app_role: 'marketer', 'admin', 'bod', 'logistic', 'account'

-- =====================================================
-- TABLE: profiles (User accounts)
-- =====================================================
CREATE TABLE public.profiles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  username text NOT NULL,
  full_name text NOT NULL,
  password_hash text NOT NULL DEFAULT ''::text,
  idstaff text UNIQUE,                    -- Staff ID (used for login)
  is_active boolean DEFAULT true,
  whatsapp_number text,                   -- WhatsApp number (format: 60123456789)
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABLE: user_roles (Role assignments)
-- =====================================================
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role app_role NOT NULL,                 -- marketer, admin, bod, logistic, account
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- =====================================================
-- TABLE: products (Product inventory)
-- =====================================================
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text NOT NULL,
  base_cost numeric NOT NULL DEFAULT 0,
  quantity integer NOT NULL DEFAULT 0,
  stock_in integer NOT NULL DEFAULT 0,
  stock_out integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABLE: bundles (Product bundles with pricing)
-- =====================================================
CREATE TABLE public.bundles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  units integer NOT NULL DEFAULT 1,
  price_normal numeric NOT NULL DEFAULT 0,   -- Normal price (Facebook, Database, Google)
  price_shopee numeric NOT NULL DEFAULT 0,   -- Shopee platform price
  price_tiktok numeric NOT NULL DEFAULT 0,   -- TikTok platform price
  product_id uuid,                           -- Linked product
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT bundles_pkey PRIMARY KEY (id),
  CONSTRAINT bundles_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- =====================================================
-- TABLE: customer_orders (Main orders table)
-- =====================================================
CREATE TABLE public.customer_orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  no_tempahan text NOT NULL,                 -- Order number (auto-generated)
  id_sale text,                              -- Sale ID for Ninjavan (DF00001, DF00002, etc.)
  marketer_id uuid,
  marketer_id_staff text NOT NULL,           -- Staff ID of marketer
  marketer_name text NOT NULL,               -- Customer name (displayed as marketer_name)
  no_phone text NOT NULL,                    -- Customer phone
  alamat text NOT NULL,                      -- Address
  poskod text NOT NULL,                      -- Postcode
  bandar text NOT NULL,                      -- City
  negeri text NOT NULL,                      -- State
  produk text NOT NULL,                      -- Bundle name
  sku text NOT NULL,
  kuantiti integer NOT NULL DEFAULT 1,
  harga_jualan_produk numeric DEFAULT 0,
  harga_jualan_sebenar numeric NOT NULL,     -- Actual selling price
  harga_jualan_agen numeric DEFAULT 0,
  kos_pos numeric DEFAULT 0,
  kos_produk numeric DEFAULT 0,
  profit numeric DEFAULT 0,
  kurier text,                               -- Courier (Ninjavan, Shopee, Tiktok)
  berat_parcel integer DEFAULT 0,
  no_tracking text,                          -- Tracking number
  status_parcel text DEFAULT 'Pending'::text,
  nota_staff text,                           -- Staff notes
  tarikh_tempahan text NOT NULL,             -- Order date (string format)
  date_order date DEFAULT CURRENT_DATE,      -- Order date
  date_processed date,
  jenis_platform text,                       -- Platform: Facebook, Tiktok, Shopee, Database, Google
  jenis_customer text,                       -- Customer type: NP, EP, EC, REPEAT
  cara_bayaran text,                         -- Payment method: CASH, COD
  delivery_status text DEFAULT 'Pending'::text, -- Pending, Shipped, Success, Failed, Return
  -- Payment Details (for CASH payments)
  tarikh_bayaran date,                       -- Payment date
  jenis_bayaran text,                        -- Payment type: Online Transfer, Credit Card, CDM, CASH
  bank text,                                 -- Bank name
  receipt_image_url text,                    -- Receipt image URL (Vercel Blob)
  waybill_url text,                          -- Waybill PDF URL (Vercel Blob) - for Shopee/Tiktok
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT customer_orders_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABLE: prospects (Leads management)
-- =====================================================
CREATE TABLE public.prospects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nama_prospek text NOT NULL,                -- Prospect name
  no_telefon text NOT NULL,                  -- Phone number
  niche text NOT NULL,                       -- Niche/category
  jenis_prospek text NOT NULL,               -- Prospect type
  tarikh_phone_number date,
  admin_id_staff text,                       -- Admin staff ID
  created_by uuid,
  status_closed text,                        -- Closed status
  price_closed numeric,                      -- Closed price
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT prospects_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABLE: spends (Marketing spend tracking)
-- =====================================================
CREATE TABLE public.spends (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product text NOT NULL,                     -- Product/campaign name
  jenis_platform text NOT NULL,              -- Platform: Facebook, Tiktok, etc.
  total_spend numeric NOT NULL DEFAULT 0,    -- Spend amount
  tarikh_spend date NOT NULL DEFAULT CURRENT_DATE, -- Spend date
  marketer_id_staff text,                    -- Marketer staff ID
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT spends_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABLE: stock_movements (Inventory movements)
-- =====================================================
CREATE TABLE public.stock_movements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  type text NOT NULL,                        -- 'in' or 'out'
  quantity integer NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  description text,
  master_agent_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stock_movements_pkey PRIMARY KEY (id),
  CONSTRAINT stock_movements_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id)
);

-- =====================================================
-- TABLE: ninjavan_config (Ninjavan API settings)
-- =====================================================
CREATE TABLE public.ninjavan_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  client_id text NOT NULL,
  client_secret text NOT NULL,
  sender_name text NOT NULL,
  sender_phone text NOT NULL,
  sender_email text NOT NULL,
  sender_address1 text NOT NULL,
  sender_address2 text,
  sender_postcode text NOT NULL,
  sender_city text NOT NULL,
  sender_state text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ninjavan_config_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABLE: ninjavan_tokens (OAuth tokens for Ninjavan)
-- =====================================================
CREATE TABLE public.ninjavan_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  access_token text NOT NULL,
  expires_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ninjavan_tokens_pkey PRIMARY KEY (id)
);

-- =====================================================
-- DATABASE FUNCTIONS
-- =====================================================

-- Generate unique Sale ID (DF00001, DF00002, etc.)
-- Function: generate_sale_id() RETURNS text

-- Login user authentication
-- Function: login_user(p_idstaff text, p_password text) RETURNS TABLE

-- Register new user
-- Function: register_user(p_idstaff text, p_password text, p_full_name text, p_role text) RETURNS TABLE

-- =====================================================
-- NOTES FOR DEVELOPERS
-- =====================================================
--
-- 1. Authentication:
--    - Uses custom Staff ID login (not Supabase Auth)
--    - Password stored as uppercase in password_hash
--    - Session stored in localStorage
--
-- 2. File Storage:
--    - Uses Vercel Blob for receipt images and waybills
--    - Client-side upload using @vercel/blob put()
--    - Server-side delete using /api/delete-blob endpoint
--    - Token: VITE_BLOB_READ_WRITE_TOKEN (client) / BLOB_READ_WRITE_TOKEN (server)
--
-- 3. Platforms:
--    - Facebook, Database, Google → Uses Ninjavan courier
--    - Shopee, Tiktok → Manual waybill upload, no Ninjavan
--
-- 4. Payment Methods:
--    - CASH → Shows payment details modal with receipt
--    - COD → Cash on delivery, no upfront payment
--
-- 5. Roles:
--    - marketer: Can create orders, manage leads, view spend
--    - admin: Full access except logistics
--    - bod: Board of directors, view access
--    - logistic: Logistics management, products, bundles
--    - account: Finance and reports access
