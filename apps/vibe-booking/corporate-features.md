# Corporate Features Implementation Plan

## Goal
Implement B2B company booking capabilities (Policy Compliance, Team Bookings, and Corporate Invoicing) in the Vibe Booking application.

## Tasks

- [ ] **Task 1: Update API & Frontend Types**
  - Add `policyCompliance` fields (e.g. `isWithinPolicy`, `requiresApproval`, `policyReason`) to the `Hotel` model in `apps/vibe-booking/src/app/types.ts` and the backend models in `apps/vibe-booking-backend/server/src/index.ts`.
  - Add `bookingType` (`individual` | `team`), `teamName`, and `billingMethod` (`personal` | `corporate_invoice`) to the `Booking` schema.
  - *Verify*: Compile both frontend and backend using `tsc --noEmit`.

- [ ] **Task 2: Implement Backend Policy Rules**
  - In `apps/vibe-booking-backend/server/src/index.ts`, add a helper function `evaluatePolicyCompliance(hotel, searchGuests)` that tags stays as "Within Policy" if the rate is <= $250/night, or "Requires Approval" (with policy reason) if above.
  - Modify the `/api/hotels/search` and `/api/hotels/:id` endpoints to include this policy evaluation.
  - *Verify*: Test the backend search `/api/hotels/search` API and check that response items contain `policyCompliance`.

- [ ] **Task 3: Surface Policy Badges in Frontend**
  - Update `HotelCard.tsx` and `HotelPage.tsx` in `apps/vibe-booking/src/app/` to display:
    - A green badge `Within Policy` for policy-compliant stays.
    - A yellow badge `Requires Manager Approval` with a warning message if a stay exceeds budget rules.
  - *Verify*: Run Vite, open search results, and ensure the badges appear correctly on the hotel cards.

- [ ] **Task 4: Add Team/Multi-Guest Options in Booking Flow**
  - Update the booking form (`apps/vibe-booking/src/app/booking-flow.tsx`) to add a toggle between "Individual Stay" and "Team/Group Stay".
  - If "Team/Group Stay" is selected, render fields for "Company Team Name", "Group Size", and guest names list.
  - *Verify*: Click "Reserve" on a listing, select "Team Stay", and ensure form options render and capture the input.

- [ ] **Task 5: Implement Corporate Billing & Invoices**
  - Update the booking form to offer "Corporate Invoice (Central Billing)" alongside card/Stripe payment.
  - In the backend (`apps/vibe-booking-backend/server/src/index.ts`), modify the reserve/checkout endpoint to support direct invoice generation instead of spawning a checkout session when "Corporate Invoice" is selected.
  - Render an "Invoice Generated & Sent to Central Account" success screen on the frontend with a mock PDF download action.
  - *Verify*: Complete a checkout using "Corporate Invoice", verify the booking status is logged as `confirmed`, and download the mock invoice.

## Done When
- [ ] Stays are marked dynamically as compliant vs. requiring approval based on nightly rates.
- [ ] Users can book team-sized stays with group size and company name.
- [ ] Users can choose corporate invoicing, bypassing card payment, resulting in a successful reservation and downloadable invoice receipt.
