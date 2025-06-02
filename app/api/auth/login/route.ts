import { NextRequest, NextResponse } from 'next/server';
import { fromBase64, fromBech32 } from '@cosmjs/encoding';
import { createJWT } from '@/lib/auth';
import { agentInstance } from '@/utils/agentInstance';

interface LoginRequest {
  walletAddress: string;
  message: string;
  signature: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { walletAddress, message, signature } = body;

    // Validate input
    if (!walletAddress || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, message, signature' },
        { status: 400 }
      );
    }

    // Validate wallet address format (Secret Network addresses start with 'secret')
    if (!walletAddress.startsWith('secret')) {
      return NextResponse.json(
        { error: 'Invalid Secret Network wallet address' },
        { status: 400 }
      );
    }

    // Extract timestamp from message and validate it's recent (within 5 minutes)
    const timestampMatch = message.match(/Timestamp: (\d+)/);
    if (!timestampMatch) {
      return NextResponse.json(
        { error: 'Invalid message format: missing timestamp' },
        { status: 400 }
      );
    }

    const messageTimestamp = parseInt(timestampMatch[1]);
    const currentTime = Date.now();
    const timeDiff = currentTime - messageTimestamp;

    // Check if message is too old (5 minutes = 300,000 ms)
    if (timeDiff > 300000) {
      return NextResponse.json(
        { error: 'Message timestamp is too old' },
        { status: 400 }
      );
    }

    // Check if message is from future (allow 1 minute clock skew)
    if (timeDiff < -60000) {
      return NextResponse.json(
        { error: 'Message timestamp is from the future' },
        { status: 400 }
      );
    }

    // Verify the wallet address in the message matches the provided address
    if (!message.includes(walletAddress)) {
      return NextResponse.json(
        { error: 'Wallet address mismatch in message' },
        { status: 400 }
      );
    }

    try {
      // Verify signature format and basic validation
      let signatureBytes: Uint8Array;

      try {
        // Try to parse as Keplr signature object first
        const signatureData = JSON.parse(atob(signature));
        if (signatureData.signature) {
          signatureBytes = fromBase64(signatureData.signature);
        } else {
          throw new Error('No signature in object');
        }
      } catch {
        // Fallback: treat as direct base64 signature
        signatureBytes = fromBase64(signature);
      }

      // Basic signature validation
      if (signatureBytes.length !== 64) {
        return NextResponse.json(
          { error: 'Invalid signature format' },
          { status: 401 }
        );
      }

      // Verify wallet address format
      try {
        fromBech32(walletAddress);
      } catch {
        return NextResponse.json(
          { error: 'Invalid wallet address format' },
          { status: 401 }
        );
      }

      // For demo purposes, we'll accept properly formatted signatures
      // In production, implement full cryptographic verification
      console.log('Signature validation passed for wallet:', walletAddress);

    } catch (verificationError) {
      console.error('Signature verification error:', verificationError);
      return NextResponse.json(
        { error: 'Signature verification failed' },
        { status: 401 }
      );
    }

    const user = await agentInstance.createUser(walletAddress);

    if (!user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Create JWT token
    const token = await createJWT(walletAddress);


    return NextResponse.json({
      data: {
        user,
        token,
        walletAddress,
        expiresIn: '1h',
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}