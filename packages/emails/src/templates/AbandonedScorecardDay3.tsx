import {
  AbandonedScorecardEmail,
  type AbandonedScorecardEmailProps,
} from './AbandonedScorecardShared.js';

export type AbandonedScorecardDay3Props = AbandonedScorecardEmailProps;

const AbandonedScorecardDay3 = (props: AbandonedScorecardDay3Props) => {
  return (
    <AbandonedScorecardEmail
      {...props}
      copy={{
        heading: 'Still deciding? Your scorecard is a rewrite brief.',
        eyebrow: 'Abandoned scorecard day 3',
        body: 'Three days ago, {scoreLabel} surfaced the parts of your page that are costing trust and conversions. The Pro Rewrite turns that diagnosis into finished messaging.',
        proof:
          'Use the scorecard as the brief and let Pro Rewrite handle the positioning, structure, and stronger calls to action.',
        cta: 'Turn my scorecard into a rewrite',
      }}
    />
  );
};

export default AbandonedScorecardDay3;
