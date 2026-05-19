import {
  Body,
  Button,
  Container,
  Heading,
  Html,
  Link,
  Section,
  Text,
} from '@react-email/components';

export interface AbandonedScorecardEmailProps {
  recipientName?: string;
  score?: number;
  scorecardUrl: string;
  proRewriteUrl: string;
  companyName?: string;
}

export interface AbandonedScorecardCopy {
  heading: string;
  eyebrow: string;
  body: string;
  proof: string;
  cta: string;
}

const scoreText = (score?: number): string => {
  if (score === undefined) {
    return 'your free scorecard';
  }

  return `your ${score}/100 scorecard`;
};

export const AbandonedScorecardEmail = ({
  recipientName,
  score,
  scorecardUrl,
  proRewriteUrl,
  companyName,
  copy,
}: AbandonedScorecardEmailProps & { copy: AbandonedScorecardCopy }) => {
  const greeting = recipientName ? `Hi ${recipientName},` : 'Hi,';
  const sender = companyName ?? 'VibeTech';
  const scoreLabel = scoreText(score);

  return (
    <Html>
      <Body
        style={{
          fontFamily: 'Arial, sans-serif',
          backgroundColor: '#f5f5f5',
          padding: '24px',
        }}
      >
        <Container
          style={{
            backgroundColor: '#ffffff',
            padding: '32px',
            maxWidth: '600px',
          }}
        >
          <Text
            style={{
              color: '#2563eb',
              fontSize: '13px',
              fontWeight: '700',
              margin: '0 0 8px',
              textTransform: 'uppercase',
            }}
          >
            {copy.eyebrow}
          </Text>
          <Heading
            style={{ fontSize: '24px', color: '#111827', marginBottom: '16px' }}
          >
            {copy.heading}
          </Heading>
          <Text style={{ fontSize: '16px', color: '#374151' }}>
            {greeting}
          </Text>
          <Text style={{ fontSize: '16px', color: '#374151' }}>
            {copy.body.replace('{scoreLabel}', scoreLabel)}
          </Text>
          <Section
            style={{
              backgroundColor: '#eff6ff',
              border: '1px solid #bfdbfe',
              padding: '16px',
              marginTop: '16px',
            }}
          >
            <Text style={{ margin: '0', color: '#1e3a8a' }}>
              {copy.proof.replace('{scoreLabel}', scoreLabel)}
            </Text>
          </Section>
          <Section style={{ marginTop: '24px', textAlign: 'center' }}>
            <Button
              href={proRewriteUrl}
              style={{
                backgroundColor: '#2563eb',
                color: '#ffffff',
                padding: '12px 24px',
                borderRadius: '6px',
                textDecoration: 'none',
              }}
            >
              {copy.cta}
            </Button>
          </Section>
          <Text
            style={{
              fontSize: '14px',
              color: '#6b7280',
              marginTop: '24px',
            }}
          >
            You can review your free scorecard here:{' '}
            <Link href={scorecardUrl} style={{ color: '#2563eb' }}>
              {scorecardUrl}
            </Link>
          </Text>
          <Text
            style={{
              fontSize: '14px',
              color: '#6b7280',
              marginTop: '16px',
            }}
          >
            Ready for the Pro Rewrite? Use this link:{' '}
            <Link href={proRewriteUrl} style={{ color: '#2563eb' }}>
              {proRewriteUrl}
            </Link>
          </Text>
          <Text
            style={{
              fontSize: '14px',
              color: '#6b7280',
              marginTop: '16px',
            }}
          >
            Thanks,
            <br />
            {sender}
          </Text>
        </Container>
      </Body>
    </Html>
  );
};
