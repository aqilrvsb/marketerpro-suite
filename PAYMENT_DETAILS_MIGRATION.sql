-- Migration: Add Payment Details and Waybill Columns to customer_orders table
-- Run this in Supabase SQL Editor

-- Add payment detail columns and waybill_url
ALTER TABLE customer_orders
ADD COLUMN IF NOT EXISTS tarikh_bayaran DATE,
ADD COLUMN IF NOT EXISTS jenis_bayaran TEXT,
ADD COLUMN IF NOT EXISTS bank TEXT,
ADD COLUMN IF NOT EXISTS receipt_image_url TEXT,
ADD COLUMN IF NOT EXISTS waybill_url TEXT;
