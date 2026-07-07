import {
  BrainGymHub as SharedBrainGymHub,
  GamesHostBridgeProvider,
  type GamesHostBridge,
} from '@vibetech/games/tutor';
import { useMemo, type ComponentProps } from 'react';
import AvatarProfile from '../avatar/AvatarProfile';
import { AvatarShopUnified } from '../avatar/AvatarShopUnified';
import { appStore } from '../../utils/electronStore';

type BrainGymHubProps = ComponentProps<typeof SharedBrainGymHub> & {
  userName?: string;
  onUserNameSaved?: (name: string) => void;
};

export default function BrainGymHub(props: BrainGymHubProps) {
  const { onEarnTokens, onGameCompleted, userName, onUserNameSaved, ...hubProps } = props;
  const bridge = useMemo<GamesHostBridge>(
    () => ({
      loadConfig: <T,>(key: string) => appStore.get<T>(key) ?? undefined,
      onComplete: (result) => {
        onGameCompleted?.(result.gameId, result.score, {
          source: 'brain-gym',
          stars: result.stars,
          subject: result.subject,
          timeSpent: result.timeSpent,
          tokensEarned: result.tokensEarned,
        });
      },
      onEarnTokens,
      saveConfig: (key: string, value: unknown) => appStore.set(key, value),
    }),
    [onEarnTokens, onGameCompleted],
  );

  return (
    <GamesHostBridgeProvider bridge={bridge}>
      <SharedBrainGymHub
        {...hubProps}
        onEarnTokens={onEarnTokens}
        onGameCompleted={onGameCompleted}
        renderAvatarProfile={({ onOpenShop }) => (
          <AvatarProfile
            onOpenShop={onOpenShop}
            userName={userName}
            onUserNameSaved={onUserNameSaved}
          />
        )}
        renderAvatarShop={({ userTokens, onSpendTokens }) => (
          <AvatarShopUnified userTokens={userTokens} onSpendTokens={onSpendTokens} />
        )}
      />
    </GamesHostBridgeProvider>
  );
}
