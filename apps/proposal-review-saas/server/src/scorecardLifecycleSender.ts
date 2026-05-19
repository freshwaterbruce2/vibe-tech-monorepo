import type { ReactElement } from 'react';

import type {
  AbandonedScorecardDay,
  AbandonedScorecardEmailSender,
  DueAbandonedScorecardEmail,
} from './scorecardLifecycle.js';

interface AbandonedEmailTemplateProps {
  recipientName?: string;
  score?: number;
  scorecardUrl: string;
  proRewriteUrl: string;
  companyName?: string;
}

type AbandonedEmailTemplate = (props: AbandonedEmailTemplateProps) => ReactElement;

interface EmailTemplateModule {
  AbandonedScorecardDay1?: AbandonedEmailTemplate;
  AbandonedScorecardDay3?: AbandonedEmailTemplate;
  AbandonedScorecardDay7?: AbandonedEmailTemplate;
  renderToHtml: (template: ReactElement) => Promise<string>;
  renderToText: (template: ReactElement) => Promise<string>;
}

export function createResendAbandonedScorecardEmailSender(): AbandonedScorecardEmailSender {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM ?? 'Proposal Review <scorecards@example.com>';
  const appBaseUrl = process.env.APP_BASE_URL ?? 'http://127.0.0.1:4320';

  return {
    async sendAbandonedScorecardEmail(candidate) {
      const recipient = candidate.userEmail;
      if (!recipient) {
        throw new Error(`Scorecard ${candidate.id} has no recipient email`);
      }

      if (!apiKey) {
        return {
          scorecardEventId: candidate.id,
          day: candidate.day,
          recipient,
          status: 'mocked',
          providerId: `mock-abandoned-scorecard-${candidate.id}-${candidate.day}`,
        };
      }

      const emails = (await import('@vibetech/emails')) as unknown as EmailTemplateModule;
      const template = selectAbandonedScorecardTemplate(emails, candidate.day);
      const templateProps = buildAbandonedScorecardTemplateProps(candidate, appBaseUrl);
      const html = await emails.renderToHtml(template(templateProps));
      const text = await emails.renderToText(template(templateProps));
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: recipient,
          subject: buildAbandonedScorecardSubject(candidate.day),
          html,
          text,
          tags: [
            {
              name: 'app',
              value: 'proposal-review-saas',
            },
            {
              name: 'sequence',
              value: `abandoned-scorecard-day-${candidate.day}`,
            },
          ],
        }),
      });
      const payload = (await response.json().catch(() => null)) as
        | { id?: string; message?: string; name?: string }
        | null;

      if (!response.ok) {
        const detail = payload?.message ?? payload?.name ?? response.statusText;
        throw new Error(`Resend abandoned scorecard failed: ${detail}`);
      }

      return {
        scorecardEventId: candidate.id,
        day: candidate.day,
        recipient,
        status: 'sent',
        providerId: payload?.id ?? `resend-${candidate.id}-${candidate.day}`,
      };
    },
  };
}

function selectAbandonedScorecardTemplate(
  emails: EmailTemplateModule,
  day: AbandonedScorecardDay,
): AbandonedEmailTemplate {
  const template =
    day === 1
      ? emails.AbandonedScorecardDay1
      : day === 3
        ? emails.AbandonedScorecardDay3
        : emails.AbandonedScorecardDay7;

  if (!template) {
    throw new Error(`@vibetech/emails is missing AbandonedScorecardDay${day}`);
  }

  return template;
}

function buildAbandonedScorecardTemplateProps(
  candidate: DueAbandonedScorecardEmail,
  appBaseUrl: string,
): AbandonedEmailTemplateProps {
  const baseUrl = appBaseUrl.replace(/\/$/, '');

  return {
    recipientName: candidate.userName ?? undefined,
    score: candidate.score ?? undefined,
    scorecardUrl: `${baseUrl}/#review-tool`,
    proRewriteUrl: `${baseUrl}/?source=abandoned-scorecard-day-${candidate.day}#pro-rewrite`,
    companyName: 'Proposal Review',
  };
}

function buildAbandonedScorecardSubject(day: AbandonedScorecardDay): string {
  switch (day) {
    case 1:
      return 'Your proposal scorecard is ready for the next pass';
    case 3:
      return 'Turn your scorecard into a stronger proposal';
    case 7:
      return 'Last reminder to upgrade your proposal scorecard';
  }
}
