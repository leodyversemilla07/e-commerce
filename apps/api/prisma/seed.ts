import { prisma } from '../src/prisma';

type CategorySeed = {
  slug: string;
  name: string;
  description: string;
};

type ProductSeed = {
  slug: string;
  name: string;
  description: string;
  priceInCents: number;
  stock: number;
  imageUrl?: string;
  isFeatured?: boolean;
  categorySlug: string;
};

const categories: CategorySeed[] = [
  {
    slug: 'audio',
    name: 'Audio',
    description: 'Headphones, speakers, and sound accessories.',
  },
  {
    slug: 'wearables',
    name: 'Wearables',
    description: 'Smart watches and health-focused devices.',
  },
  {
    slug: 'workspace',
    name: 'Workspace',
    description: 'Office tools and ergonomic essentials.',
  },
  {
    slug: 'gaming',
    name: 'Gaming',
    description: 'Gaming accessories and performance gear.',
  },
];

const products: ProductSeed[] = [
  {
    slug: 'wireless-headphones-pro',
    name: 'Wireless Headphones Pro',
    description: 'Premium over-ear ANC headphones with 40-hour battery life.',
    priceInCents: 399000,
    stock: 24,
    isFeatured: true,
    categorySlug: 'audio',
  },
  {
    slug: 'compact-bluetooth-speaker',
    name: 'Compact Bluetooth Speaker',
    description: 'Portable speaker with deep bass and IPX7 water resistance.',
    priceInCents: 249000,
    stock: 31,
    categorySlug: 'audio',
  },
  {
    slug: 'usb-c-condenser-microphone',
    name: 'USB-C Condenser Microphone',
    description: 'Plug-and-play studio mic for calls, streams, and podcasts.',
    priceInCents: 329000,
    stock: 15,
    categorySlug: 'audio',
  },
  {
    slug: 'smart-watch-pro-x',
    name: 'Smart Watch Pro X',
    description: 'Fitness watch with GPS, sleep tracking, and AMOLED display.',
    priceInCents: 749000,
    stock: 18,
    isFeatured: true,
    categorySlug: 'wearables',
  },
  {
    slug: 'health-band-lite',
    name: 'Health Band Lite',
    description: 'Slim daily tracker with heart rate and step monitoring.',
    priceInCents: 199000,
    stock: 40,
    categorySlug: 'wearables',
  },
  {
    slug: 'wireless-charging-stand',
    name: 'Wireless Charging Stand',
    description: 'Fast charging stand for phones and wearables.',
    priceInCents: 129000,
    stock: 50,
    categorySlug: 'wearables',
  },
  {
    slug: 'ergo-office-chair-v2',
    name: 'Ergo Office Chair V2',
    description: 'Adjustable lumbar support and breathable mesh backrest.',
    priceInCents: 1199000,
    stock: 9,
    isFeatured: true,
    categorySlug: 'workspace',
  },
  {
    slug: 'standing-desk-basic',
    name: 'Standing Desk Basic',
    description: 'Electric height-adjustable desk with memory presets.',
    priceInCents: 1599000,
    stock: 12,
    categorySlug: 'workspace',
  },
  {
    slug: 'mechanical-keyboard-tkl',
    name: 'Mechanical Keyboard TKL',
    description: 'Hot-swappable keyboard with tactile switches and RGB.',
    priceInCents: 449000,
    stock: 29,
    categorySlug: 'workspace',
  },
  {
    slug: 'precision-wireless-mouse',
    name: 'Precision Wireless Mouse',
    description: 'Ergonomic mouse with silent clicks and multi-device mode.',
    priceInCents: 229000,
    stock: 44,
    categorySlug: 'workspace',
  },
  {
    slug: 'ultrawide-monitor-34',
    name: 'Ultrawide Monitor 34"',
    description: '34-inch ultrawide QHD monitor with USB-C dock.',
    priceInCents: 1899000,
    stock: 7,
    categorySlug: 'workspace',
  },
  {
    slug: 'noise-isolation-earbuds',
    name: 'Noise Isolation Earbuds',
    description: 'True wireless earbuds with transparency mode.',
    priceInCents: 279000,
    stock: 36,
    categorySlug: 'audio',
  },
  {
    slug: 'gaming-mouse-rgb',
    name: 'Gaming Mouse RGB',
    description: 'Lightweight gaming mouse with adjustable DPI profiles.',
    priceInCents: 259000,
    stock: 42,
    categorySlug: 'gaming',
  },
  {
    slug: 'gaming-keyboard-compact',
    name: 'Gaming Keyboard Compact',
    description: 'Compact 65% layout keyboard for competitive play.',
    priceInCents: 399000,
    stock: 27,
    categorySlug: 'gaming',
  },
  {
    slug: 'pro-gaming-headset',
    name: 'Pro Gaming Headset',
    description: 'Surround sound headset with detachable boom mic.',
    priceInCents: 469000,
    stock: 21,
    isFeatured: true,
    categorySlug: 'gaming',
  },
  {
    slug: 'xl-gaming-mousepad',
    name: 'XL Gaming Mousepad',
    description: 'Extended desk mousepad with stitched anti-fray edges.',
    priceInCents: 99000,
    stock: 58,
    categorySlug: 'gaming',
  },
  {
    slug: '1080p-webcam',
    name: '1080p Webcam',
    description: 'Autofocus webcam optimized for calls and streaming.',
    priceInCents: 189000,
    stock: 33,
    categorySlug: 'workspace',
  },
  {
    slug: 'desk-led-light-bar',
    name: 'Desk LED Light Bar',
    description: 'Monitor-mounted light bar with adjustable temperature.',
    priceInCents: 149000,
    stock: 26,
    categorySlug: 'workspace',
  },
  {
    slug: 'portable-power-bank-20k',
    name: 'Portable Power Bank 20K',
    description: '20,000mAh high-speed power bank with dual USB-C ports.',
    priceInCents: 179000,
    stock: 47,
    categorySlug: 'wearables',
  },
  {
    slug: 'smart-scale-plus',
    name: 'Smart Scale Plus',
    description: 'Body composition scale with app sync and family profiles.',
    priceInCents: 219000,
    stock: 20,
    categorySlug: 'wearables',
  },
];

async function seed() {
  await prisma.product.deleteMany();
  await prisma.category.deleteMany();

  const categoryMap = new Map<string, string>();

  for (const category of categories) {
    const created = await prisma.category.create({
      data: category,
    });

    categoryMap.set(category.slug, created.id);
  }

  for (const product of products) {
    const categoryId = categoryMap.get(product.categorySlug);

    if (!categoryId) {
      throw new Error(`Category not found for slug: ${product.categorySlug}`);
    }

    await prisma.product.create({
      data: {
        slug: product.slug,
        name: product.name,
        description: product.description,
        priceInCents: product.priceInCents,
        stock: product.stock,
        imageUrl: product.imageUrl ?? null,
        isFeatured: product.isFeatured ?? false,
        categoryId,
      },
    });
  }

  console.log(`Seeded ${categories.length} categories and ${products.length} products`);
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
