-- =====================================================
-- DFR Empire Database Schema Reference
-- =====================================================
-- WARNING: This schema is for context only and is not meant to be run directly.
-- Table order and constraints may not be valid for execution.
-- Use this file as a reference when developing new features or fixes.
-- Last Updated: 2025-12-07
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
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  password_hash text NOT NULL DEFAULT ''::text,
  idstaff text UNIQUE,                    -- Staff ID (used for login)
  is_active boolean DEFAULT true,
  whatsapp_number text,                   -- WhatsApp number (format: 60123456789)
  CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABLE: user_roles (Role assignments)
-- =====================================================
CREATE TABLE public.user_roles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role USER-DEFINED NOT NULL,             -- marketer, admin, bod, logistic, account
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_roles_pkey PRIMARY KEY (id),
  CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);

-- =====================================================
-- TABLE: device_setting (WhatsApp device configuration)
-- =====================================================
-- Used for Whacenter integration - allows marketers to connect WhatsApp
CREATE TABLE public.device_setting (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,                  -- Reference to profiles.id
  device_id text,                         -- Whacenter device ID (returned after addDevice)
  instance text,                          -- Instance ID (same as device_id)
  webhook_id text,                        -- Unique webhook identifier
  provider text DEFAULT 'whacenter'::text,-- Provider name (whacenter)
  api_key text,                           -- Whacenter API key
  id_device text,                         -- Custom device name (DFR_{idstaff})
  phone_number text,                      -- WhatsApp phone number (format: 60123456789)
  status_wa text DEFAULT 'disconnected'::text, -- connected, disconnected
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT device_setting_pkey PRIMARY KEY (id),
  CONSTRAINT device_setting_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
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
-- Pricing Matrix: 3 platforms x 3 customer types = 9 price columns
-- Platforms: Normal (Facebook/Database/Google), Shopee, TikTok
-- Customer Types: NP (New Prospect), EP (Existing Prospect), EC (Existing Customer)
CREATE TABLE public.bundles (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  units integer NOT NULL DEFAULT 1,
  price_normal numeric NOT NULL DEFAULT 0,    -- Legacy: Normal price (deprecated)
  price_shopee numeric NOT NULL DEFAULT 0,    -- Legacy: Shopee price (deprecated)
  price_tiktok numeric NOT NULL DEFAULT 0,    -- Legacy: TikTok price (deprecated)
  product_id uuid,                            -- Linked product
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  -- Normal prices (Facebook, Database, Google) by customer type
  price_normal_np numeric NOT NULL DEFAULT 0, -- Normal price for NP (New Prospect)
  price_normal_ep numeric NOT NULL DEFAULT 0, -- Normal price for EP (Existing Prospect)
  price_normal_ec numeric NOT NULL DEFAULT 0, -- Normal price for EC (Existing Customer)
  -- Shopee prices by customer type
  price_shopee_np numeric NOT NULL DEFAULT 0, -- Shopee price for NP
  price_shopee_ep numeric NOT NULL DEFAULT 0, -- Shopee price for EP
  price_shopee_ec numeric NOT NULL DEFAULT 0, -- Shopee price for EC
  -- TikTok prices by customer type
  price_tiktok_np numeric NOT NULL DEFAULT 0, -- TikTok price for NP
  price_tiktok_ep numeric NOT NULL DEFAULT 0, -- TikTok price for EP
  price_tiktok_ec numeric NOT NULL DEFAULT 0, -- TikTok price for EC
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
  marketer_id uuid,                          -- Reference to profiles.id (optional)
  marketer_id_staff text NOT NULL,           -- Staff ID of marketer who created order
  marketer_lead_id_staff text,               -- Staff ID of marketer who owns the lead (for admin orders)
  admin_id_staff text,                       -- Admin Staff ID who created this order (for admin orders)
  prospect_id uuid,                          -- Reference to prospects.id (for admin orders)
  marketer_name text NOT NULL,               -- Customer name (displayed as marketer_name)
  no_phone text NOT NULL,                    -- Customer phone
  alamat text NOT NULL,                      -- Address
  poskod text NOT NULL,                      -- Postcode
  bandar text NOT NULL,                      -- City
  negeri text NOT NULL,                      -- State
  produk text NOT NULL,                      -- Bundle name
  sku text NOT NULL,
  kuantiti integer NOT NULL DEFAULT 1,
  harga_jualan_produk numeric DEFAULT 0,     -- Product selling price
  harga_jualan_sebenar numeric NOT NULL,     -- Actual selling price
  harga_jualan_agen numeric DEFAULT 0,       -- Agent selling price
  kos_pos numeric DEFAULT 0,                 -- Shipping cost
  kos_produk numeric DEFAULT 0,              -- Product cost
  profit numeric DEFAULT 0,                  -- Profit
  kurier text,                               -- Courier (Ninjavan, Shopee, Tiktok)
  berat_parcel integer DEFAULT 0,            -- Parcel weight (grams)
  no_tracking text,                          -- Tracking number
  status_parcel text DEFAULT 'Pending'::text,-- Parcel status
  nota_staff text,                           -- Staff notes
  tarikh_tempahan text NOT NULL,             -- Order date (string format for display)
  date_order date DEFAULT CURRENT_DATE,      -- Order date (for filtering/sorting)
  date_processed date,                       -- Processed date (when delivery_status = 'Shipped')
  jenis_platform text,                       -- Platform: Facebook, Tiktok, Shopee, Database, Google
  jenis_customer text,                       -- Customer type: NP, EP, EC
  cara_bayaran text,                         -- Payment method: CASH, COD
  delivery_status text DEFAULT 'Pending'::text, -- Pending, Shipped, Success, Failed, Return
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  -- Payment Details (for CASH payments)
  tarikh_bayaran date,                       -- Payment date (also used for COD success date)
  jenis_bayaran text,                        -- Payment type: Online Transfer, Credit Card, CDM, CASH
  bank text,                                 -- Bank name
  receipt_image_url text,                    -- Receipt image URL (Vercel Blob)
  waybill_url text,                          -- Waybill PDF URL (Vercel Blob) - for Shopee/Tiktok
  date_return date,                          -- Return date (when delivery_status = 'Return')
  seo text,                                  -- SEO status: null, 'Shipped', 'Successfull Delivery', 'Return'
  CONSTRAINT customer_orders_pkey PRIMARY KEY (id)
);

-- =====================================================
-- TABLE: prospects (Leads management)
-- =====================================================
CREATE TABLE public.prospects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  nama_prospek text NOT NULL,                -- Prospect name
  no_telefon text NOT NULL,                  -- Phone number
  niche text NOT NULL,                       -- Niche/category (product name)
  jenis_prospek text NOT NULL,               -- Prospect type: NP, EP, EC
  tarikh_phone_number date,                  -- Date of phone number entry
  admin_id_staff text,                       -- Admin Staff ID who claimed this lead
  admin_claimed_at timestamp with time zone, -- Timestamp when admin claimed this lead
  marketer_id_staff text,                    -- Marketer Staff ID who owns this prospect
  created_by uuid,                           -- Reference to profiles.id
  status_closed text,                        -- Closed status (closed, INVALID, TIDAK ANGKAT, BUSY, etc.)
  price_closed numeric,                      -- Closed price
  count_order integer NOT NULL DEFAULT 0,    -- Count of orders made by this lead
  profile text,                              -- Profile info (Masalah + Pekerjaan from admin)
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
  master_agent_id text,                      -- Master agent reference
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
-- TABLE: pnl_config (PNL salary tier configuration)
-- =====================================================
-- Configured by BOD for marketer/admin salary calculation
CREATE TABLE public.pnl_config (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL DEFAULT 'marketer',    -- 'marketer' or 'admin'
  min_sales numeric NOT NULL DEFAULT 0,     -- Minimum sales threshold
  max_sales numeric,                         -- Maximum sales threshold (null = no limit)
  roas_min numeric NOT NULL DEFAULT 0,      -- Minimum ROAS requirement
  roas_max numeric NOT NULL DEFAULT 99,     -- Maximum ROAS range
  commission_percent numeric NOT NULL DEFAULT 0,  -- Commission % of net sales
  bonus_amount numeric NOT NULL DEFAULT 0,  -- Fixed bonus amount
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT pnl_config_pkey PRIMARY KEY (id),
  CONSTRAINT pnl_config_role_check CHECK (role IN ('marketer', 'admin'))
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
--    - Facebook, Database, Google -> Uses Ninjavan courier (Order Biasa)
--    - Shopee, Tiktok -> Manual waybill upload, no Ninjavan
--
-- 4. Payment Methods:
--    - CASH -> Shows payment details modal with receipt
--    - COD -> Cash on delivery, no upfront payment
--
-- 5. Roles & Dashboard Access:
--    - marketer: Own orders, leads, spend. Dashboard shows sales stats.
--    - admin: Full access except logistics
--    - bod: Board of directors, view access
--    - logistic: Logistics management, products, bundles. Dashboard shows order counts.
--    - account: Finance and reports access
--
-- 6. Delivery Status Flow:
--    - Pending -> Shipped -> Success/Failed/Return
--    - date_processed: Set when status changes to Shipped
--    - date_return: Set when status changes to Return
--    - tarikh_bayaran: Set when COD is successfully delivered (SEO = 'Successfull Delivery')
--
-- 7. Bundle Pricing Matrix:
--    - 9 price columns for 3 platforms x 3 customer types
--    - Platforms: Normal (Facebook/Database/Google), Shopee, TikTok
--    - Customer Types: NP (New Prospect), EP (Existing Prospect), EC (Existing Customer)
--    - Legacy columns (price_normal, price_shopee, price_tiktok) are deprecated
--
-- 8. SEO Status (for Pending Tracking):
--    - null: Not yet processed
--    - 'Shipped': Order has been shipped (set when clicking Shipped button)
--    - 'Successfull Delivery': COD payment received
--    - 'Return': Order returned
--    - Pending Tracking filter: delivery_status = 'Shipped'
--      AND (seo IS NULL OR seo != 'Successfull Delivery')
--      AND cara_bayaran = 'COD'
--
-- 9. Dashboard Stats by Role:
--    - Marketer Dashboard (15 boxes):
--      Total Sales, Return, Total Spend, ROAS,
--      Sales FB, Sales Database, Sales Shopee, Sales TikTok, Sales Google,
--      Sales NP, Sales EP, Sales EC,
--      Total Lead, Average KPK, Closing Rate
--
--    - Logistic Dashboard (10 boxes):
--      Total Order, Total Pending, Total Process, Total Return,
--      Total Order Biasa, Total Shopee, Total TikTok,
--      Total Cash, Total COD, Pending Tracking
--
-- 10. Date Filtering:
--     - Most dashboards use date_order for filtering
--     - Default range: Current month (start to end)
--     - Top 10 leaderboard fetches ALL orders (not filtered by marketer)
--
-- 11. WhatsApp Integration (Whacenter):
--     - API URL: https://api.whacenter.com/api
--     - Default API Key: d44ac50f-0bd8-4ed0-b85f-55465e08d7cf
--     - Endpoints: addDevice, getStatus, getQr
--     - Flow: Create device -> Generate (addDevice) -> Scan QR -> Connected
--     - Only marketers can configure WhatsApp devices in Profile page
