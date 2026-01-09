# Wallet Signature Verification

This document explains how to implement and use wallet signature verification for user actions like likes and ratings.

## Overview

Wallet signature verification ensures that user actions (likes, ratings) are authentic and cannot be forged. It prevents:
- Fake likes from bots or scripts
- Gaming the system by spoofing wallet addresses
- Replay attacks with old signatures

## How It Works

1. **Client Side**: User action triggers wallet to sign a message
2. **Message**: Contains action type, timestamp, and data
3. **Signature**: Wallet creates cryptographic signature
4. **Server Side**: API verifies signature before processing action
5. **Timestamp Check**: Ensures signature is recent (< 5 minutes old)

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │         │   Wallet     │         │   Server    │
│             │         │   (Keplr)    │         │   API       │
└──────┬──────┘         └──────┬───────┘         └──────┬──────┘
       │                       │                        │
       │ 1. Click "Like"       │                        │
       ├──────────────────────>│                        │
       │                       │                        │
       │ 2. Sign message       │                        │
       │<──────────────────────┤                        │
       │                       │                        │
       │ 3. POST /api/likes    │                        │
       │    (message + sig)    │                        │
       ├───────────────────────┼───────────────────────>│
       │                       │                        │
       │                       │   4. Verify signature  │
       │                       │        & timestamp     │
       │                       │                        │
       │ 5. Success response   │                        │
       │<───────────────────────┼────────────────────────┤
```

## Implementation

### 1. Client Side - Sign Message

```tsx
import { useWalletSignature } from '@/hooks/useWalletSignature'

function LikeButton({ galleryId }: { galleryId: string }) {
  const { signLikeAction, isReady } = useWalletSignature()
  const [loading, setLoading] = useState(false)

  const handleLike = async () => {
    if (!isReady) return

    setLoading(true)

    try {
      // Sign the action
      const signed = await signLikeAction(galleryId, 'like_gallery')

      if (!signed) {
        throw new Error('Failed to sign message')
      }

      // Send to API
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gallery_id: galleryId,
          wallet_address: address,
          message: signed.message,
          signature: signed.signature,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to like')
      }

      const data = await response.json()
      console.log('Liked! New count:', data.likes_count)
    } catch (error) {
      console.error('Error liking:', error)
      alert(error instanceof Error ? error.message : 'Failed to like')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button onClick={handleLike} disabled={!isReady || loading}>
      {loading ? 'Signing...' : 'Like'}
    </button>
  )
}
```

### 2. Server Side - Verify Signature

```ts
import { validateSignedAction } from '@/lib/signature'

export async function POST(request: NextRequest) {
  const { gallery_id, wallet_address, message, signature } = await request.json()

  // Verify signature
  const validation = validateSignedAction(
    message,
    signature,
    wallet_address,
    'like_gallery',
    gallery_id
  )

  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 401 }
    )
  }

  // Process action (signature is valid)
  // ...
}
```

## Message Format

Messages follow a structured format:

```json
{
  "action": "like_gallery",
  "timestamp": 1704734400000,
  "data": {
    "gallery_id": "gallery-uuid-here"
  }
}
```

### Supported Actions

- `like_gallery` - Add a like to a gallery
- `unlike_gallery` - Remove a like from a gallery
- `rate_nft` - Rate an NFT (includes nft_contract, nft_token_id, rating)

## Security Features

### 1. Timestamp Validation

Messages expire after 5 minutes to prevent replay attacks:

```ts
// Signature created at 10:00 AM
// Valid until 10:05 AM
// After 10:05 AM, signature is rejected

if (!isTimestampRecent(message.timestamp, 5 * 60 * 1000)) {
  return { valid: false, error: 'Signature expired' }
}
```

### 2. Action Matching

Server validates that the action in the message matches the expected action:

```ts
// User signed "like_gallery" but endpoint expects "unlike_gallery"
if (message.action !== expectedAction) {
  return { valid: false, error: 'Invalid action' }
}
```

### 3. Data Validation

Server checks that data in the message matches request parameters:

```ts
// Gallery ID in signature must match gallery ID in request
if (message.data.gallery_id !== expectedGalleryId) {
  return { valid: false, error: 'Gallery ID mismatch' }
}
```

### 4. Cryptographic Verification

Uses Cosmos SDK's ADR-036 standard for signature verification:

```ts
import { verifyADR36Amino } from '@cosmjs/amino'

const isValid = verifyADR36Amino(
  'stars',
  walletAddress,
  message,
  signatureBytes,
  'secp256k1'
)
```

## API Endpoints

### POST /api/likes

Add a like with signature verification.

**Request:**
```json
{
  "gallery_id": "uuid",
  "wallet_address": "stars1...",
  "message": "{\n  \"action\": \"like_gallery\",\n  ...\n}",
  "signature": "base64-signature"
}
```

**Response (Success):**
```json
{
  "success": true,
  "likes_count": 42
}
```

**Response (Error):**
```json
{
  "error": "Invalid signature"
}
```

### DELETE /api/likes

Remove a like with signature verification.

Same format as POST, but action must be `unlike_gallery`.

## Rate Limiting

Both endpoints are rate limited to 30 requests per minute per client to prevent abuse.

## Testing

Test the signature verification:

```ts
import { verifySignature, createSignatureMessage } from '@/lib/signature'

const message = createSignatureMessage({
  action: 'like_gallery',
  timestamp: Date.now(),
  data: { gallery_id: 'test-id' },
})

// In real app, signature comes from wallet
const signature = 'base64-encoded-signature'
const walletAddress = 'stars1...'

const isValid = verifySignature(message, signature, walletAddress)
console.log('Signature valid:', isValid)
```

## Migration Path

### Current Implementation (Without Signatures)

```tsx
// Old way - NO signature verification
await supabase.from('likes').insert({
  gallery_id,
  wallet_address,
})
```

### New Implementation (With Signatures)

```tsx
// New way - WITH signature verification
const signed = await signLikeAction(galleryId, 'like_gallery')

await fetch('/api/likes', {
  method: 'POST',
  body: JSON.stringify({
    gallery_id,
    wallet_address,
    message: signed.message,
    signature: signed.signature,
  }),
})
```

## Benefits

1. **Prevents Fake Likes**: Can't insert likes without wallet signature
2. **Replay Protection**: Old signatures expire after 5 minutes
3. **Audit Trail**: Each action has cryptographic proof
4. **User Trust**: Users know their wallet is authorizing actions
5. **Compliance**: Meet security standards for blockchain apps

## Future Enhancements

- Add signature verification for NFT ratings
- Store signatures in database for audit log
- Add signature verification for gallery creation
- Implement signature verification for profile updates

## Troubleshooting

### "Failed to sign message"
- Check that wallet is connected
- Ensure user approved the signing request in wallet

### "Invalid signature"
- Verify wallet address matches
- Check that message hasn't been modified
- Ensure timestamp is recent

### "Signature expired"
- User took too long (> 5 minutes)
- System clock may be incorrect
- Re-sign the message

## References

- [ADR-036: Arbitrary Message Signing](https://docs.cosmos.network/main/architecture/adr-036-arbitrary-signature)
- [CosmJS Documentation](https://cosmos.github.io/cosmjs/)
- [Cosmos Kit](https://docs.cosmoskit.com/)
