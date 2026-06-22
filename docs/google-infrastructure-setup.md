# Google Workspace & Business Infrastructure Setup Guide

## Project: Vibe Tech LLC (vibe-tech.org)

**Target Email:** `Bfreshwater@vibe-tech.org`

This document outlines the step-by-step setup sequence to establish Vibe Tech LLC's email, administration, and services on the Google Cloud / Google Workspace infrastructure.

---

## Phase 1: Google Workspace Registration & Admin Account

1. Go to the [Google Workspace Signup Portal](https://workspace.google.com/).
2. Enter your business details:
   - **Business Name:** `Vibe Tech LLC`
   - **Number of Employees:** Select appropriate size (e.g., Just you / 1-9)
   - **Region:** United States (or your local region)
3. Enter your current personal contact email.
4. When prompted for a domain, select **"Yes, I have one that I can use"** and enter `vibe-tech.org`.
5. Create your primary administrator username and password:
   - **Username:** `Bfreshwater` (which creates `Bfreshwater@vibe-tech.org`)
6. Review terms and complete the setup.

---

## Phase 2: Domain Verification (DNS TXT Record)

To prove to Google that you own `vibe-tech.org`, you must add a TXT verification record to your DNS provider (e.g., GoDaddy, Namecheap, Cloudflare, Route 53):

1. Sign in to your **Domain Registrar / DNS Host** console.
2. Navigate to the **DNS Management / Zone File Settings** panel for `vibe-tech.org`.
3. Add a new record with the following parameters:
   - **Type:** `TXT`
   - **Host/Name/Alias:** `@` (or leave blank/specify your domain name)
   - **TTL:** `3600` (or default)
   - **Value:** `google-site-verification=<unique_hash_provided_by_google_workspace_wizard>`
4. Save the DNS record.
5. In the Google Workspace setup console, click **Verify Domain**. _(Note: DNS propagation can take between 5 to 60 minutes)._

---

## Phase 3: Route Email to Google (MX Records)

To route emails sent to `Bfreshwater@vibe-tech.org` to Google's inbox, you must replace your domain's existing Mail Exchange (MX) records with Google’s servers:

1. In your **DNS Host** console, delete any existing MX records pointing to other mail providers.
2. Add the following **MX Records**:

| Type | Host | Points To / Value  | Priority | TTL    |
| :--- | :--- | :----------------- | :------- | :----- |
| `MX` | `@`  | `SMTP.GOOGLE.COM.` | `1`      | `3600` |

_(Note: Prior to 2023, Google used 5 separate MX servers. The unified `SMTP.GOOGLE.COM` record is now the modern standard. If your registrar requires trailing dots, ensure you include the dot at the end: `SMTP.GOOGLE.COM.`)_

---

## Phase 4: Email Authentication & Security (SPF, DKIM, DMARC)

Setting up these three records is mandatory to prevent your emails from being flagged as spam by Google, Microsoft, and Yahoo.

### 1. Sender Policy Framework (SPF)

Tells recipient servers which IPs and services are authorized to send emails on behalf of `vibe-tech.org`.

- Add a new DNS record:
  - **Type:** `TXT`
  - **Host:** `@`
  - **Value:** `v=spf1 include:_spf.google.com ~all`
    _(If you have an existing SPF record, merge it by adding `include:_spf.google.com` before the ending `~all` or `-all`)._

### 2. DomainKeys Identified Mail (DKIM)

Cryptographically signs outgoing emails to verify they were not tampered with during transit.

1. Sign in to your [Google Admin Console](https://admin.google.com/).
2. Navigate to **Apps > Google Workspace > Gmail > Authenticate email**.
3. Select your domain (`vibe-tech.org`) and click **Generate New Record** (use 2048-bit prefix key unless your DNS registrar only supports 1024-bit).
4. Google will provide a TXT host name (usually `google._domainkey`) and a long text string key.
5. Go to your **DNS Host** and create the DKIM record:
   - **Type:** `TXT`
   - **Host:** `google._domainkey`
   - **Value:** `<long_text_string_provided_by_google>`
6. Return to Google Admin Console and click **Start Authentication** (it may take up to 48 hours for the new DNS records to propagate before authentication starts).

### 3. Domain-based Message Authentication, Reporting, and Conformance (DMARC)

Specifies how recipient servers should handle emails that fail SPF or DKIM checks.

- Add a new DNS record:
  - **Type:** `TXT`
  - **Host:** `_dmarc` (Google Admin checks look for `_dmarc.vibe-tech.org`)
  - **Value:** `v=DMARC1; p=none; rua=mailto:dmarc-reports@vibe-tech.org`
    _(Note: You can create a free alias `dmarc-reports@vibe-tech.org` in Google Workspace to collect reports, or adjust `p=none` to `p=quarantine` once you confirm your emails are authenticating correctly)._

---

## Phase 5: Google Business Profile (Local & Maps Presence)

To establish Vibe Tech LLC on Google Maps and Google Search results:

1. Sign in to your new Workspace account at the [Google Business Profile Manager](https://www.google.com/business/).
2. Click **Add Business > Add Single Business**.
3. Enter your business details:
   - **Business Name:** `Vibe Tech LLC`
   - **Category:** Software Company / Technology Services (or appropriate)
4. Choose whether to add a physical location:
   - If you have an office: Select **Yes** and enter the address.
   - If you work remotely: Select **No** and specify your service areas.
5. Enter contact details:
   - **Phone Number:** Business phone.
   - **Website URL:** `https://www.vibe-tech.org`
6. Verify your business. Google will usually require one of these methods:
   - Email verification (sent to your newly active `Bfreshwater@vibe-tech.org`).
   - Phone verification via SMS/Call.
   - A physical postcard mailed to your LLC registration address.

---

## Phase 6: Google Search Console (SEO Verification)

To track search performance, indexing, and health of `https://www.vibe-tech.org` in Google Search:

1. Go to [Google Search Console](https://search.google.com/search-console).
2. Sign in with your Workspace account.
3. Select **Domain** type property, enter `vibe-tech.org`, and click **Continue**.
4. Since you already set up domain verification under Phase 2, Google will auto-verify the Search Console property via your Workspace integration. If not, add the provided TXT record to your DNS zone.
