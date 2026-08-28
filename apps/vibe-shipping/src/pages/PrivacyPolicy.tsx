import { Button } from "@vibetech/ui";
import { Card } from "@vibetech/ui";
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PrivacyPolicy = () => {
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
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-6">
          Effective Date: September 22, 2025
        </p>

        <div className="space-y-6 text-sm">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
            <p>We collect information you provide directly to us, including:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Account information (name, email, company details)</li>
              <li>Warehouse configuration and settings</li>
              <li>Shipping and door schedule data</li>
              <li>Usage data and analytics</li>
              <li>Communication preferences</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
            <p>We use the collected information to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Provide and maintain our services</li>
              <li>Process transactions and billing</li>
              <li>Send operational communications</li>
              <li>Improve our services and develop new features</li>
              <li>Comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Data Security</h2>
            <p>
              We implement industry-standard security measures to protect your data,
              including encryption, secure APIs, and regular security audits.
              Data is stored on secure Cloudflare infrastructure with automatic backups.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Sharing</h2>
            <p>We do not sell or rent your personal information. We may share data with:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Service providers (payment processors, email services)</li>
              <li>Legal authorities when required by law</li>
              <li>Business partners with your explicit consent</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Access your personal data</li>
              <li>Correct inaccurate information</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Opt-out of marketing communications</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies to enhance user experience,
              analyze usage patterns, and provide personalized features.
              You can control cookie preferences in your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Children's Privacy</h2>
            <p>
              Our services are not intended for users under 18 years of age.
              We do not knowingly collect information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. International Data Transfers</h2>
            <p>
              Your data may be processed in countries other than your own.
              We ensure appropriate safeguards are in place for international transfers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Updates to This Policy</h2>
            <p>
              We may update this policy periodically. We will notify you of
              significant changes via email or through our application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
            <p>For privacy-related questions or concerns, contact us at:</p>
            <div className="mt-2">
              <p>Email: privacy@dc8980shipping.com</p>
              <p>Phone: 1-800-DC8980</p>
              <p>Address: 123 Warehouse Way, Distribution City, DC 12345</p>
            </div>
          </section>

          <section className="mt-8 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">GDPR Compliance</h3>
            <p className="text-xs">
              For EU residents: We comply with GDPR requirements including lawful basis
              for processing, data protection by design, and appointment of a Data
              Protection Officer. Contact dpo@dc8980shipping.com for GDPR-specific inquiries.
            </p>
          </section>

          <section className="mt-4 p-4 bg-muted rounded-lg">
            <h3 className="font-semibold mb-2">CCPA Compliance</h3>
            <p className="text-xs">
              For California residents: You have additional rights under CCPA including
              the right to know what personal information we collect, the right to delete,
              and the right to opt-out of the sale of personal information.
            </p>
          </section>
        </div>
      </Card>
    </div>
  );
};

export default PrivacyPolicy;