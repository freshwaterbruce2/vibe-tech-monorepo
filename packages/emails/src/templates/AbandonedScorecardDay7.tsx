import {
  AbandonedScorecardEmail,
  type AbandonedScorecardEmailProps,
} from './AbandonedScorecardShared.js';

export type AbandonedScorecardDay7Props = AbandonedScorecardEmailProps;

const AbandonedScorecardDay7 = (props: AbandonedScorecardDay7Props) => {
  return (
    <AbandonedScorecardEmail
      {...props}
      copy={{
        heading: 'Last reminder: turn the scorecard into better copy.',
        eyebrow: 'Abandoned scorecard day 7',
        body: 'It has been a week since {scoreLabel}. If the page still reads the same, the same objections are still there. Pro Rewrite gives you a practical upgrade path.',
        proof:
          'Keep the free scorecard for reference, then use Pro Rewrite to replace weak sections with clearer, conversion-focused copy.',
        cta: 'Get the Pro Rewrite',
      }}
    />
  );
};

export default AbandonedScorecardDay7;
