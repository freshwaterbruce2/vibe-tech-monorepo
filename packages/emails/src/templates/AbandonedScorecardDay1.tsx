import {
  AbandonedScorecardEmail,
  type AbandonedScorecardEmailProps,
} from './AbandonedScorecardShared.js';

export type AbandonedScorecardDay1Props = AbandonedScorecardEmailProps;

const AbandonedScorecardDay1 = (props: AbandonedScorecardDay1Props) => {
  return (
    <AbandonedScorecardEmail
      {...props}
      copy={{
        heading: 'Your scorecard found the gaps. The Pro Rewrite fixes them.',
        eyebrow: 'Abandoned scorecard day 1',
        body: 'You checked {scoreLabel}, but the highest-leverage next step is turning those notes into better copy. Pro Rewrite converts the scorecard findings into a sharper page rewrite.',
        proof:
          'Your free scorecard shows what is holding the page back. The Pro Rewrite gives you conversion-ready copy you can ship.',
        cta: 'Start my Pro Rewrite',
      }}
    />
  );
};

export default AbandonedScorecardDay1;
