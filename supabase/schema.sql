-- ####################################################################
-- #  Supabase Database Schema for the Secret Trading Agent App       #
-- ####################################################################
--
-- This script will create all the necessary tables for the application
-- to run correctly.
--
-- To use this file:
-- 1. Go to the "SQL Editor" in your Supabase project dashboard.
-- 2. Click "+ New query".
-- 3. Paste the entire contents of this file into the editor.
-- 4. Click the "RUN" button.
--

-- 1. Creates the "users" table
-- This table stores user wallet information, viewing keys, and spending allowances.
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address text NOT NULL UNIQUE,
  sscrt_key text NULL,
  susdc_key text NULL,
  allowed_to_spend_sscrt text NULL,
  allowed_to_spend_susdc text NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS 'Stores user wallet information, keys, and spending allowances.';


-- 2. Creates the "conversations" table
-- This table stores the chat history for each user.
CREATE TABLE public.conversations (
  id serial PRIMARY KEY,
  wallet_address text NOT NULL,
  message text NOT NULL,
  response text NOT NULL,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_wallet_address FOREIGN KEY (wallet_address) REFERENCES users(wallet_address)
);

COMMENT ON TABLE public.conversations IS 'Stores chat history for each user.';


-- 3. Creates the "trading_state" table
-- This table tracks whether a user is convinced to trade.
CREATE TABLE public.trading_state (
  wallet_address text PRIMARY KEY,
  convinced integer NOT NULL DEFAULT 0,
  CONSTRAINT fk_wallet_address FOREIGN KEY (wallet_address) REFERENCES users(wallet_address)
);

COMMENT ON TABLE public.trading_state IS 'Tracks whether a user is convinced to trade.';

-- ####################################################################
-- #  End of Schema                                                   #
-- ####################################################################