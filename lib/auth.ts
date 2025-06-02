import { jwtVerify, SignJWT } from 'jose';
import { NextRequest } from 'next/server';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback-secret-key');

export interface JWTPayload {
  sub: string; // wallet address
  iat: number;
  exp: number;
}

/**
 * Creates a JWT token for a wallet address
 */
export async function createJWT(walletAddress: string): Promise<string> {
  const jwt = await new SignJWT({ sub: walletAddress })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(JWT_SECRET);
  
  return jwt;
}

/**
 * Verifies a JWT token and returns the payload
 */
export async function verifyJWT(token: string): Promise<JWTPayload> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
}

/**
 * Extracts and verifies JWT from Authorization header
 */
export async function verifyAuthHeader(request: NextRequest): Promise<JWTPayload> {
  const authorization = request.headers.get('authorization');
  
  if (!authorization) {
    throw new Error('Missing authorization header');
  }
  
  if (!authorization.startsWith('Bearer ')) {
    throw new Error('Invalid authorization format');
  }
  
  const token = authorization.substring(7); // Remove 'Bearer ' prefix
  return await verifyJWT(token);
}

/**
 * Middleware helper to verify JWT and extract wallet address
 */
export async function getWalletFromRequest(request: NextRequest): Promise<string> {
  const payload = await verifyAuthHeader(request);
  return payload.sub;
}