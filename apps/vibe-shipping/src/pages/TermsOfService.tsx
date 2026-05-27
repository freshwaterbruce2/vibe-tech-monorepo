import { Button } from "@vibetech/ui";
import { Card } from "@vibetech/ui";
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TermsOfService = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Button
        variant="ghost"
        className="mb-6"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <Card className="p-8">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Effective Date: September 22, 2025
        </p>

        <div className="space-y-6 text-sm">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing or using DC8980 Shipping services, you agree to be bound by
              these Terms of Service. If you do not agree, do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Service Description</h2>
            <p>
              DC8980 Shipping provides warehouse management software including door
              scheduling, pallet tracking, voice commands, and reporting features.
              Services are provided on a subscription basis with various tiers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Account Responsibilities</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>You must provide accurate account information</li>
              <li>You are responsible for maintaining account security</li>
              <li>You must notify us immediately of unauthorized access</li>
              <li>You are responsible for all activities under your account</li>
              <li>Accounts are non-transferable without written consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Subscription and Billing</h2>
            <div className="space-y-2">
              <h3 className="font-semibold">4.1 Subscription Tiers</h3>
              <ul className="list-disc ml-6 space-y-1">
                <li>Free: Limited features, 20 doors per month</li>
                <li>Starter: $49/month, 100 doors, email support</li>
                <li>Professional: $149/month, unlimited doors, priority support</li>
                <li>Enterprise: Custom pricing and features</li>
              </ul>

              <h3 className="font-semibold mt-3">4.2 Payment Terms</h3>
              <ul className="list-disc ml-6 space-y-1">
                <li>Subscriptions are billed monthly in advance</li>
                <li>Prices are subject to change with 30 days notice</li>
                <li>All fees are non-refundable except as required by law</li>
                <li>Failed payments may result in service suspension</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Acceptable Use Policy</h2>
            <p>You agree not to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Use the service for illegal purposes</li>
              <li>Attempt to breach security or interfere with service operation</li>
              <li>Upload malicious code or harmful content</li>
              <li>Resell or redistribute the service without authorization</li>
              <li>Violate intellectual property rights</li>
              <li>Use automated tools to access the service excessively</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Service Level Agreement</h2>
            <p>We strive to maintain 99.9% uptime. Our SLA includes:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Scheduled maintenance with 48-hour notice</li>
              <li>Emergency maintenance as needed</li>
              <li>Service credits for extended downtime (Professional tier and above)</li>
              <li>Best-effort support response times based on tier</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data Ownership and Portability</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>You retain ownership of your data</li>
              <li>We have a license to use your data to provide services</li>
              <li>You can export your data at any time</li>
              <li>Upon termination, data is retained for 30 days</li>
              <li>We will not sell or share your data without consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Intellectual Property</h2>
            <p>
              DC8980 Shipping and its licensors retain all rights to the service,
              including software, designs, and trademarks. You receive a limited,
              non-exclusive license to use the service during your subscription.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Warranties and Disclaimers</h2>
            <p className="font-semibold">THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.</p>
            <p className="mt-2">
              We do not warrant that the service will be uninterrupted, error-free,
              or meet your specific requirements. We disclaim all warranties,
              express or implied, including merchantability and fitness for purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Limitation of Liability</h2>
            <p className="font-semibold">
              OUR LIABILITY IS LIMITED TO THE AMOUNT YOU PAID IN THE PAST 12 MONTHS.
            </p>
            <p className="mt-2">
              We are not liable for indirect, incidental, special, consequential,
              or punitive damages, including lost profits, revenue, or data.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless DC8980 Shipping from claims
              arising from your use of the service, violation of these terms,
              or infringement of third-party rights.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Termination</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>Either party may terminate with 30 days written notice</li>
              <li>We may terminate immediately for terms violations</li>
              <li>Upon termination, access ceases immediately</li>
              <li>Termination does not relieve payment obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">13. Governing Law</h2>
            <p>
              These terms are governed by the laws of Delaware, USA.
              Disputes will be resolved through binding arbitration,
              except where prohibited by law.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">14. Changes to Terms</h2>
            <p>
              We may modify these terms with 30 days notice for material changes.
              Continued use after changes constitutes acceptance of new terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">15. Contact Information</h2>
            <div className="mt-2">
              <p>DC8980 Shipping, LLC</p>
              <p>Email: legal@dc8980shipping.com</p>
              <p>Phone: 1-800-DC8980</p>
              <p>Address: 123 Warehouse Way, Distribution City, DC 12345</p>
            </div>
          </section>

          <div className="mt-8 p-4 bg-muted rounded-lg">
            <p className="text-xs">
              By using DC8980 Shipping, you acknowledge that you have read,
              understood, and agree to be bound by these Terms of Service.
              Last updated: September 22, 2025. Version 1.0.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default TermsOfService;