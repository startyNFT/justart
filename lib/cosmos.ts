import { STARGAZE_RPC, TREASURY_WALLET, GALLERY_PRICE_INCREMENT } from './constants';

// Memo prefix for pureart gallery payments
export const PUREART_MEMO_PREFIX = 'pureart-gallery';

type TransferEvent = {
  sender: string;
  recipient: string;
  amount: string; // e.g. "1000000000ustars"
};

// Parse transfer events from transaction log
function parseTransferEvents(log: string): TransferEvent[] {
  try {
    const parsed = JSON.parse(log);
    const events: TransferEvent[] = [];

    for (const entry of parsed) {
      const transferEvents = entry.events?.filter((e: { type: string }) => e.type === 'transfer') || [];

      for (const event of transferEvents) {
        const attrs = event.attributes || [];
        const sender = attrs.find((a: { key: string }) => a.key === 'sender')?.value;
        const recipient = attrs.find((a: { key: string }) => a.key === 'recipient')?.value;
        const amount = attrs.find((a: { key: string }) => a.key === 'amount')?.value;

        if (sender && recipient && amount) {
          events.push({ sender, recipient, amount });
        }
      }
    }

    return events;
  } catch {
    return [];
  }
}

// Parse ustars amount to STARS (1 STARS = 1,000,000 ustars)
function parseStarsAmount(amount: string): number {
  const match = amount.match(/^(\d+)ustars$/);
  if (match) {
    return parseInt(match[1], 10) / 1_000_000;
  }
  return 0;
}

export type PaymentInfo = {
  totalPaid: number; // Total STARS paid to treasury
  txHashes: string[]; // Transaction hashes of payments
  paidSlots: number; // Number of gallery slots paid for (based on cumulative pricing)
};

// Calculate how many gallery slots a total payment covers
// Pricing: 1st free, 2nd = 1000, 3rd = 2000, etc.
// So cumulative: 0, 1000, 3000, 6000, 10000...
function calculatePaidSlots(totalPaid: number): number {
  let slots = 1; // First gallery is always free
  let cumulative = 0;

  while (true) {
    const nextPrice = slots * GALLERY_PRICE_INCREMENT;
    if (cumulative + nextPrice > totalPaid) {
      break;
    }
    cumulative += nextPrice;
    slots++;
  }

  return slots;
}

// Fetch all payments from a user wallet to the treasury
export async function fetchPaymentsToTreasury(userWallet: string): Promise<PaymentInfo> {
  try {
    // Query transactions where treasury received funds
    // We'll then filter by sender = userWallet
    const query = encodeURIComponent(`transfer.recipient='${TREASURY_WALLET}'`);
    const response = await fetch(
      `${STARGAZE_RPC}/tx_search?query="${query}"&per_page=100&order_by="desc"`
    );

    if (!response.ok) {
      console.error('Failed to fetch transactions:', response.status);
      return { totalPaid: 0, txHashes: [], paidSlots: 1 };
    }

    const data = await response.json();
    const txs = data.result?.txs || [];

    let totalPaid = 0;
    const txHashes: string[] = [];

    for (const tx of txs) {
      const log = tx.tx_result?.log || '';
      const transfers = parseTransferEvents(log);

      // Check if this user sent STARS to treasury
      for (const transfer of transfers) {
        if (
          transfer.sender === userWallet &&
          transfer.recipient === TREASURY_WALLET
        ) {
          const amount = parseStarsAmount(transfer.amount);
          if (amount >= GALLERY_PRICE_INCREMENT) {
            // Only count payments that are at least 1000 STARS (gallery payment size)
            totalPaid += amount;
            if (!txHashes.includes(tx.hash)) {
              txHashes.push(tx.hash);
            }
          }
        }
      }
    }

    return {
      totalPaid,
      txHashes,
      paidSlots: calculatePaidSlots(totalPaid),
    };
  } catch (error) {
    console.error('Error fetching payments:', error);
    return { totalPaid: 0, txHashes: [], paidSlots: 1 };
  }
}

// Calculate what the user should pay for their next gallery
// considering their past payments
export function calculateEffectivePrice(
  currentGalleryCount: number,
  paidSlots: number
): number {
  // If they have more paid slots than galleries, they've already paid
  if (paidSlots > currentGalleryCount) {
    return 0;
  }

  // Otherwise calculate the normal price for the next gallery
  return currentGalleryCount * GALLERY_PRICE_INCREMENT;
}
