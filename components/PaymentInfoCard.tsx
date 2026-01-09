import { Gift, Loader2 } from 'lucide-react';

interface PaymentInfoCardProps {
  effectivePrice: number;
  galleryCount: number;
  hasCredit: boolean;
  checkingPayments: boolean;
  name: string;
  creating: boolean;
  selectedNftsCount: number;
  onCreateGallery: () => void;
}

export function PaymentInfoCard({
  effectivePrice,
  galleryCount,
  hasCredit,
  checkingPayments,
  name,
  creating,
  selectedNftsCount,
  onCreateGallery,
}: PaymentInfoCardProps) {
  return (
    <div className="max-w-md mx-auto">
      {effectivePrice === 0 && galleryCount === 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 rounded-lg text-green-700">
          <Gift size={18} />
          <span className="text-sm">
            Your first gallery is free to create!
          </span>
        </div>
      )}
      {hasCredit && galleryCount > 0 && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-green-50 rounded-lg text-green-700">
          <Gift size={18} />
          <span className="text-sm">
            You have credit from a previous payment - this gallery is free!
          </span>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <span className="text-neutral-600">Cost</span>
        <div className="text-right">
          {checkingPayments ? (
            <span className="text-neutral-400 text-sm">Checking payments...</span>
          ) : effectivePrice === 0 ? (
            <span className="font-medium text-green-600">Free</span>
          ) : (
            <span className="font-medium">{effectivePrice} STARS</span>
          )}
        </div>
      </div>
      <button
        onClick={onCreateGallery}
        disabled={!name.trim() || creating || checkingPayments || selectedNftsCount === 0}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {creating ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Creating...
          </>
        ) : checkingPayments ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Checking payments...
          </>
        ) : (
          <>
            Create Gallery
            {effectivePrice === 0 ? (
              <span className="text-green-400">- Free!</span>
            ) : (
              <span className="text-neutral-400">({effectivePrice} STARS)</span>
            )}
          </>
        )}
      </button>
      {!name.trim() && (
        <p className="text-center text-amber-600 text-sm mt-2">
          Please add a gallery name in the Customize tab
        </p>
      )}
    </div>
  );
}
