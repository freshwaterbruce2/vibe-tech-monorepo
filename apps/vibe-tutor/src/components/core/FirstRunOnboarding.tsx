import { useState } from 'react';
import { VibeTechLogo } from '../ui/icons/VibeTechLogo';

export interface OnboardingResult {
  userType: 'kid' | 'parent';
  avatar: string;
}

interface FirstRunOnboardingProps {
  onComplete: (data: OnboardingResult) => void | Promise<void>;
}

const AVATARS = ['🐉', '🦊', '🐱', '🦄', '🚀', '🎮'];
const WELCOME_TOKENS = 25;

const FirstRunOnboarding = ({ onComplete }: FirstRunOnboardingProps) => {
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [userType, setUserType] = useState<'kid' | 'parent' | null>(null);
  const [avatar, setAvatar] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
              <VibeTechLogo className="w-24 h-24" aria-label="Vibe-Tech" />
            </div>
            <h1 className="text-3xl font-bold neon-text-primary">Welcome to Vibe-Tutor</h1>
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
            <div className="grid grid-cols-3 gap-3">
              {AVATARS.map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setAvatar(a);
                  }}
                  className={`glass-card p-4 rounded-xl text-5xl hover:scale-110 transition-transform border-2 focus-glow ${
                    avatar === a
                      ? 'border-[var(--primary-accent)]'
                      : 'border-transparent'
                  }`}
                  aria-label={`Choose avatar ${a}`}
                >
                  {a}
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
            <div className="text-6xl" aria-hidden="true">
              {avatar ?? '🎉'}
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
