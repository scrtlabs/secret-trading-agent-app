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
    // Connect to wallet
    const walletAddress = await connectKeplr();

    // Create a challenge message with timestamp to prevent replay attacks
    const timestamp = Date.now();
    const message = `Login to Secret Trading App\nTimestamp: ${timestamp}\nWallet: ${walletAddress}`;

    // Sign the message
    const signature = await signMessage(walletAddress, message);

    // Send to backend for verification
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        walletAddress,
        message,
        signature,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Login failed: ${error}`);
    }

    const { data } = await response.json();

    if (!data) {
      throw new Error("Login failed: No data returned");
    }

    // Store token in localStorage
    localStorage.setItem("auth_token", data.token);

    return {
      data,
    };
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
