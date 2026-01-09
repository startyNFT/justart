'use client'

import { useChain } from '@cosmos-kit/react'
import { useCallback } from 'react'
import { createSignatureMessage, type SignatureMessage } from '@/lib/signature'

/**
 * Hook to sign messages with connected wallet
 * Uses Cosmos Kit to access wallet signing capabilities
 */
export function useWalletSignature() {
  const { address, getOfflineSignerAmino, isWalletConnected } = useChain('stargaze')

  /**
   * Sign a message with the connected wallet
   * Returns base64-encoded signature
   */
  const signMessage = useCallback(
    async (message: SignatureMessage): Promise<{ message: string; signature: string } | null> => {
      if (!address || !isWalletConnected) {
        console.error('Wallet not connected')
        return null
      }

      try {
        const signer = await getOfflineSignerAmino()

        // Create message string
        const messageStr = createSignatureMessage(message)

        // Sign using ADR-036 standard
        const signDoc = {
          chain_id: '',
          account_number: '0',
          sequence: '0',
          fee: {
            gas: '0',
            amount: [],
          },
          msgs: [],
          memo: messageStr,
        }

        const { signature } = await signer.signAmino(address, signDoc)

        // Return message and base64-encoded signature
        return {
          message: messageStr,
          signature: Buffer.from(signature.signature, 'base64').toString('base64'),
        }
      } catch (error) {
        console.error('Error signing message:', error)
        return null
      }
    },
    [address, isWalletConnected, getOfflineSignerAmino]
  )

  /**
   * Sign a like action for a gallery
   */
  const signLikeAction = useCallback(
    async (galleryId: string, action: 'like_gallery' | 'unlike_gallery') => {
      const message: SignatureMessage = {
        action,
        timestamp: Date.now(),
        data: {
          gallery_id: galleryId,
        },
      }

      return signMessage(message)
    },
    [signMessage]
  )

  /**
   * Sign a rating action for an NFT
   */
  const signRatingAction = useCallback(
    async (galleryId: string, nftContract: string, nftTokenId: string, rating: number) => {
      const message: SignatureMessage = {
        action: 'rate_nft',
        timestamp: Date.now(),
        data: {
          gallery_id: galleryId,
          nft_contract: nftContract,
          nft_token_id: nftTokenId,
          rating,
        },
      }

      return signMessage(message)
    },
    [signMessage]
  )

  return {
    signMessage,
    signLikeAction,
    signRatingAction,
    isReady: isWalletConnected && !!address,
  }
}
