import "./envConfig";
import { createClient } from '@supabase/supabase-js'

export const getClient = () => createClient(process.env.SUPABASE_DATABASE_URL!, process.env.SUPABASE_AUTH_TOKEN!);

export const supabase = getClient();