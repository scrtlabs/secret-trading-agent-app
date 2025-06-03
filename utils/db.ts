// dbSupabase.ts
import "./envConfig";
import { supabase } from "./tursoClient";

//
// Types
//
interface User {
  id: number;
  wallet_address: string;
  sscrt_key: string | null;
  susdc_key: string | null;
  allowed_to_spend_sscrt: string | null;
  allowed_to_spend_susdc: string | null;
  created_at: string;
}

interface ConversationRow {
  message: string;
  response: string;
  wallet_address: string;
}

interface Memory {
  message: string;
  response: string;
  user_id: string;
}

interface TradingStateRow {
  wallet_address: string;
  convinced: number;
}

//
// Conversations
//
export async function storeMemory(
  wallet_address: string,
  message: string,
  response: string
): Promise<void> {
  const { error } = await supabase
    .from("conversations")
    .insert([{ wallet_address, message, response }]);
  if (error) {
    console.error("Error inserting conversation:", error);
    throw error;
  }
}

export async function getMemory(
  wallet_address: string
): Promise<Memory[]> {
  const { data, error } = await supabase
    .from("conversations")
    .select("message, response, wallet_address")
    .eq("wallet_address", wallet_address)
    .order("timestamp", { ascending: true });

  if (error) {
    console.error("Error fetching conversations:", error);
    throw error;
  }

  return (data || []).map((row) => ({
    message: row.message,
    response: row.response,
    user_id: row.wallet_address,
  }));
}

//
// Users
//
export async function getUser(
  wallet_address: string
): Promise<User | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("wallet_address", wallet_address)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116: no rows returned for .single()
    console.error("Error fetching user:", error);
    throw error;
  }
  return data ?? null;
}

export async function createUser(
  wallet_address: string
): Promise<void> {
  const { error } = await supabase
    .from("users")
    .insert([{ wallet_address }]);
  if (error) {
    console.error("Error creating user:", error);
    throw error;
  }
}

export async function setViewingKeys(
  wallet_address: string,
  sscrt_key: string,
  susdc_key: string
): Promise<void> {
  const user = await getUser(wallet_address);
  if (!user) {
    throw new Error("User not found");
  }

  const { error } = await supabase
    .from("users")
    .update({ sscrt_key, susdc_key })
    .eq("wallet_address", wallet_address);
  if (error) {
    console.error("Error updating viewing keys:", error);
    throw error;
  }
}

export async function checkAllowedToSpend(
  wallet_address: string
): Promise<boolean> {
  const user = await getUser(wallet_address);
  if (!user) {
    throw new Error("User not found");
  }
  const isAllowedSscrt = user.allowed_to_spend_sscrt === "true";
  const isAllowedSusdc = user.allowed_to_spend_susdc === "true";
  return isAllowedSscrt && isAllowedSusdc;
}

export async function setAllowedToSpend(
  wallet_address: string
): Promise<void> {
  const user = await getUser(wallet_address);
  if (!user) {
    throw new Error("User not found");
  }

  // If already allowed, do nothing
  if (
    user.allowed_to_spend_sscrt === "true" &&
    user.allowed_to_spend_susdc === "true"
  ) {
    return;
  }

  const { error } = await supabase
    .from("users")
    .update({
      allowed_to_spend_sscrt: "true",
      allowed_to_spend_susdc: "true",
    })
    .eq("wallet_address", wallet_address);

  if (error) {
    console.error("Error setting allowed_to_spend flags:", error);
    throw error;
  }
}

//
// Trading State
//
export async function checkConvinced(
  wallet_address: string
): Promise<number> {
  const { data, error } = await supabase
    .from("trading_state")
    .select("convinced")
    .eq("wallet_address", wallet_address)
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("Error fetching trading_state:", error);
    throw error;
  }
  return data?.convinced ?? 0;
}

export async function updateConvinced(
  wallet_address: string
): Promise<void> {
  // Upsert: If row exists, update convinced=1; otherwise insert new row.
  const { error } = await supabase
    .from("trading_state")
    .upsert(
      [{ wallet_address, convinced: 1 }],
      { onConflict: "wallet_address" }
    );
  if (error) {
    console.error("Error upserting trading_state:", error);
    throw error;
  }
}
