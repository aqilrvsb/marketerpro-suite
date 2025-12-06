-- =====================================================
-- COMPLETE SUPABASE MIGRATION SCRIPT
-- Target: https://wfvuxrhlrmpgzqgyjwxa.supabase.co
-- Generated: 2025-12-06
-- =====================================================

-- =====================================================
-- PART 1: CREATE ENUM TYPES
-- =====================================================

CREATE TYPE public.app_role AS ENUM ('marketer', 'admin', 'bod', 'logistic', 'account');

-- =====================================================
-- PART 2: CREATE SEQUENCES
-- =====================================================

CREATE SEQUENCE IF NOT EXISTS public.sale_id_seq START WITH 4;

-- =====================================================
-- PART 3: CREATE TABLES
-- =====================================================

-- PROFILES TABLE
CREATE TABLE public.profiles (
    id uuid NOT NULL PRIMARY KEY,
    username text NOT NULL,
    full_name text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- USER_ROLES TABLE
CREATE TABLE public.user_roles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid NOT NULL,
    role public.app_role NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- PRODUCTS TABLE
CREATE TABLE public.products (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    sku text NOT NULL,
    base_cost numeric NOT NULL DEFAULT 0,
    quantity integer NOT NULL DEFAULT 0,
    stock_in integer NOT NULL DEFAULT 0,
    stock_out integer NOT NULL DEFAULT 0,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- BUNDLES TABLE
CREATE TABLE public.bundles (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    units integer NOT NULL DEFAULT 1,
    price_normal numeric NOT NULL DEFAULT 0,
    price_shopee numeric NOT NULL DEFAULT 0,
    price_tiktok numeric NOT NULL DEFAULT 0,
    product_id uuid REFERENCES public.products(id),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- CUSTOMER_ORDERS TABLE
CREATE TABLE public.customer_orders (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    no_tempahan text NOT NULL,
    id_sale text,
    marketer_id uuid,
    marketer_id_staff text NOT NULL,
    marketer_name text NOT NULL,
    no_phone text NOT NULL,
    alamat text NOT NULL,
    poskod text NOT NULL,
    bandar text NOT NULL,
    negeri text NOT NULL,
    produk text NOT NULL,
    sku text NOT NULL,
    kuantiti integer NOT NULL DEFAULT 1,
    harga_jualan_produk numeric DEFAULT 0,
    harga_jualan_sebenar numeric NOT NULL,
    harga_jualan_agen numeric DEFAULT 0,
    kos_pos numeric DEFAULT 0,
    kos_produk numeric DEFAULT 0,
    profit numeric DEFAULT 0,
    kurier text,
    berat_parcel integer DEFAULT 0,
    no_tracking text,
    status_parcel text DEFAULT 'Pending'::text,
    nota_staff text,
    tarikh_tempahan text NOT NULL,
    date_order date DEFAULT CURRENT_DATE,
    date_processed date,
    jenis_platform text,
    jenis_customer text,
    cara_bayaran text,
    delivery_status text DEFAULT 'Pending'::text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- PROSPECTS TABLE
CREATE TABLE public.prospects (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nama_prospek text NOT NULL,
    no_telefon text NOT NULL,
    niche text NOT NULL,
    jenis_prospek text NOT NULL,
    tarikh_phone_number date,
    admin_id_staff text,
    created_by uuid,
    status_closed text,
    price_closed numeric,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- SPENDS TABLE
CREATE TABLE public.spends (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product text NOT NULL,
    jenis_platform text NOT NULL,
    total_spend numeric NOT NULL DEFAULT 0,
    tarikh_spend date NOT NULL DEFAULT CURRENT_DATE,
    marketer_id_staff text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- STOCK_MOVEMENTS TABLE
CREATE TABLE public.stock_movements (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id uuid NOT NULL REFERENCES public.products(id),
    type text NOT NULL,
    quantity integer NOT NULL,
    date date NOT NULL DEFAULT CURRENT_DATE,
    description text,
    master_agent_id text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- NINJAVAN_CONFIG TABLE
CREATE TABLE public.ninjavan_config (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
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
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- NINJAVAN_TOKENS TABLE
CREATE TABLE public.ninjavan_tokens (
    id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    access_token text NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- =====================================================
-- PART 4: CREATE FUNCTIONS
-- =====================================================

-- Generate Sale ID Function
CREATE OR REPLACE FUNCTION public.generate_sale_id()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  next_val INTEGER;
BEGIN
  SELECT nextval('sale_id_seq') INTO next_val;
  RETURN 'DFR' || LPAD(next_val::TEXT, 5, '0');
END;
$$;

-- Has Role Function (Security Definer)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Handle New User Trigger Function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', NEW.email),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', 'User')
  );
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'marketer')
  );
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- PART 5: CREATE TRIGGER
-- =====================================================

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- PART 6: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ninjavan_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ninjavan_tokens ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 7: CREATE RLS POLICIES
-- =====================================================

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

-- USER_ROLES POLICIES
CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

-- PRODUCTS POLICIES
CREATE POLICY "Authenticated users can view products" ON public.products
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert products" ON public.products
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update products" ON public.products
  FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete products" ON public.products
  FOR DELETE USING (true);

-- BUNDLES POLICIES
CREATE POLICY "Authenticated users can view bundles" ON public.bundles
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert bundles" ON public.bundles
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update bundles" ON public.bundles
  FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete bundles" ON public.bundles
  FOR DELETE USING (true);

-- CUSTOMER_ORDERS POLICIES
CREATE POLICY "Authenticated users can view orders" ON public.customer_orders
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert orders" ON public.customer_orders
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update orders" ON public.customer_orders
  FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete orders" ON public.customer_orders
  FOR DELETE USING (true);

-- PROSPECTS POLICIES
CREATE POLICY "Authenticated users can view prospects" ON public.prospects
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert prospects" ON public.prospects
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update prospects" ON public.prospects
  FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete prospects" ON public.prospects
  FOR DELETE USING (true);

-- SPENDS POLICIES
CREATE POLICY "Authenticated users can view spends" ON public.spends
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert spends" ON public.spends
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update spends" ON public.spends
  FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete spends" ON public.spends
  FOR DELETE USING (true);

-- STOCK_MOVEMENTS POLICIES
CREATE POLICY "Authenticated users can view stock_movements" ON public.stock_movements
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert stock_movements" ON public.stock_movements
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update stock_movements" ON public.stock_movements
  FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete stock_movements" ON public.stock_movements
  FOR DELETE USING (true);

-- NINJAVAN_CONFIG POLICIES
CREATE POLICY "Authenticated users can view ninjavan_config" ON public.ninjavan_config
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert ninjavan_config" ON public.ninjavan_config
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can update ninjavan_config" ON public.ninjavan_config
  FOR UPDATE USING (true);
CREATE POLICY "Authenticated users can delete ninjavan_config" ON public.ninjavan_config
  FOR DELETE USING (true);

-- NINJAVAN_TOKENS POLICIES
CREATE POLICY "Authenticated users can view ninjavan_tokens" ON public.ninjavan_tokens
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert ninjavan_tokens" ON public.ninjavan_tokens
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated users can delete ninjavan_tokens" ON public.ninjavan_tokens
  FOR DELETE USING (true);

-- =====================================================
-- PART 8: INSERT DATA
-- =====================================================

-- INSERT PRODUCTS
INSERT INTO public.products (id, name, sku, base_cost, quantity, stock_in, stock_out, is_active, created_at, updated_at)
VALUES 
  ('f70a5015-890d-4f2a-9cef-b6f1a7689570', 'GOLDEN SARI', 'GSI', 30, 30, 30, 0, true, '2025-12-05 23:20:53.830758+00', '2025-12-05 23:39:23.625+00');

-- INSERT BUNDLES
INSERT INTO public.bundles (id, name, units, price_normal, price_shopee, price_tiktok, product_id, is_active, created_at, updated_at)
VALUES 
  ('72f3d99e-2779-49be-ad86-30deb7faeee5', 'SET A', 10, 30, 0, 0, 'f70a5015-890d-4f2a-9cef-b6f1a7689570', true, '2025-12-06 03:57:15.20575+00', '2025-12-06 03:57:15.20575+00');

-- INSERT NINJAVAN_CONFIG
INSERT INTO public.ninjavan_config (id, client_id, client_secret, sender_name, sender_phone, sender_email, sender_address1, sender_address2, sender_postcode, sender_city, sender_state, created_at, updated_at)
VALUES 
  ('fe145481-a52a-412a-8c20-a2f1d9390bb1', 'c6a3c7090d9b452d911db6908a4684bb', '4da935398fe04efc98ceaf686d9fd20f', 'DFR EMPIRE ENTERPRISE', '60146674397', 'DFR@gmail.com', 'DFR locationnn', '', '22200', 'BESUT', 'TERENGGANU', '2025-12-06 03:58:27.828707+00', '2025-12-06 03:58:27.828707+00');

-- INSERT CUSTOMER_ORDERS
INSERT INTO public.customer_orders (id, no_tempahan, id_sale, marketer_id, marketer_id_staff, marketer_name, no_phone, alamat, poskod, bandar, negeri, produk, sku, kuantiti, harga_jualan_produk, harga_jualan_sebenar, harga_jualan_agen, kos_pos, kos_produk, profit, kurier, berat_parcel, no_tracking, status_parcel, nota_staff, tarikh_tempahan, date_order, date_processed, jenis_platform, jenis_customer, cara_bayaran, delivery_status, created_at, updated_at)
VALUES 
  ('67f06960-7f8b-44ea-bbad-27c70f140ffb', 'ORD1765011767619163', 'DFR00002', '75fc6c24-eae4-4327-bbcf-38284c3c5bb5', 'MR-001', 'aqil azfar', '60213123123', 'LOT 34 TAMAN SEDC', '22200', 'Besut', 'TERENGGANU', 'SET A', 'SET A', 1, 30.00, 30.00, 0.00, 0.00, 0.00, 30.00, 'Ninjavan COD', 0, 'NVMYDFREE0DFR00002', 'Pending', 'ADASDASDASD', '06/12/2025, 05:02 pm', '2025-12-06', NULL, 'Facebook', 'NP', 'COD', 'Pending', '2025-12-06 09:02:07.153027+00', '2025-12-06 09:02:07.153027+00'),
  ('47cfd59d-38bb-4083-af77-007ac0baee02', 'ORD1765011807825794', 'DFR00003', '75fc6c24-eae4-4327-bbcf-38284c3c5bb5', 'MR-001', 'MEOW', '602432423423', 'LOT 34 TAMAN SEDC KAMPUNG RAJA', '22200', 'BESUT', 'TERENGGANU', 'SET A', 'SET A', 1, 30.00, 30.00, 0.00, 0.00, 0.00, 30.00, 'Ninjavan CASH', 0, 'NVMYDFREE0DFR00003', 'Pending', 'ASDSADSADSADASD', '06/12/2025, 05:03 pm', '2025-12-06', NULL, 'Facebook', 'NP', 'CASH', 'Pending', '2025-12-06 09:02:46.525503+00', '2025-12-06 09:02:46.525503+00');

-- =====================================================
-- PART 9: NOTE ABOUT USERS
-- =====================================================
-- Users must be manually created in Supabase Auth dashboard
-- After creating users, insert their profiles and roles:
--
-- User 1: MR-001 (marketer)
-- User 2: BOD (bod)  
-- User 3: LOGHQ (logistic)
-- User 4: ACCHQ (account)
-- User 5: AD-001 (admin)
--
-- After creating users via Auth, run these INSERT statements
-- with the correct user IDs from auth.users:
--
-- INSERT INTO public.profiles (id, username, full_name) VALUES
--   ('<user_id>', 'MR-001', 'marketer'),
--   ('<user_id>', 'BOD', 'BOD'),
--   ('<user_id>', 'LOGHQ', 'LOGISTIK'),
--   ('<user_id>', 'ACCHQ', 'Account'),
--   ('<user_id>', 'AD-001', 'Admin');
--
-- INSERT INTO public.user_roles (user_id, role) VALUES
--   ('<user_id>', 'marketer'),
--   ('<user_id>', 'bod'),
--   ('<user_id>', 'logistic'),
--   ('<user_id>', 'account'),
--   ('<user_id>', 'admin');

-- =====================================================
-- MIGRATION COMPLETE!
-- =====================================================
