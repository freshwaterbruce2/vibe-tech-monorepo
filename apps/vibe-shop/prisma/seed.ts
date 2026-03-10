import { PrismaNeon } from '@prisma/adapter-neon';
import 'dotenv/config';
import { PrismaClient } from './generated/prisma/client';

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!;
  const adapter = new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

const CATEGORIES = [
  { slug: 'electronics', name: 'Electronics' },
  { slug: 'home-garden', name: 'Home & Garden' },
  { slug: 'fashion', name: 'Fashion' },
  { slug: 'beauty', name: 'Beauty' },
  { slug: 'sports', name: 'Sports' },
  { slug: 'toys', name: 'Toys' },
  { slug: 'automotive', name: 'Automotive' },
];

const PRODUCTS = [
  // --- Electronics (8 products) ---
  {
    externalId: 'seed-1', network: 'shareasale', name: 'AI-Powered Smart Watch Series X',
    description: 'The latest in wearable technology with integrated AI assistant, health monitoring, and seamless connectivity. Features 5-day battery life and satellite SOS.',
    price: 199.99, imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'electronics', trendScore: 95, commissionRate: 10, merchantName: 'TechFuture',
  },
  {
    externalId: 'seed-3', network: 'shareasale', name: 'Wireless Noise-Cancelling Headphones',
    description: 'Premium audio with adaptive noise cancellation, spatial audio, and 40-hour battery life. Includes hi-res LDAC codec.',
    price: 279.99, imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'electronics', trendScore: 92, commissionRate: 8, merchantName: 'SoundElite',
  },
  {
    externalId: 'seed-7', network: 'shareasale', name: 'Smart Fitness Ring Tracker',
    description: 'Discreet titanium health tracker with sleep analysis, heart rate, blood oxygen, and stress monitoring. 7-day battery.',
    price: 249.00, imageUrl: 'https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'electronics', trendScore: 90, commissionRate: 6, merchantName: 'FitLoop',
  },
  {
    externalId: 'seed-10', network: 'awin', name: 'Mechanical Keyboard 75%',
    description: 'Hot-swappable switches, per-key RGB backlighting, PBT keycaps, gasket mount for premium typing feel.',
    price: 149.99, imageUrl: 'https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'electronics', trendScore: 86, commissionRate: 8, merchantName: 'KeyCraft',
  },
  {
    externalId: 'seed-13', network: 'shareasale', name: '4K Portable Monitor 16"',
    description: 'Ultra-slim OLED portable display with USB-C pass-through charging. Perfect for dual-screen productivity on the go.',
    price: 329.00, imageUrl: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'electronics', trendScore: 84, commissionRate: 7, merchantName: 'DisplayPro',
  },
  {
    externalId: 'seed-14', network: 'awin', name: 'Smart Home Hub Pro',
    description: 'Unified smart home controller with Matter support, 7" touchscreen, local processing, and voice assistant integration.',
    price: 179.99, imageUrl: 'https://images.unsplash.com/photo-1558089687-f282ffcbc126?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'electronics', trendScore: 81, commissionRate: 9, merchantName: 'HomeIQ',
  },
  {
    externalId: 'seed-15', network: 'shareasale', name: 'Wireless Earbuds Ultra',
    description: 'ANC earbuds with spatial audio, 36h total playtime, IP67 waterproof, and multipoint Bluetooth 5.4 connectivity.',
    price: 129.99, imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12f032f55?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'electronics', trendScore: 88, commissionRate: 10, merchantName: 'SoundElite',
  },
  {
    externalId: 'seed-16', network: 'shareasale', name: 'E-Ink Reading Tablet 10"',
    description: 'Anti-glare e-ink display with warm-light adjustment, stylus support, and 2-month battery. Perfect for long reading sessions.',
    price: 219.00, imageUrl: 'https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'electronics', trendScore: 76, commissionRate: 6, merchantName: 'ReadWell',
  },

  // --- Home & Garden (5 products) ---
  {
    externalId: 'seed-2', network: 'shareasale', name: 'Ergonomic Standing Desk Pro',
    description: 'Height-adjustable desk with 4 memory presets, built-in cable management, and premium bamboo top. Supports 180 lbs.',
    price: 349.00, imageUrl: 'https://images.unsplash.com/photo-1595515106969-1ce29566ff1c?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'home-garden', trendScore: 88, commissionRate: 5, merchantName: 'WorkWell',
  },
  {
    externalId: 'seed-5', network: 'shareasale', name: 'Smart Indoor Garden Kit',
    description: 'Automated hydroponic system with full-spectrum LED grow lights. Grow 12 pods of fresh herbs and vegetables year-round.',
    price: 89.99, imageUrl: 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'home-garden', trendScore: 82, commissionRate: 7, merchantName: 'GreenTech',
  },
  {
    externalId: 'seed-6', network: 'shareasale', name: 'Portable Espresso Machine',
    description: 'Hand-powered espresso maker for 15-bar extraction anywhere. No electricity needed. Includes travel case.',
    price: 64.99, imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefda?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'home-garden', trendScore: 71, commissionRate: 9, merchantName: 'BrewCraft',
  },
  {
    externalId: 'seed-17', network: 'awin', name: 'Robot Vacuum & Mop Combo',
    description: 'AI-powered navigation with auto-emptying base, mopping system, and room mapping. Works with all voice assistants.',
    price: 449.00, imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'home-garden', trendScore: 91, commissionRate: 6, merchantName: 'CleanBot',
  },
  {
    externalId: 'seed-18', network: 'shareasale', name: 'Smart Air Purifier HEPA',
    description: 'H13 True HEPA filter with real-time AQI display, auto-mode, and whisper-quiet night mode. Covers 1200 sq ft.',
    price: 199.99, imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'home-garden', trendScore: 79, commissionRate: 8, merchantName: 'PureBreeze',
  },

  // --- Fashion (5 products) ---
  {
    externalId: 'seed-4', network: 'shareasale', name: 'Minimalist Leather Backpack',
    description: 'Handcrafted full-grain leather backpack with padded laptop compartment, RFID-blocking pocket, and anti-theft design.',
    price: 129.00, imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'fashion', trendScore: 75, commissionRate: 12, merchantName: 'UrbanCarry',
  },
  {
    externalId: 'seed-19', network: 'awin', name: 'Titanium Aviator Sunglasses',
    description: 'Ultra-lightweight titanium frames with polarized gradient lenses and UV400 protection. Includes hard case.',
    price: 159.00, imageUrl: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'fashion', trendScore: 72, commissionRate: 14, merchantName: 'SunVibe',
  },
  {
    externalId: 'seed-20', network: 'shareasale', name: 'Merino Wool Travel Hoodie',
    description: 'Temperature-regulating merino blend hoodie that resists odor and wrinkles. Perfect for travel and everyday wear.',
    price: 98.00, imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'fashion', trendScore: 69, commissionRate: 11, merchantName: 'WoolCraft',
  },
  {
    externalId: 'seed-21', network: 'shareasale', name: 'Canvas Weekender Duffel Bag',
    description: 'Waxed canvas duffel with shoe compartment, padded laptop sleeve, and adjustable leather straps. 40L capacity.',
    price: 89.00, imageUrl: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'fashion', trendScore: 65, commissionRate: 10, merchantName: 'TravelGear',
  },
  {
    externalId: 'seed-22', network: 'awin', name: 'Automatic Dive Watch 200m',
    description: 'Japanese automatic movement, sapphire crystal, ceramic bezel insert, and 200m water resistance. Swiss-killer spec.',
    price: 289.00, imageUrl: 'https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'fashion', trendScore: 80, commissionRate: 8, merchantName: 'TimeCraft',
  },

  // --- Beauty (4 products) ---
  {
    externalId: 'seed-9', network: 'awin', name: 'Organic Skincare Set',
    description: 'Complete 5-piece skincare routine with vitamin C serum, retinol cream, hyaluronic acid, and plant-based cleanser.',
    price: 79.99, imageUrl: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'beauty', trendScore: 78, commissionRate: 15, merchantName: 'GlowNatural',
  },
  {
    externalId: 'seed-23', network: 'shareasale', name: 'LED Light Therapy Mask',
    description: 'FDA-cleared LED face mask with 7 wavelengths for anti-aging, acne, and skin rejuvenation. 10 min daily routine.',
    price: 199.00, imageUrl: 'https://images.unsplash.com/photo-1596755389378-c31d21fd1273?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'beauty', trendScore: 85, commissionRate: 12, merchantName: 'GlowTech',
  },
  {
    externalId: 'seed-24', network: 'awin', name: 'Electric Scalp Massager',
    description: 'Waterproof scalp massager with 84 flexible nodes and 4 massage modes. Promotes circulation and relaxation.',
    price: 34.99, imageUrl: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'beauty', trendScore: 67, commissionRate: 18, merchantName: 'WellnessHub',
  },
  {
    externalId: 'seed-25', network: 'shareasale', name: 'Professional Hair Dryer Ionic',
    description: '1800W ionic hair dryer with magnetic nozzles, cool-shot button, and 3 heat/speed settings. Salon-quality at home.',
    price: 149.99, imageUrl: 'https://images.unsplash.com/photo-1522338242992-e1a54571a7a8?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'beauty', trendScore: 74, commissionRate: 10, merchantName: 'StylePro',
  },

  // --- Sports (5 products) ---
  {
    externalId: 'seed-8', network: 'shareasale', name: 'Ultralight Running Shoes',
    description: 'Carbon-plate racing shoes with responsive ZoomX foam. Engineered for speed with 20% energy return improvement.',
    price: 179.99, imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'sports', trendScore: 85, commissionRate: 11, merchantName: 'StrideMax',
  },
  {
    externalId: 'seed-26', network: 'awin', name: 'Smart Jump Rope LED',
    description: 'Connected jump rope with LED counter display, adjustable steel cable, and app tracking for calories and reps.',
    price: 44.99, imageUrl: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'sports', trendScore: 70, commissionRate: 13, merchantName: 'FitGear',
  },
  {
    externalId: 'seed-27', network: 'shareasale', name: 'Adjustable Dumbbell Set 50lb',
    description: 'Space-saving adjustable dumbbells from 5-50 lbs in 5-lb increments. Quick-change dial system for rapid transitions.',
    price: 299.00, imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'sports', trendScore: 82, commissionRate: 7, merchantName: 'IronCore',
  },
  {
    externalId: 'seed-28', network: 'shareasale', name: 'Insulated Water Bottle 32oz',
    description: 'Triple-wall vacuum insulated bottle. Keeps drinks cold 48h or hot 24h. BPA-free with leak-proof sport cap.',
    price: 34.99, imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'sports', trendScore: 63, commissionRate: 15, merchantName: 'HydroMax',
  },
  {
    externalId: 'seed-29', network: 'awin', name: 'Yoga Mat Premium 6mm',
    description: 'Eco-friendly natural rubber yoga mat with alignment markings, non-slip surface, and carrying strap. 72"x26".',
    price: 69.99, imageUrl: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'sports', trendScore: 66, commissionRate: 12, merchantName: 'ZenFit',
  },

  // --- Toys (4 products) ---
  {
    externalId: 'seed-12', network: 'shareasale', name: 'STEM Robot Building Kit',
    description: 'Programmable robot kit for kids 8+. Learn coding, sensors, and motors with 300+ pieces and Scratch-compatible app.',
    price: 59.99, imageUrl: 'https://images.unsplash.com/photo-1535378620166-273708d44e4c?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'toys', trendScore: 73, commissionRate: 12, merchantName: 'BrightMinds',
  },
  {
    externalId: 'seed-30', network: 'awin', name: 'Magnetic Building Tiles 120pc',
    description: 'Translucent magnetic tiles for creative 3D construction. STEM-approved for ages 3+. Includes wheels and figures.',
    price: 49.99, imageUrl: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'toys', trendScore: 77, commissionRate: 14, merchantName: 'PlaySmart',
  },
  {
    externalId: 'seed-31', network: 'shareasale', name: 'Kids Drone with Camera',
    description: 'Beginner-friendly drone with 720p camera, auto-hover, obstacle avoidance, and 15-minute flight time. Ages 8+.',
    price: 79.99, imageUrl: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'toys', trendScore: 80, commissionRate: 10, merchantName: 'SkyPlay',
  },
  {
    externalId: 'seed-32', network: 'awin', name: 'Science Experiment Kit 100+',
    description: 'Over 100 hands-on experiments in chemistry, physics, and biology. Lab-grade equipment for young scientists ages 10+.',
    price: 44.99, imageUrl: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'toys', trendScore: 71, commissionRate: 13, merchantName: 'SciKids',
  },

  // --- Automotive (4 products) ---
  {
    externalId: 'seed-11', network: 'shareasale', name: 'Wireless Car Charger Mount',
    description: '15W Qi2 fast wireless charging with auto-clamping, air vent mount, and MagSafe compatibility. Universal fit.',
    price: 39.99, imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'automotive', trendScore: 68, commissionRate: 10, merchantName: 'AutoTech',
  },
  {
    externalId: 'seed-33', network: 'shareasale', name: 'Dash Cam 4K Dual',
    description: 'Front and rear 4K dash camera with night vision, GPS tracking, parking mode, and 256GB microSD support.',
    price: 149.99, imageUrl: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'automotive', trendScore: 83, commissionRate: 9, merchantName: 'DriveSafe',
  },
  {
    externalId: 'seed-34', network: 'awin', name: 'Portable Car Vacuum Handheld',
    description: '12000PA cordless car vacuum with HEPA filter, crevice tool, and 30-min runtime. Charges via USB-C.',
    price: 59.99, imageUrl: 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'automotive', trendScore: 64, commissionRate: 11, merchantName: 'CleanRide',
  },
  {
    externalId: 'seed-35', network: 'shareasale', name: 'Tire Inflator Portable Air',
    description: 'Cordless tire inflator with digital gauge, auto-shutoff, and LED light. Fills car tire in under 5 minutes.',
    price: 49.99, imageUrl: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?w=400&h=400&fit=crop',
    affiliateLink: '#', categorySlug: 'automotive', trendScore: 72, commissionRate: 12, merchantName: 'AutoReady',
  },
];

const KEYWORDS = [
  { keyword: 'AI smartwatch 2026', trendScore: 95, categorySlug: 'electronics' },
  { keyword: 'standing desk ergonomic', trendScore: 88, categorySlug: 'home-garden' },
  { keyword: 'noise cancelling headphones', trendScore: 92, categorySlug: 'electronics' },
  { keyword: 'minimalist leather bag', trendScore: 75, categorySlug: 'fashion' },
  { keyword: 'indoor garden hydroponics', trendScore: 82, categorySlug: 'home-garden' },
  { keyword: 'smart fitness ring', trendScore: 90, categorySlug: 'electronics' },
  { keyword: 'carbon plate running shoes', trendScore: 85, categorySlug: 'sports' },
  { keyword: 'organic skincare routine', trendScore: 78, categorySlug: 'beauty' },
  { keyword: 'mechanical keyboard 2026', trendScore: 86, categorySlug: 'electronics' },
  { keyword: 'STEM toys coding', trendScore: 73, categorySlug: 'toys' },
  { keyword: 'robot vacuum mop combo', trendScore: 91, categorySlug: 'home-garden' },
  { keyword: 'LED light therapy face', trendScore: 85, categorySlug: 'beauty' },
  { keyword: 'dash cam 4K dual', trendScore: 83, categorySlug: 'automotive' },
  { keyword: 'adjustable dumbbells home gym', trendScore: 82, categorySlug: 'sports' },
  { keyword: 'portable monitor USB-C', trendScore: 84, categorySlug: 'electronics' },
  { keyword: 'magnetic tiles kids STEM', trendScore: 77, categorySlug: 'toys' },
  { keyword: 'wireless earbuds ANC 2026', trendScore: 88, categorySlug: 'electronics' },
  { keyword: 'dive watch automatic', trendScore: 80, categorySlug: 'fashion' },
  { keyword: 'air purifier HEPA smart', trendScore: 79, categorySlug: 'home-garden' },
  { keyword: 'yoga mat eco-friendly', trendScore: 66, categorySlug: 'sports' },
];

async function seed() {
  const prisma = createPrismaClient();
  console.log('🌱 Seeding Vibe Shop database...\n');

  // Categories
  console.log('📁 Seeding categories...');
  const categoryMap = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const result = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: { name: cat.name },
      create: { slug: cat.slug, name: cat.name },
    });
    categoryMap.set(cat.slug, result.id);
    console.log(`   ✓ ${cat.name}`);
  }

  // Products
  console.log('\n📦 Seeding products...');
  for (const prod of PRODUCTS) {
    const { categorySlug, ...data } = prod;
    const categoryId = categoryMap.get(categorySlug) ?? null;
    await prisma.product.upsert({
      where: { network_externalId: { network: data.network, externalId: data.externalId } },
      update: { ...data, categoryId },
      create: { ...data, categoryId },
    });
    console.log(`   ✓ ${data.name} ($${data.price})`);
  }

  // Trending Keywords
  console.log('\n🔥 Seeding trending keywords...');
  for (const kw of KEYWORDS) {
    const { categorySlug, ...data } = kw;
    const categoryId = categoryMap.get(categorySlug) ?? null;
    await prisma.trendingKeyword.upsert({
      where: { keyword: data.keyword },
      update: { trendScore: data.trendScore, categoryId },
      create: { ...data, categoryId },
    });
    console.log(`   ✓ "${data.keyword}" (score: ${data.trendScore})`);
  }

  // Sync log
  await prisma.syncLog.create({
    data: {
      syncType: 'seed',
      status: 'success',
      productsAdded: PRODUCTS.length,
      productsRemoved: 0,
      completedAt: new Date(),
    },
  });
  console.log('\n📋 Created seed sync log entry');

  const productCount = await prisma.product.count();
  const categoryCount = await prisma.category.count();
  const keywordCount = await prisma.trendingKeyword.count();

  console.log(`\n✅ Seed complete!`);
  console.log(`   ${categoryCount} categories`);
  console.log(`   ${productCount} products`);
  console.log(`   ${keywordCount} trending keywords`);
  return prisma;
}

seed()
  .then((prisma) => prisma.$disconnect())
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  });
