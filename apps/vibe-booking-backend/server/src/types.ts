/** Booking-backend shared types + constants extracted for line-limit compliance */

export interface PolicyCompliance {
  isWithinPolicy: boolean;
  requiresApproval: boolean;
  policyReason?: string;
}

export interface Hotel {
  id: string;
  name: string;
  city: string;
  country: string;
  neighborhood: string;
  description: string;
  nightlyRate: number;
  currency: string;
  rating: number;
  reviewScore: number;
  reviewCount: number;
  imageUrl: string;
  gallery: string[];
  amenities: string[];
  businessPerks: string[];
  cancellationPolicy: string;
  distanceFromCenter: string;
  badge: string;
  policyCompliance?: PolicyCompliance;
}

export const PASSWORD_KEY_LENGTH = 64;
export const DEFAULT_PORT = 4020;
export const DEFAULT_HOST = '127.0.0.1';

export function evaluatePolicyCompliance(hotel: Hotel): PolicyCompliance {
  if (hotel.nightlyRate <= 250) {
    return {
      isWithinPolicy: true,
      requiresApproval: false,
    };
  }
  return {
    isWithinPolicy: false,
    requiresApproval: true,
    policyReason: `Rate ($${hotel.nightlyRate}/night) exceeds corporate travel budget limit of $250.`,
  };
}
