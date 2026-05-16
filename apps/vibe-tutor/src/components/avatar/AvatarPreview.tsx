import { AvatarImage } from '@vibetech/avatars';
import type { AvatarState, ShopItem } from '@vibetech/avatars';

interface AvatarPreviewProps {
  avatarState: AvatarState;
  allItems: ShopItem[];
  size?: number;
  className?: string;
}

export function AvatarPreview({ avatarState, allItems, size = 120, className = '' }: AvatarPreviewProps) {
  const findItem = (id: string | undefined) => (id ? allItems.find((i) => i.id === id) : undefined);

  const bgItem = findItem(avatarState.equippedItems.background);
  const frameItem = findItem(avatarState.equippedItems.frame);
  const hatItem = findItem(avatarState.equippedItems.hat);
  const badgeItem = findItem(avatarState.equippedItems.badge);

  const avatarSrc =
    avatarState.selectedAvatarId
      ? (allItems.find((i) => i.id === avatarState.selectedAvatarId)?.imageUrl ??
         '/avatars/avatar-boy-headphones.png')
      : '/avatars/avatar-boy-headphones.png';

  return (
    <div
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      {/* Layer 0: Background gradient */}
      <div
        className={`absolute inset-0 ${bgItem?.twClasses ?? 'bg-gradient-to-br from-slate-800 to-slate-900'}`}
      />

      {/* Layer 1: Avatar image */}
      <div className="absolute inset-0 flex items-center justify-center">
        <AvatarImage src={avatarSrc} alt="Avatar" size={Math.round(size * 0.85)} />
      </div>

      {/* Layer 2: Frame ring overlay */}
      {frameItem?.twClasses && (
        <div className={`absolute inset-0 rounded-2xl pointer-events-none ${frameItem.twClasses}`} />
      )}

      {/* Layer 3: Hat emoji above avatar */}
      {hatItem && (
        <div
          className="absolute left-1/2 z-20 pointer-events-none leading-none"
          style={{ top: 0, transform: 'translate(-50%, -33%)', fontSize: Math.round(size * 0.22) }}
        >
          {hatItem.imageUrl}
        </div>
      )}

      {/* Layer 4: Badge emoji bottom-right */}
      {badgeItem?.badgeEmoji && (
        <div
          className="absolute bottom-1 right-1 z-20 pointer-events-none leading-none"
          style={{ fontSize: Math.round(size * 0.2) }}
        >
          {badgeItem.badgeEmoji}
        </div>
      )}
    </div>
  );
}
