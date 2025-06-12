import { fromBase64, toBase64 } from "@cosmjs/encoding";

export interface LoginResult {
  data: {
    user: User;
    token: string;
    walletAddress: string;
    expiresIn: string;
  };
}

export interface DecodedJWT {
  sub: string;
  iat: number;
  exp: number;
}


// Get the backend URL from the environment variable.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

/**
 * Connects to Keplr wallet and returns the wallet address
 */
export async function connectKeplr(): Promise<string> {
  if (!window.keplr) {
    throw new Error("Keplr wallet not found. Please install Keplr extension.");
  }

  const chainId = "secret-4"; // Secret Network mainnet
  await window.keplr.enable(chainId);

  const offlineSigner = window.keplr.getOfflineSigner(chainId);
  const accounts = await offlineSigner.getAccounts();

  if (accounts.length === 0) {
    throw new Error("No accounts found in Keplr wallet");
  }

  return accounts[0].address;
}

/**
 * Signs a message using Keplr wallet
 */
export async function signMessage(
  walletAddress: string,
  message: string,
): Promise<string> {
  if (!window.keplr) {
    throw new Error("Keplr wallet not found");
  }

  const chainId = "secret-4";

  // Sign the message using ADR-036 standard
  const signature = await window.keplr.signArbitrary(
    chainId,
    walletAddress,
    message,
  );

  // Return the signature as base64-encoded JSON object
  return btoa(JSON.stringify(signature));
}

/**
 * Logs in with Keplr wallet by signing a challenge message
 */
export async function loginWithKeplr(): Promise<LoginResult> {
  try {
    const walletAddress = await connectKeplr();
    
    // --- CHANGE 1: The user still signs the human-readable message ---
    const timestamp = Date.now();
    const message = `Login to Secret Trading App\nTimestamp: ${timestamp}\nWallet: ${walletAddress}`;
    const signature = await signMessage(walletAddress, message);

    // --- CHANGE 2: The payload sent to the backend is now structured ---
    const response = await fetch(`${API_BASE_URL}/api/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      // We send the raw timestamp integer, not the whole message string.
      body: JSON.stringify({
        walletAddress,
        timestamp, // <-- Send the raw timestamp
        signature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Login failed: ${error}`);
    }

    // The rest of the function is correct
    const loginData = await response.json();
    if (!loginData.data) {
      throw new Error("Login failed: No data returned from server");
    }
    localStorage.setItem("auth_token", loginData.data.token);
    return loginData;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}


/**
 * Gets the stored authentication token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem("auth_token");
}

/**
 * Removes the stored authentication token
 */
export function logout(): void {
  localStorage.removeItem("auth_token");
}

/**
 * Decodes a JWT token (client-side only, doesn't verify signature)
 */
export function decodeJWT(token: string): DecodedJWT {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      throw new Error("Invalid JWT format");
    }

    const payload = parts[1];
    const decoded = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );

    return decoded;
  } catch (error) {
    throw new Error("Failed to decode JWT token");
  }
}

/**
 * Checks if a JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  try {
    const decoded = decodeJWT(token);
    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch {
    return true;
  }
}

/**
 * Gets the wallet address from a stored token
 */
export function getWalletAddressFromToken(): string | null {
  const token = getAuthToken();
  if (!token || isTokenExpired(token)) {
    return null;
  }

  try {
    const decoded = decodeJWT(token);
    return decoded.sub;
  } catch {
    return null;
  }
}

/**
 * Creates authorization header for API requests
 */
export function getAuthHeaders(): Record<string, string> {
  const token = getAuthToken();
  if (!token) {
    throw new Error("No authentication token found");
  }

  if (isTokenExpired(token)) {
    logout();
    throw new Error("Authentication token expired");
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}
