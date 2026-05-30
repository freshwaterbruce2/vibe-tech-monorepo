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

export interface Booking {
  id: string;
  hotelId: string;
  userId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  currency: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  paymentStatus: 'unpaid' | 'paid' | 'refunded';
  createdAt: string;
  bookingType?: 'individual' | 'team';
  teamName?: string;
  billingMethod?: 'personal' | 'corporate_invoice';
}

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface SearchValues {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
}

export interface Review {
  id: string;
  hotelId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

