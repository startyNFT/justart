/**
 * Wallet signature utilities for verifying user actions
 * Uses Cosmos SDK signature verification to ensure authenticity
 */

import { verifyADR36Amino } from '@cosmjs/amino'
import { fromBech32 } from '@cosmjs/encoding'

/**
 * Message template for signing
 * Includes action, timestamp, and optional data
 */
export interface SignatureMessage {
  action: 'like_gallery' | 'unlike_gallery' | 'rate_nft'
  timestamp: number
  data: {
    gallery_id?: string
    nft_contract?: string
    nft_token_id?: string
    rating?: number
  }
}

/**
 * Create a message string to be signed by the wallet
 */
export function createSignatureMessage(message: SignatureMessage): string {
  return JSON.stringify(message, null, 2)
}

/**
 * Verify a signature against a message and wallet address
 * Returns true if signature is valid, false otherwise
 */
export function verifySignature(
  message: string,
  signature: string,
  walletAddress: string
): boolean {
  try {
    // Decode the wallet address to get public key format
    const { prefix } = fromBech32(walletAddress)

    // Verify signature must be in stars format
    if (prefix !== 'stars') {
      console.error('Invalid wallet address prefix, expected "stars"')
      return false
    }

    // Parse signature as base64
    const signatureBytes = Buffer.from(signature, 'base64')

    // Verify using ADR-036 standard (Cosmos SDK)
    const isValid = verifyADR36Amino(
      prefix,
      walletAddress,
      message,
      signatureBytes,
      'secp256k1'
    )

    return isValid
  } catch (error) {
    console.error('Signature verification error:', error)
    return false
  }
}

/**
 * Check if a message timestamp is recent (within 5 minutes)
 * Prevents replay attacks with old signatures
 */
export function isTimestampRecent(timestamp: number, maxAgeMs: number = 5 * 60 * 1000): boolean {
  const now = Date.now()
  const age = now - timestamp

  return age >= 0 && age <= maxAgeMs
}

/**
 * Validate a signed message for a gallery action
 * Checks signature validity, timestamp freshness, and action match
 */
export interface ValidationResult {
  valid: boolean
  error?: string
}

export function validateSignedAction(
  messageStr: string,
  signature: string,
  walletAddress: string,
  expectedAction: SignatureMessage['action'],
  expectedGalleryId?: string
): ValidationResult {
  try {
    // Parse message
    const message: SignatureMessage = JSON.parse(messageStr)

    // Check timestamp is recent (within 5 minutes)
    if (!isTimestampRecent(message.timestamp)) {
      return {
        valid: false,
        error: 'Signature expired. Please try again.',
      }
    }

    // Check action matches
    if (message.action !== expectedAction) {
      return {
        valid: false,
        error: 'Invalid action in signature',
      }
    }

    // Check gallery ID matches if provided
    if (expectedGalleryId && message.data.gallery_id !== expectedGalleryId) {
      return {
        valid: false,
        error: 'Gallery ID mismatch',
      }
    }

    // Verify signature
    const isValidSignature = verifySignature(messageStr, signature, walletAddress)

    if (!isValidSignature) {
      return {
        valid: false,
        error: 'Invalid signature',
      }
    }

    return { valid: true }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Validation failed',
    }
  }
}
