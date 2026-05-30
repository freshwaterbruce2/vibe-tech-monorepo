import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getExpediaHeaders, searchHotels, getHotelDetails } from './expediaClient.js';

describe('Expedia Client Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('getExpediaHeaders', () => {
    it('should generate headers with auth signature', () => {
      const apiKey = 'test_key';
      const apiSecret = 'test_secret';
      const headers = getExpediaHeaders(apiKey, apiSecret);

      expect(headers).toBeDefined();
      expect(headers.Authorization).toContain('EAN APIKey=test_key,Signature=');
      expect(headers.Accept).toBe('application/json');
      expect(headers['User-Agent']).toBe('VibeBooking/1.0.0');
    });
  });

  describe('searchHotels', () => {
    it('should fallback to local high-fidelity mock data if no credentials are configured', async () => {
      delete process.env.EXPEDIA_API_KEY;
      delete process.env.EXPEDIA_API_SECRET;

      const hotels = await searchHotels('Miami', '2026-06-01', '2026-06-05', 2);
      expect(hotels.length).toBeGreaterThan(0);
      expect(hotels[0]?.city).toBe('Miami');
    });

    it('should successfully map Expedia Rapid API response format when API is online', async () => {
      process.env.EXPEDIA_API_KEY = 'real_key';
      process.env.EXPEDIA_API_SECRET = 'real_secret';
      process.env.EXPEDIA_API_HOST = 'https://test.ean.com';

      const mockExpediaResponse = {
        properties: [
          {
            property_id: '9999',
            name: 'Rapid Luxury Resort',
            address: {
              city: 'Miami',
              country_code: 'USA',
              neighborhood: 'South Beach',
            },
            tagline: 'Best beach resort.',
            rates: [
              {
                nightly_rate: 350,
                currency: 'USD',
              },
            ],
            ratings: {
              property: { rating: 5.0 },
              guest: { score: 9.5, count: 50 },
            },
            images: [
              { url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb' },
              { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945' },
            ],
            amenities: ['Pool', 'Spa'],
          },
        ],
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockExpediaResponse,
      } as any);

      const hotels = await searchHotels('Miami', '2026-06-01', '2026-06-05', 2);
      expect(hotels).toHaveLength(1);
      expect(hotels[0]?.id).toBe('exp_9999');
      expect(hotels[0]?.name).toBe('Rapid Luxury Resort');
      expect(hotels[0]?.nightlyRate).toBe(350);
      expect(hotels[0]?.imageUrl).toBe('https://images.unsplash.com/photo-1542314831-068cd1dbfeeb');
    });
  });

  describe('getHotelDetails', () => {
    it('should fallback to local mock data for non-exp_ prefixed IDs', async () => {
      const hotel = await getHotelDetails('h_1');
      expect(hotel).not.toBeNull();
      expect(hotel?.id).toBe('h_1');
      expect(hotel?.name).toBe('Harbor Point Suites');
    });

    it('should fetch from Expedia API and map response when id starts with exp_', async () => {
      process.env.EXPEDIA_API_KEY = 'real_key';
      process.env.EXPEDIA_API_SECRET = 'real_secret';

      const mockExpediaDetail = {
        '9999': {
          name: 'Rapid Luxury Resort',
          address: {
            city: 'Miami',
            country_code: 'USA',
            neighborhood: 'South Beach',
          },
          description: 'A luxurious beachfront property.',
          ratings: {
            property: { rating: 4.8 },
            guest: { score: 9.2, count: 75 },
          },
          images: [
            { url: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb' },
          ],
          amenities: ['Pool', 'Spa', 'Gym'],
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockExpediaDetail,
      } as any);

      const hotel = await getHotelDetails('exp_9999');
      expect(hotel).not.toBeNull();
      expect(hotel?.id).toBe('exp_9999');
      expect(hotel?.name).toBe('Rapid Luxury Resort');
      expect(hotel?.description).toBe('A luxurious beachfront property.');
    });
  });
});
