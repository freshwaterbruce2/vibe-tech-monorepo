import { useState } from 'react';
import { AvatarImage } from '@vibetech/avatars';
import { VibeTechLogo } from '../ui/icons/VibeTechLogo';
import { ONBOARDING_AVATARS, ONBOARDING_BRAND } from './onboardingVisuals';

export interface OnboardingResult {
  userType: 'kid' | 'parent';
  avatar: string;
}

interface FirstRunOnboardingProps {
  onComplete: (data: OnboardingResult) => void | Promise<void>;
}

const WELCOME_TOKENS = 25;

const FirstRunOnboarding = ({ onComplete }: FirstRunOnboardingProps) => {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [userType, setUserType] = useState<'kid' | 'parent' | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const selectedAvatar = ONBOARDING_AVATARS.find((option) => option.id === avatar);

  const handleFinish = async () => {
    if (!userType || !avatar || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onComplete({ userType, avatar });
    } catch {
      setSubmitError('We could not finish setup. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-[var(--background-main)]">
      <div className="w-full max-w-md glass-card rounded-2xl p-8 border border-[var(--glass-border)] space-y-6">
        <div className="space-y-2">
          <p className="text-center text-sm text-[var(--text-secondary)]" aria-live="polite">
            Step {step + 1} of 3
          </p>
          <div className="flex justify-center gap-2" aria-label="Onboarding progress">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                aria-hidden="true"
                className={`h-2 w-8 rounded-full transition-colors ${
                  i <= step ? 'bg-[var(--primary-accent)]' : 'bg-[var(--glass-border)]'
                }`}
              />
            ))}
          </div>
        </div>

        {step === 0 && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-violet-500/30 to-sky-500/30 blur-xl" />
                <div className="relative flex items-center justify-center rounded-3xl border border-[var(--glass-border)] bg-white/5 p-4">
                  <VibeTechLogo className="w-20 h-20" aria-label="Vibe-Tech" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold neon-text-primary">Welcome to {ONBOARDING_BRAND.title}</h1>
            <p className="text-sm text-[var(--text-secondary)]">{ONBOARDING_BRAND.subtitle}</p>
            <p className="text-[var(--text-secondary)]">Who&apos;s using this app?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setUserType('kid');
                  setStep(1);
                }}
                className="glass-card p-6 rounded-xl hover:scale-105 transition-transform border-2 border-transparent hover:border-[var(--primary-accent)] focus-glow"
              >
                <div className="font-semibold">I&apos;m the kid</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setUserType('parent');
                  setStep(1);
                }}
                className="glass-card p-6 rounded-xl hover:scale-105 transition-transform border-2 border-transparent hover:border-[var(--primary-accent)] focus-glow"
              >
                <div className="font-semibold">I&apos;m the parent</div>
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 text-center">
            <h1 className="text-2xl font-bold neon-text-primary">Pick your avatar</h1>
            <p className="text-[var(--text-secondary)]">
              {userType === 'kid' ? 'This will be you!' : 'Pick one for your kid.'}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {ONBOARDING_AVATARS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    setAvatar(option.id);
                  }}
                  className={`glass-card rounded-xl p-3 transition-transform border-2 focus-glow hover:scale-[1.03] ${
                    avatar === option.id
                      ? 'border-[var(--primary-accent)]'
                      : 'border-transparent'
                  }`}
                  aria-label={`Choose avatar ${option.name}`}
                >
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <div
                      className={`w-full aspect-square rounded-xl bg-gradient-to-br ${option.gradientClass} p-[2px]`}
                    >
                      <div className="h-full w-full rounded-[10px] bg-[var(--background-card)]/90 flex items-center justify-center overflow-hidden">
                        <AvatarImage
                          src={option.imagePath}
                          alt={option.name}
                          size={96}
                          className="h-full w-full"
                          style={{ borderRadius: '10px' }}
                        />
                      </div>
                    </div>
                    <div className="leading-tight">
                      <p className="text-xs font-semibold text-[var(--text-primary)]">{option.name}</p>
                      <p className="text-[10px] text-[var(--text-secondary)]">{option.subtitle}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(0)}
                className="glass-card flex-1 py-3 rounded-xl font-semibold text-[var(--text-primary)] transition-transform hover:scale-[1.02] focus-glow"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={!avatar}
                className="glass-button flex-1 py-3 rounded-xl font-semibold text-white transition-transform hover:scale-[1.02] focus-glow disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 text-center">
            <div className="flex justify-center">
              {selectedAvatar ? (
                <AvatarImage
                  src={selectedAvatar.imagePath}
                  alt={selectedAvatar.name}
                  size={112}
                  className="rounded-2xl border border-[var(--glass-border)] shadow-[0_0_24px_rgba(56,189,248,0.25)]"
                  style={{ borderRadius: '16px' }}
                />
              ) : (
                <span className="text-6xl" aria-hidden="true">🎉</span>
              )}
            </div>
            <h1 className="text-3xl font-bold neon-text-primary">You&apos;re all set!</h1>
            <p className="text-[var(--text-secondary)]">
              Here&apos;s{' '}
              <span className="font-bold neon-text-secondary">{WELCOME_TOKENS} tokens</span> to get
              started. Finish homework to earn more.
            </p>
            {submitError && (
              <p role="alert" className="text-sm text-[var(--error-accent,#f87171)]">
                {submitError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
                className="glass-card flex-1 py-4 rounded-xl font-semibold text-[var(--text-primary)] transition-transform hover:scale-[1.02] focus-glow disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleFinish();
                }}
                disabled={isSubmitting}
                className="glass-button flex-1 py-4 rounded-xl font-semibold text-white hover:scale-105 transition-transform text-lg focus-glow disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
              >
                {isSubmitting ? 'Saving...' : 'Start Earning'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FirstRunOnboarding;
export { WELCOME_TOKENS };
