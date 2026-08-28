import { AvatarShopUnified } from './AvatarShopUnified';

interface AvatarShopProps {
  userTokens: number;
  onSpendTokens: (amount: number, reason: string) => void;
}

export default function AvatarShop({ userTokens, onSpendTokens }: AvatarShopProps) {
  return (
    <AvatarShopUnified
      userTokens={userTokens}
      onSpendTokens={(amount, reason) => {
        onSpendTokens(amount, reason ?? 'Bought avatar item');
        return true;
      }}
    />
  );
}
