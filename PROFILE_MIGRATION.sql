-- Migration: Add WhatsApp Number column to profiles table
-- Run this in Supabase SQL Editor

-- Add whatsapp_number column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
