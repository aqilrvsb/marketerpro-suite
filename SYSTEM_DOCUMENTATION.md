# DFR EMPIRE ERP System Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Database Schema](#database-schema)
4. [User Roles & Permissions](#user-roles--permissions)
5. [Authentication System](#authentication-system)
6. [Feature Modules](#feature-modules)
7. [API Integrations](#api-integrations)
8. [Edge Functions](#edge-functions)
9. [Business Logic & Workflows](#business-logic--workflows)
10. [File Structure](#file-structure)
11. [Design System](#design-system)

---

## System Overview

**DFR EMPIRE ERP** is a comprehensive Enterprise Resource Planning system for a Business Marketing Company. The system manages:
- Customer orders and sales tracking
- Prospect/Lead management
- Logistics and shipment processing
- Product and inventory management
- Marketing spend analytics
- Financial reporting

### Business Context
This ERP serves a Malaysian e-commerce/marketing business that sells products through multiple platforms (Facebook, TikTok, Shopee, Database leads, Google ads). The system tracks the entire sales funnel from lead generation to order fulfillment.

---

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS with custom design system
- **UI Components**: shadcn/ui (customized)
- **State Management**: React Context API
- **Routing**: React Router DOM v6
- **Forms**: React Hook Form with Zod validation
- **Data Fetching**: TanStack Query (React Query)
- **Charts**: Recharts
- **Notifications**: Sonner (toast notifications)

### Backend (Supabase/Lovable Cloud)
- **Database**: PostgreSQL
- **Authentication**: Supabase Auth
- **Edge Functions**: Deno runtime
- **Row Level Security (RLS)**: Enabled on all tables
- **File Storage**: Supabase Storage (for receipts, waybills)

---

## Database Schema

### Enum Types

```sql
CREATE TYPE public.app_role AS ENUM ('marketer', 'admin', 'bod', 'logistic', 'account');
```

### Tables

#### 1. `profiles`
Stores user profile information linked to auth.users.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | - | Primary key, references auth.users(id) |
| username | text | No | - | Staff ID (e.g., MR-001, AD-001) |
| full_name | text | No | - | User's full name |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

#### 2. `user_roles`
Stores user roles separately for security (prevents privilege escalation).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| user_id | uuid | No | - | References auth.users(id) |
| role | app_role | No | - | User's role |
| created_at | timestamptz | No | now() | Creation timestamp |

#### 3. `products`
Product inventory management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| name | text | No | - | Product name |
| sku | text | No | - | Stock Keeping Unit code |
| base_cost | numeric | No | 0 | Base cost price |
| quantity | integer | No | 0 | Current stock quantity |
| stock_in | integer | No | 0 | Total stock received |
| stock_out | integer | No | 0 | Total stock dispatched |
| is_active | boolean | No | true | Active status |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

#### 4. `bundles`
Product bundles with platform-specific pricing.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| product_id | uuid | Yes | - | References products(id) |
| name | text | No | - | Bundle name |
| units | integer | No | 1 | Number of units in bundle |
| price_normal | numeric | No | 0 | Normal selling price (Facebook, Database, Google) |
| price_shopee | numeric | No | 0 | Shopee platform price |
| price_tiktok | numeric | No | 0 | TikTok platform price |
| is_active | boolean | No | true | Active status (only active bundles show in order form) |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

#### 5. `customer_orders`
Main orders table with all order details.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| id_sale | text | Yes | - | Sale ID (DFR00001 format) |
| no_tempahan | text | No | - | Order number |
| marketer_id | uuid | Yes | - | Marketer's user ID |
| marketer_id_staff | text | No | - | Marketer's Staff ID |
| marketer_name | text | No | - | Marketer's name |
| no_phone | text | No | - | Customer phone (starts with 6) |
| alamat | text | No | - | Full address |
| poskod | text | No | - | Postal code |
| bandar | text | No | - | City/District |
| negeri | text | No | - | State |
| sku | text | No | - | Product SKU |
| produk | text | No | - | Product/Bundle name |
| kuantiti | integer | No | 1 | Quantity ordered |
| harga_jualan_produk | numeric | Yes | 0 | Product selling price |
| harga_jualan_sebenar | numeric | No | - | Actual selling price |
| kos_pos | numeric | Yes | 0 | Shipping cost |
| kos_produk | numeric | Yes | 0 | Product cost |
| profit | numeric | Yes | 0 | Profit amount |
| harga_jualan_agen | numeric | Yes | 0 | Agent selling price |
| kurier | text | Yes | - | Courier (Ninjavan COD/CASH) |
| no_tracking | text | Yes | - | Tracking number |
| status_parcel | text | Yes | 'Pending' | Parcel status |
| delivery_status | text | Yes | 'Pending' | Delivery status (Pending/Shipped) |
| nota_staff | text | Yes | - | Staff notes |
| berat_parcel | integer | Yes | 0 | Parcel weight |
| cara_bayaran | text | Yes | - | Payment method (COD/CASH) |
| jenis_customer | text | Yes | - | Customer type (NP/EP/EC/REPEAT) |
| jenis_platform | text | Yes | - | Platform (Facebook/TikTok/Shopee/Database/Google) |
| tarikh_tempahan | text | No | - | Order date string |
| date_order | date | Yes | CURRENT_DATE | Order date |
| date_processed | date | Yes | - | Processing date (when shipped) |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

#### 6. `prospects`
Lead/prospect management.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| nama_prospek | text | No | - | Prospect name |
| no_telefon | text | No | - | Phone number (must start with 6) |
| niche | text | No | - | Product niche/SKU |
| jenis_prospek | text | No | - | Prospect type (NP/EP) |
| admin_id_staff | text | Yes | - | Admin Staff ID |
| tarikh_phone_number | date | Yes | - | Date phone number obtained |
| status_closed | text | Yes | - | Closed status ('closed' or null) |
| price_closed | numeric | Yes | - | Price when closed/converted |
| created_by | uuid | Yes | - | Creator's user ID |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

#### 7. `spends`
Marketing spend tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| tarikh_spend | date | No | CURRENT_DATE | Spend date |
| product | text | No | - | Product name |
| jenis_platform | text | No | - | Platform (Facebook/TikTok/Shopee/Database/Google) |
| total_spend | numeric | No | 0 | Total spend amount |
| marketer_id_staff | text | Yes | - | Marketer Staff ID |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

#### 8. `stock_movements`
Stock in/out tracking.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| product_id | uuid | No | - | References products(id) |
| type | text | No | - | Movement type ('in' or 'out') |
| quantity | integer | No | - | Quantity moved |
| date | date | No | CURRENT_DATE | Movement date |
| description | text | Yes | - | Description/notes |
| master_agent_id | text | Yes | - | Master agent ID |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

#### 9. `ninjavan_config`
Ninjavan API configuration (managed by Logistic role).

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| client_id | text | No | - | Ninjavan API Client ID |
| client_secret | text | No | - | Ninjavan API Client Secret |
| sender_name | text | No | - | Sender name |
| sender_phone | text | No | - | Sender phone |
| sender_email | text | No | - | Sender email |
| sender_address1 | text | No | - | Sender address line 1 |
| sender_address2 | text | Yes | - | Sender address line 2 |
| sender_postcode | text | No | - | Sender postal code |
| sender_city | text | No | - | Sender city |
| sender_state | text | No | - | Sender state |
| created_at | timestamptz | No | now() | Creation timestamp |
| updated_at | timestamptz | No | now() | Last update timestamp |

#### 10. `ninjavan_tokens`
Cached Ninjavan API tokens.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | No | gen_random_uuid() | Primary key |
| access_token | text | No | - | OAuth access token |
| expires_at | timestamptz | No | - | Token expiration time |
| created_at | timestamptz | No | now() | Creation timestamp |

### Database Functions

#### 1. `generate_sale_id()`
Generates incremental sale IDs in format DFR00001, DFR00002, etc.

```sql
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
```

#### 2. `has_role(_user_id uuid, _role app_role)`
Security definer function to check user roles (prevents RLS recursion).

```sql
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
```

#### 3. `handle_new_user()`
Trigger function that creates profile and role entries when a new user signs up.

```sql
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
```

### Row Level Security (RLS) Policies

All tables have RLS enabled. Key policies:

- **profiles**: Users can only view their own profile
- **user_roles**: Users can only view their own role
- **Other tables**: Authenticated users have full CRUD access (secured at application level by role)

---

## User Roles & Permissions

### Role Hierarchy

| Role | Staff ID Format | Access Level |
|------|-----------------|--------------|
| **Marketer** | MR-XXX | Order creation, prospect management |
| **Admin** | AD-XXX | Full admin access, user management |
| **BOD** | BOD | Board of Directors, reports & analytics |
| **Logistic** | LOGHQ | Logistics operations, shipment processing |
| **Account** | ACCHQ | Financial management, spend tracking |

### Role-Based Feature Access

#### Marketer (MR-XXX)
- Create customer orders
- View own order history
- Manage prospects/leads
- View dashboard stats

#### Admin (AD-XXX)
- All Marketer permissions
- Manage all users
- View all orders
- System configuration

#### BOD (Board of Directors)
- View all reports
- Analytics dashboard
- Sales performance metrics
- Financial overview

#### Logistic (LOGHQ)
- **Order Tab**: View pending orders, process to shipped
- **Shipment Tab**: Track shipped orders
- **Product Tab**: Manage products and inventory
- **Bundle Tab**: Manage product bundles and pricing
- **Stock IN Tab**: Record stock receipts
- **Stock OUT Tab**: Record stock dispatches
- **Ninjavan Settings**: Configure Ninjavan API

#### Account (ACCHQ)
- **Spend Management**: Track marketing spend
- **Financial Reports**: View financial analytics
- **ROAS Calculations**: Return on ad spend metrics

---

## Authentication System

### Login Flow
1. User enters **Staff ID** (NOT email) and password
2. System looks up email from Staff ID in profiles table
3. Authenticates with Supabase Auth using email/password
4. Fetches user profile and role from database
5. Redirects based on role

### Staff ID Format
- Marketers: `MR-001`, `MR-002`, etc.
- Admins: `AD-001`, `AD-002`, etc.
- BOD: `BOD`
- Logistic: `LOGHQ`
- Account: `ACCHQ`

### Auth Context (src/context/AuthContext.tsx)
Provides:
- `user`: Current Supabase user
- `session`: Current session
- `profile`: User profile with username, full_name
- `signIn(email, password)`: Login function
- `signUp(email, password, username, fullName, role)`: Registration
- `signOut()`: Logout function

---

## Feature Modules

### 1. Dashboard
- Summary statistics
- Quick access to key features
- Role-specific widgets

### 2. Order Form (Marketer)
**Location**: `/order-form`

**Fields**:
- Nama Pelanggan (Customer Name)
- No. Telefon (Phone - must start with 6)
- Jenis Platform (Platform: Facebook/TikTok/Shopee/Database/Google)
- Jenis Customer (Type: NP/EP/EC/REPEAT)
- Poskod (Postal Code)
- Negeri (State - dropdown of Malaysian states)
- Daerah (District)
- Alamat (Full Address - spans 4 columns)
- Produk (Product - dropdown of active bundles)
- Harga Jualan (Selling Price - validated against minimum)
- Cara Bayaran (Payment: COD/CASH)
- Nota (Notes)

**Conditional Fields**:
- For Shopee/TikTok: Tracking Number, Waybill PDF upload
- For CASH payments (non-Shopee/TikTok): Tarikh Bayaran, Jenis Bayaran, Pilih Bank, Resit Bayaran

**Price Validation**:
- Minimum price based on bundle + platform
- Normal price for Facebook/Database/Google
- Shopee price for Shopee platform
- TikTok price for TikTok platform

**Auto-Fill**:
- Kurier: "Ninjavan COD" or "Ninjavan CASH" based on payment
- delivery_status: "Pending"
- date_order: Current date

### 3. History Page
**Location**: `/orders`

**Stats Cards**:
- Total Customer
- Total Sales
- Total Return
- Total Unit
- Total Order Pending
- Total Order Shipped
- Total Order Return

**Table Columns**:
No., Tarikh Order, Nama Pelanggan, Phone, Produk, Tracking No, Total Sales, Jenis Platform, Jenis Customer, Negeri, Alamat, Cara Bayaran, Delivery Status, Action

**Filters**:
- Date range (Start Date, End Date) based on date_order

**Actions** (for Pending orders only):
- Edit: Opens order form with pre-filled data
- Delete: Confirms and removes order (cancels Ninjavan if applicable)

### 4. Logistics Module

#### Order Tab
- Shows orders with delivery_status = 'Pending'
- Filter by date_order
- "Process" button moves order to Shipped
- Stats: Total Pending, Pending COD, Pending CASH

#### Shipment Tab
- Shows orders with delivery_status = 'Shipped'
- Filter by date_processed
- Stats: Total Shipped, Shipped COD, Shipped CASH

#### Product Tab
- Manage products with SKU
- View stock levels
- Date filter applies to stock_in/stock_out columns only
- Quantity always shows current total

#### Bundle Tab
- Create/edit product bundles
- Set platform-specific pricing
- Toggle active/inactive status
- Only active bundles appear in order form

#### Stock IN Tab
- Manual stock receipt recording
- Increases product quantity
- Delete removes quantity from product

#### Stock OUT Tab
- Manual stock dispatch recording
- Decreases product quantity
- Delete adds quantity back to product

#### Ninjavan Settings
- Configure API credentials (Client ID, Client Secret)
- Set sender information (name, phone, email, address)
- Managed by Logistic role only

### 5. Prospects/Leads Module
**Location**: `/prospects`

**Stats Cards**:
- Total Lead
- Total NP Lead
- Total EP Lead
- Total Sales (sum of price_closed)
- Lead Close (closed count)
- Lead XClose (not closed count)

**Table Columns**:
No, Tarikh, Nama, Phone, Niche (SKU), Jenis Prospek, Admin Id, Status, Price, Action

**Add Prospect Form**:
- Nama (Name)
- Phone (must start with 6)
- Niche (dropdown from bundles/products)
- Jenis Prospek (NP or EP only)
- Admin ID Staff (optional)

**Import**: CSV/Excel upload with SKU matching for niche

### 6. Spend Module
**Location**: `/spend`

**Stats Cards**:
- Total Spend
- Total Spend FB (Facebook)
- Total Spend Database
- Total Spend Google
- Total Spend TikTok
- Total Spend Shopee

**Metrics Calculated**:
- KPK (Cost per Lead) = Total Spend / Total Leads
- ROAS = Total Spend / Sum of price_closed
- Closing Rate % = Closed Leads / Total Leads

**Table**: Individual spend entries by date, product, platform

---

## API Integrations

### Ninjavan API

**Purpose**: Automatic shipment order creation for non-Shopee/TikTok orders

**Base URL**: `https://api.ninjavan.co` (Malaysia)

**Authentication**: OAuth 2.0 Client Credentials

**Token Management**:
1. Check `ninjavan_tokens` table for valid token
2. If expired or missing, request new token from `/2.0/oauth/access_token`
3. Cache token with expiry in `ninjavan_tokens` table
4. Use cached token for API calls

**Order Creation Endpoint**: `POST /my/4.1/orders`

**Order Payload Structure**:
```json
{
  "service_type": "Parcel",
  "service_level": "Standard",
  "requested_tracking_number": "BISNESOWNER-DFR00001",
  "merchant_order_number": "BISNESOWNER-DFR00001",
  "from": {
    "name": "Sender Name",
    "phone_number": "60123456789",
    "email": "sender@email.com",
    "address": {
      "address1": "Address Line 1",
      "address2": "Address Line 2",
      "postcode": "12345",
      "city": "City",
      "state": "State",
      "country": "MY"
    }
  },
  "to": {
    "name": "Customer Name",
    "phone_number": "60123456789",
    "address": {
      "address1": "Customer Address",
      "postcode": "54321",
      "city": "Customer City",
      "state": "Customer State",
      "country": "MY"
    }
  },
  "parcel_job": {
    "is_pickup_required": false,
    "pickup_service_type": "Scheduled",
    "pickup_service_level": "Standard",
    "pickup_address_id": null,
    "pickup_date": "2024-01-15",
    "pickup_timeslot": {
      "start_time": "09:00",
      "end_time": "12:00",
      "timezone": "Asia/Kuala_Lumpur"
    },
    "delivery_start_date": "2024-01-16",
    "delivery_timeslot": {
      "start_time": "09:00",
      "end_time": "18:00",
      "timezone": "Asia/Kuala_Lumpur"
    },
    "dimensions": {
      "weight": 1
    },
    "items": [
      {
        "item_description": "Product Name",
        "quantity": 1,
        "is_dangerous_good": false
      }
    ]
  }
}
```

**COD Handling**:
If payment method is COD, add to parcel_job:
```json
"cash_on_delivery": {
  "amount": 99.00,
  "currency": "MYR"
}
```

**Order Cancellation Endpoint**: `DELETE /my/4.1/orders/{tracking_number}`

**Tracking Number Format**:
- id_sale: `DFR00001`, `DFR00002`, etc.
- merchant_order_number: `BISNESOWNER-DFR00001`
- Returned tracking number stored in `no_tracking` column

---

## Edge Functions

### Location
`supabase/functions/`

### 1. ninjavan-order
**File**: `supabase/functions/ninjavan-order/index.ts`

**Purpose**: Create Ninjavan shipment order

**Trigger**: Called when Marketer submits order with non-Shopee/TikTok platform

**Flow**:
1. Receive order data from frontend
2. Fetch Ninjavan config from database
3. Get or refresh OAuth token
4. Build order payload with sender/recipient details
5. POST to Ninjavan API
6. Return tracking number

**Request Body**:
```typescript
interface OrderData {
  id_sale: string;
  customerName: string;
  phone: string;
  address: string;
  postcode: string;
  city: string;
  state: string;
  productName: string;
  quantity: number;
  totalAmount: number;
  paymentMethod: 'COD' | 'CASH';
  weight: number;
}
```

### 2. ninjavan-cancel
**File**: `supabase/functions/ninjavan-cancel/index.ts`

**Purpose**: Cancel Ninjavan order

**Trigger**: Called when deleting/editing order with existing tracking number

**Request Body**:
```json
{
  "trackingNumber": "NJABC123456789"
}
```

---

## Business Logic & Workflows

### Order Creation Workflow

```
Marketer fills order form
         │
         ▼
  Validate all fields
         │
         ▼
  Check price >= minimum
         │
         ▼
  Generate id_sale (DFR00001)
         │
         ▼
┌────────┴────────┐
│ Platform check  │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
Shopee/    Other
TikTok     (FB/DB/Google)
    │         │
    ▼         ▼
Use manual   Call Ninjavan
tracking     edge function
    │         │
    ▼         ▼
Save to database
         │
         ▼
  If Jenis Customer = NP/EP
         │
         ▼
  Update prospect status_closed
  and price_closed
```

### Order Processing Workflow (Logistics)

```
Order in "Pending" status
         │
         ▼
  Logistic clicks "Process"
         │
         ▼
  Update delivery_status = 'Shipped'
  Set date_processed = today
         │
         ▼
  Order moves to Shipment tab
```

### Manual Tracking Regeneration

```
Order without tracking number
(non-Shopee/TikTok)
         │
         ▼
  Click "Car" icon in History
         │
         ▼
  Dialog to confirm poskod
         │
         ▼
  Call Ninjavan edge function
  with existing order data
         │
         ▼
  Update no_tracking in database
```

### Stock Movement Logic

```
Stock IN:
  1. Insert stock_movement (type='in')
  2. Update product.stock_in += quantity
  3. Update product.quantity += quantity

Stock IN Delete:
  1. Delete stock_movement
  2. Update product.stock_in -= quantity
  3. Update product.quantity -= quantity

Stock OUT:
  1. Insert stock_movement (type='out')
  2. Update product.stock_out += quantity
  3. Update product.quantity -= quantity

Stock OUT Delete:
  1. Delete stock_movement
  2. Update product.stock_out -= quantity
  3. Update product.quantity += quantity
```

### Prospect to Order Linking

```
Marketer creates order with
Jenis Customer = NP or EP
         │
         ▼
  Find latest prospect for marketer
         │
         ▼
  Update prospect:
    status_closed = 'closed'
    price_closed = harga_jualan_sebenar
```

---

## File Structure

```
src/
├── components/
│   ├── layout/
│   │   ├── DashboardLayout.tsx    # Main layout wrapper
│   │   └── Sidebar.tsx            # Navigation sidebar
│   ├── logistics/
│   │   ├── BundleTab.tsx          # Bundle management
│   │   ├── ProductTab.tsx         # Product management
│   │   ├── StockInTab.tsx         # Stock IN operations
│   │   └── StockOutTab.tsx        # Stock OUT operations
│   ├── ui/                        # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── table.tsx
│   │   └── ... (other UI components)
│   └── NavLink.tsx                # Navigation link component
├── context/
│   ├── AuthContext.tsx            # Authentication state
│   ├── BundleContext.tsx          # Bundle data context
│   └── DataContext.tsx            # Shared data context
├── hooks/
│   ├── use-mobile.tsx             # Mobile detection hook
│   └── use-toast.ts               # Toast notifications hook
├── integrations/
│   └── supabase/
│       ├── client.ts              # Supabase client (auto-generated)
│       └── types.ts               # Database types (auto-generated)
├── lib/
│   └── utils.ts                   # Utility functions (cn, etc.)
├── pages/
│   ├── Auth.tsx                   # Login/signup page
│   ├── Dashboard.tsx              # Main dashboard
│   ├── Finance.tsx                # Financial page
│   ├── Index.tsx                  # Landing/redirect page
│   ├── Logistics.tsx              # Logistics module
│   ├── NinjavanSettings.tsx       # Ninjavan configuration
│   ├── NotFound.tsx               # 404 page
│   ├── OrderForm.tsx              # Order creation form
│   ├── Orders.tsx                 # Order history (History page)
│   ├── Prospects.tsx              # Leads management
│   ├── ReportingSpend.tsx         # Spend reporting
│   ├── Reports.tsx                # General reports
│   ├── Settings.tsx               # Settings page
│   └── Spend.tsx                  # Spend tracking
├── types/
│   └── index.ts                   # TypeScript interfaces
├── App.css                        # Global styles
├── App.tsx                        # Main app with routes
├── index.css                      # Tailwind + design tokens
├── main.tsx                       # Entry point
└── vite-env.d.ts                  # Vite type definitions

supabase/
├── config.toml                    # Supabase configuration
└── functions/
    ├── ninjavan-order/
    │   └── index.ts               # Create Ninjavan order
    └── ninjavan-cancel/
        └── index.ts               # Cancel Ninjavan order

Root files:
├── .env                           # Environment variables (auto-managed)
├── index.html                     # HTML entry point
├── tailwind.config.ts             # Tailwind configuration
├── vite.config.ts                 # Vite configuration
├── MIGRATION_SCRIPT.sql           # Database migration script
└── SYSTEM_DOCUMENTATION.md        # This file
```

---

## Design System

### Color Tokens (index.css)

All colors use HSL format and are defined in CSS variables:

```css
:root {
  --background: /* background color */
  --foreground: /* text color */
  --primary: /* brand color */
  --primary-foreground: /* text on primary */
  --secondary: /* secondary UI color */
  --muted: /* muted backgrounds */
  --accent: /* accent color */
  --destructive: /* error/danger color */
  --border: /* border color */
  --input: /* input border */
  --ring: /* focus ring */
}
```

### Typography
- Font stack defined in Tailwind config
- Consistent heading hierarchy
- Proper contrast ratios

### Components
All UI components are shadcn/ui based, customized with:
- Consistent border radius
- Shadow styles
- Animation transitions
- Dark mode support

### Responsive Design
- Mobile-first approach
- Breakpoints: sm, md, lg, xl, 2xl
- Sidebar collapses on mobile
- Tables become scrollable on small screens

---

## Malaysian States (NEGERI_OPTIONS)

```typescript
const NEGERI_OPTIONS = [
  'JOHOR', 'KEDAH', 'KELANTAN', 'MELAKA', 'NEGERI SEMBILAN',
  'PAHANG', 'PERAK', 'PERLIS', 'PULAU PINANG', 'SABAH',
  'SARAWAK', 'SELANGOR', 'TERENGGANU', 'KUALA LUMPUR', 
  'LABUAN', 'PUTRAJAYA'
];
```

---

## Platform Options

```typescript
const JENIS_PLATFORM_OPTIONS = [
  'Facebook', 'TikTok', 'Shopee', 'Database', 'Google'
];
```

---

## Customer Types

```typescript
const JENIS_CUSTOMER_OPTIONS = [
  'NP',      // New Prospect
  'EP',      // Existing Prospect  
  'EC',      // Existing Customer
  'REPEAT'   // Repeat Customer
];
```

---

## Payment Methods

```typescript
const CARA_BAYARAN_OPTIONS = [
  'COD',   // Cash on Delivery (Ninjavan collects)
  'CASH'   // Pre-paid (customer already paid)
];
```

---

## Important Notes for Developers

1. **Never store roles in profiles table** - Use separate user_roles table
2. **Always use has_role() function** - Prevents RLS recursion
3. **Staff ID is login identifier** - Not email
4. **Phone numbers must start with 6** - Malaysian format
5. **Only active bundles show in order form** - Check is_active flag
6. **Ninjavan integration is automatic** - For non-Shopee/TikTok orders
7. **Stock operations are manual only** - No automatic adjustments
8. **Price validation uses platform-specific pricing** - From bundles table
9. **id_sale format is DFR00001** - Auto-incremented sequence
10. **merchant_order_number format is BISNESOWNER-DFR00001** - For Ninjavan API

---

## Quick Start for Developers

1. Clone repository
2. Install dependencies: `npm install`
3. Set up Supabase project with MIGRATION_SCRIPT.sql
4. Configure environment variables
5. Run development server: `npm run dev`
6. Create test users in Supabase Auth with appropriate metadata

---

*Last Updated: December 2024*
*Version: 1.0*
