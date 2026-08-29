import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';

import { PrismaClient } from '../generated/prisma/client.cjs';
import {
  AttributeDataType,
  CurrencyStatus,
  ProductStatus,
  UserRole,
  UserStatus,
} from '../generated/prisma/enums.cjs';

type BasicRecord = {
  name: string;
  slug: string;
  description?: string;
};

type CategorySeed = BasicRecord & {
  parentSlug?: string;
};

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to run the seed');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const rootCategories: CategorySeed[] = [
  {
    name: 'Face Care',
    slug: 'face-care',
    description: 'Daily facial skincare for cleansing, hydration, and repair.',
  },
  {
    name: 'Treatment',
    slug: 'treatment',
    description: 'Targeted formulas for glow, tone, texture, and clarity.',
  },
  {
    name: 'Sun Care',
    slug: 'sun-care',
    description: 'Lightweight sunscreen and after-sun care.',
  },
  {
    name: 'Body Care',
    slug: 'body-care',
    description: 'Polished, nourishing body routines.',
  },
];

const childCategories: CategorySeed[] = [
  { name: 'Cleansers', slug: 'cleansers', parentSlug: 'face-care' },
  { name: 'Toners', slug: 'toners', parentSlug: 'face-care' },
  { name: 'Moisturizers', slug: 'moisturizers', parentSlug: 'face-care' },
  { name: 'Face Masks', slug: 'face-masks', parentSlug: 'face-care' },
  { name: 'Serums', slug: 'serums', parentSlug: 'treatment' },
  { name: 'Exfoliants', slug: 'exfoliants', parentSlug: 'treatment' },
  { name: 'Eye Care', slug: 'eye-care', parentSlug: 'treatment' },
  { name: 'Lip Care', slug: 'lip-care', parentSlug: 'treatment' },
  { name: 'Sunscreen', slug: 'sunscreen', parentSlug: 'sun-care' },
  { name: 'Body Lotion', slug: 'body-lotion', parentSlug: 'body-care' },
  { name: 'Body Wash', slug: 'body-wash', parentSlug: 'body-care' },
  { name: 'Hand Care', slug: 'hand-care', parentSlug: 'body-care' },
];

const ingredients: (BasicRecord & {
  inciName: string;
  benefits: string;
})[] = [
  {
    name: 'Hyaluronic Acid',
    slug: 'hyaluronic-acid',
    inciName: 'Sodium Hyaluronate',
    benefits: 'Binds water to support plump, hydrated-looking skin.',
  },
  {
    name: 'Niacinamide',
    slug: 'niacinamide',
    inciName: 'Niacinamide',
    benefits: 'Supports an even-looking tone and a healthy skin barrier.',
  },
  {
    name: 'Ceramide Complex',
    slug: 'ceramide-complex',
    inciName: 'Ceramide NP, Ceramide AP, Ceramide EOP',
    benefits: 'Helps reinforce the skin barrier.',
  },
  {
    name: 'Vitamin C',
    slug: 'vitamin-c',
    inciName: 'Ascorbyl Glucoside',
    benefits: 'Brightens the look of dull skin.',
  },
  {
    name: 'Centella',
    slug: 'centella',
    inciName: 'Centella Asiatica Extract',
    benefits: 'Comforts visible redness and stressed skin.',
  },
  {
    name: 'Salicylic Acid',
    slug: 'salicylic-acid',
    inciName: 'Salicylic Acid',
    benefits: 'Helps clarify pores and smooth texture.',
  },
  {
    name: 'Peptides',
    slug: 'peptides',
    inciName: 'Palmitoyl Tripeptide-1',
    benefits: 'Supports a firmer-looking complexion.',
  },
  {
    name: 'Green Tea',
    slug: 'green-tea',
    inciName: 'Camellia Sinensis Leaf Extract',
    benefits: 'Antioxidant care for daily environmental stress.',
  },
];

const benefits: BasicRecord[] = [
  { name: 'Hydrating', slug: 'hydrating' },
  { name: 'Brightening', slug: 'brightening' },
  { name: 'Barrier Support', slug: 'barrier-support' },
  { name: 'Oil Control', slug: 'oil-control' },
  { name: 'Soothing', slug: 'soothing' },
  { name: 'Smoothing', slug: 'smoothing' },
  { name: 'Firming', slug: 'firming' },
  { name: 'Sun Protection', slug: 'sun-protection' },
];

const concerns: BasicRecord[] = [
  { name: 'Dryness', slug: 'dryness' },
  { name: 'Dullness', slug: 'dullness' },
  { name: 'Uneven Texture', slug: 'uneven-texture' },
  { name: 'Visible Pores', slug: 'visible-pores' },
  { name: 'Redness', slug: 'redness' },
  { name: 'Fine Lines', slug: 'fine-lines' },
];

const skinTypes: BasicRecord[] = [
  { name: 'Normal', slug: 'normal' },
  { name: 'Dry', slug: 'dry' },
  { name: 'Oily', slug: 'oily' },
  { name: 'Combination', slug: 'combination' },
  { name: 'Sensitive', slug: 'sensitive' },
];

const audiences: BasicRecord[] = [
  { name: 'Women', slug: 'women' },
  { name: 'Men', slug: 'men' },
  { name: 'Teen Skin', slug: 'teen-skin' },
  { name: 'Sensitive Skin Users', slug: 'sensitive-skin-users' },
];

const ageGroups = [
  { name: 'Teen', slug: 'teen', minAge: 13, maxAge: 19 },
  { name: '20s', slug: '20s', minAge: 20, maxAge: 29 },
  { name: '30s', slug: '30s', minAge: 30, maxAge: 39 },
  { name: '40 Plus', slug: '40-plus', minAge: 40, maxAge: null },
];

const hairProfiles: BasicRecord[] = [
  { name: 'Not Applicable', slug: 'not-applicable' },
  { name: 'Dry Scalp', slug: 'dry-scalp' },
  { name: 'Oily Scalp', slug: 'oily-scalp' },
];

const tags: BasicRecord[] = [
  { name: 'New Arrival', slug: 'new-arrival' },
  { name: 'Best Seller', slug: 'best-seller' },
  { name: 'Vegan', slug: 'vegan' },
  { name: 'Dermatologist Tested', slug: 'dermatologist-tested' },
  { name: 'Travel Size', slug: 'travel-size' },
];

const attributes = [
  {
    name: 'Size',
    slug: 'size',
    description: 'Package size selected for the product variant.',
    dataType: AttributeDataType.SELECT,
    options: ['30ml', '50ml', '100ml', '150ml', '200ml'],
    variant: true,
  },
  {
    name: 'Skin Feel',
    slug: 'skin-feel',
    description: 'How the product feels after application.',
    dataType: AttributeDataType.SELECT,
    options: ['Lightweight', 'Rich', 'Gel', 'Creamy', 'Silky'],
    variant: false,
  },
  {
    name: 'SPF',
    slug: 'spf',
    description: 'Sun protection factor where applicable.',
    dataType: AttributeDataType.NUMBER,
    options: [],
    variant: false,
  },
  {
    name: 'Fragrance Free',
    slug: 'fragrance-free',
    description: 'Whether the formula is made without added fragrance.',
    dataType: AttributeDataType.BOOLEAN,
    options: [],
    variant: false,
  },
  {
    name: 'Texture',
    slug: 'texture',
    description: 'Short texture description for product detail pages.',
    dataType: AttributeDataType.TEXT,
    options: [],
    variant: false,
  },
];

const productAdjectives = [
  'Dewy',
  'Calm',
  'Cloud',
  'Bright',
  'Pure',
  'Velvet',
  'Fresh',
  'Glass',
  'Mineral',
  'Silk',
];

const productTypes = [
  'Hydrating Cleanser',
  'Barrier Cream',
  'Vitamin Serum',
  'Gel Moisturizer',
  'Daily Sunscreen',
  'Clarifying Toner',
  'Overnight Mask',
  'Peptide Eye Cream',
  'Lip Treatment',
  'Body Lotion',
];

function imageUrl(seed: string, width = 900, height = 1100) {
  return `https://picsum.photos/seed/${seed}/${width}/${height}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function pick<T>(items: T[], index: number, offset = 0) {
  return items[(index + offset) % items.length];
}

async function seedAdminUser() {
  const passwordHash = await bcrypt.hash('#Bluewave@9906', 12);

  await prisma.user.upsert({
    where: { email: 'admin@bluewave.com' },
    update: {
      firstName: 'BlueWave',
      lastName: 'Admin',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
      deletedAt: null,
    },
    create: {
      firstName: 'BlueWave',
      lastName: 'Admin',
      email: 'admin@bluewave.com',
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    },
  });
}

async function seedCurrencies() {
  const currencies = [
    { code: 'INR', name: 'Indian Rupee', symbol: 'Rs', isBase: true },
    { code: 'USD', name: 'US Dollar', symbol: '$', isBase: false },
    { code: 'EUR', name: 'Euro', symbol: 'EUR', isBase: false },
  ];

  for (const currency of currencies) {
    await prisma.currency.upsert({
      where: { code: currency.code },
      update: {
        name: currency.name,
        symbol: currency.symbol,
        decimalDigits: 2,
        status: CurrencyStatus.ACTIVE,
        isBase: currency.isBase,
      },
      create: {
        ...currency,
        decimalDigits: 2,
        status: CurrencyStatus.ACTIVE,
      },
    });
  }

  const now = new Date();

  for (const quote of [
    { code: 'USD', rate: '0.01200000' },
    { code: 'EUR', rate: '0.01100000' },
  ]) {
    await prisma.exchangeRate.upsert({
      where: {
        baseCurrencyCode_quoteCurrencyCode_effectiveAt: {
          baseCurrencyCode: 'INR',
          quoteCurrencyCode: quote.code,
          effectiveAt: now,
        },
      },
      update: {
        rate: quote.rate,
        provider: 'bluewave-seed',
      },
      create: {
        baseCurrencyCode: 'INR',
        quoteCurrencyCode: quote.code,
        rate: quote.rate,
        provider: 'bluewave-seed',
        effectiveAt: now,
      },
    });
  }
}

async function seedCategories() {
  const categoryBySlug = new Map<string, { id: string; parentSlug?: string }>();

  for (const category of [...rootCategories, ...childCategories]) {
    const parentId = category.parentSlug
      ? categoryBySlug.get(category.parentSlug)?.id
      : null;

    const record = await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.description ?? `${category.name} essentials.`,
        parentId,
        isActive: true,
        deletedAt: null,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.description ?? `${category.name} essentials.`,
        parentId,
        isActive: true,
      },
    });

    categoryBySlug.set(category.slug, {
      id: record.id,
      parentSlug: category.parentSlug,
    });

    await prisma.categoryImage.deleteMany({
      where: { categoryId: record.id, publicId: { startsWith: 'seed-' } },
    });
    await prisma.categoryImage.create({
      data: {
        categoryId: record.id,
        url: imageUrl(`bluewave-category-${category.slug}`),
        publicId: `seed-category-${category.slug}`,
        altText: `${category.name} category`,
        sortOrder: 0,
        isPrimary: true,
        width: 900,
        height: 1100,
        format: 'jpg',
      },
    });

    await prisma.categorySeo.upsert({
      where: { categoryId: record.id },
      update: {
        title: `${category.name} | BlueWave Skincare`,
        description: category.description ?? `${category.name} essentials.`,
      },
      create: {
        categoryId: record.id,
        title: `${category.name} | BlueWave Skincare`,
        description: category.description ?? `${category.name} essentials.`,
      },
    });
  }

  await prisma.categoryClosure.deleteMany({
    where: {
      descendantId: {
        in: [...categoryBySlug.values()].map((category) => category.id),
      },
    },
  });

  for (const [slug, category] of categoryBySlug) {
    const links = [{ ancestorId: category.id, descendantId: category.id, depth: 0 }];
    let parentSlug = category.parentSlug;
    let depth = 1;

    while (parentSlug) {
      const parent = categoryBySlug.get(parentSlug);

      if (!parent) {
        break;
      }

      links.push({
        ancestorId: parent.id,
        descendantId: category.id,
        depth,
      });
      parentSlug = parent.parentSlug;
      depth += 1;
    }

    await prisma.categoryClosure.createMany({
      data: links,
      skipDuplicates: true,
    });
  }

  return categoryBySlug;
}

async function upsertBasicMetadata(
  delegate: {
    upsert: (args: {
      where: { slug: string };
      update: {
        name: string;
        description?: string | null;
        isActive: boolean;
        deletedAt: null;
      };
      create: {
        name: string;
        slug: string;
        description?: string | null;
        isActive: boolean;
      };
    }) => Promise<{ id: string }>;
  },
  records: BasicRecord[],
) {
  const result = new Map<string, { id: string }>();

  for (const record of records) {
    const item = await delegate.upsert({
      where: { slug: record.slug },
      update: {
        name: record.name,
        ...('description' in record && { description: record.description ?? null }),
        isActive: true,
        deletedAt: null,
      },
      create: {
        name: record.name,
        slug: record.slug,
        ...('description' in record && { description: record.description ?? null }),
        isActive: true,
      },
    });

    result.set(record.slug, { id: item.id });
  }

  return result;
}

async function seedMetadata() {
  const ingredientBySlug = new Map<string, { id: string }>();

  for (const ingredient of ingredients) {
    const item = await prisma.ingredient.upsert({
      where: { slug: ingredient.slug },
      update: {
        name: ingredient.name,
        inciName: ingredient.inciName,
        description: ingredient.description ?? `${ingredient.name} skincare active.`,
        benefits: ingredient.benefits,
        warnings: null,
        isActive: true,
        deletedAt: null,
      },
      create: {
        name: ingredient.name,
        slug: ingredient.slug,
        inciName: ingredient.inciName,
        description: ingredient.description ?? `${ingredient.name} skincare active.`,
        benefits: ingredient.benefits,
        isActive: true,
      },
    });

    ingredientBySlug.set(ingredient.slug, { id: item.id });
  }

  const ageGroupBySlug = new Map<string, { id: string }>();

  for (const ageGroup of ageGroups) {
    const item = await prisma.ageGroup.upsert({
      where: { slug: ageGroup.slug },
      update: {
        name: ageGroup.name,
        minAge: ageGroup.minAge,
        maxAge: ageGroup.maxAge,
        isActive: true,
        deletedAt: null,
      },
      create: {
        name: ageGroup.name,
        slug: ageGroup.slug,
        minAge: ageGroup.minAge,
        maxAge: ageGroup.maxAge,
        isActive: true,
      },
    });

    ageGroupBySlug.set(ageGroup.slug, { id: item.id });
  }

  return {
    ingredientBySlug,
    benefitBySlug: await upsertBasicMetadata(prisma.benefit, benefits),
    concernBySlug: await upsertBasicMetadata(prisma.concern, concerns),
    skinTypeBySlug: await upsertBasicMetadata(prisma.skinType, skinTypes),
    audienceBySlug: await upsertBasicMetadata(prisma.audience, audiences),
    hairProfileBySlug: await upsertBasicMetadata(prisma.hairProfile, hairProfiles),
    tagBySlug: await upsertBasicMetadata(prisma.tag, tags),
    ageGroupBySlug,
  };
}

async function seedAttributes(categoryBySlug: Map<string, { id: string }>) {
  const attributeBySlug = new Map<string, { id: string }>();
  const optionByValue = new Map<string, { id: string }>();

  for (const attribute of attributes) {
    const record = await prisma.attributeDefinition.upsert({
      where: { slug: attribute.slug },
      update: {
        name: attribute.name,
        description: attribute.description,
        dataType: attribute.dataType,
        isActive: true,
        deletedAt: null,
      },
      create: {
        name: attribute.name,
        slug: attribute.slug,
        description: attribute.description,
        dataType: attribute.dataType,
        isActive: true,
      },
    });

    attributeBySlug.set(attribute.slug, { id: record.id });

    for (const [index, option] of attribute.options.entries()) {
      const item = await prisma.attributeOption.upsert({
        where: {
          attributeDefinitionId_value: {
            attributeDefinitionId: record.id,
            value: slugify(option),
          },
        },
        update: {
          label: option,
          sortOrder: index,
          isActive: true,
          deletedAt: null,
        },
        create: {
          attributeDefinitionId: record.id,
          label: option,
          value: slugify(option),
          sortOrder: index,
          isActive: true,
        },
      });

      optionByValue.set(`${attribute.slug}:${slugify(option)}`, { id: item.id });
    }
  }

  for (const category of categoryBySlug.values()) {
    for (const [index, attribute] of attributes.entries()) {
      const attributeRecord = attributeBySlug.get(attribute.slug);

      if (!attributeRecord) {
        continue;
      }

      await prisma.categoryAttribute.upsert({
        where: {
          categoryId_attributeDefinitionId: {
            categoryId: category.id,
            attributeDefinitionId: attributeRecord.id,
          },
        },
        update: {
          isRequired: index < 2,
          isVariantAttribute: attribute.variant,
          sortOrder: index,
        },
        create: {
          categoryId: category.id,
          attributeDefinitionId: attributeRecord.id,
          isRequired: index < 2,
          isVariantAttribute: attribute.variant,
          sortOrder: index,
        },
      });
    }
  }

  return { attributeBySlug, optionByValue };
}

async function seedProducts(
  categoryBySlug: Map<string, { id: string }>,
  metadata: Awaited<ReturnType<typeof seedMetadata>>,
  attributeData: Awaited<ReturnType<typeof seedAttributes>>,
) {
  const childCategorySlugs = childCategories.map((category) => category.slug);
  const now = new Date();

  for (let index = 0; index < 50; index += 1) {
    const name = `${pick(productAdjectives, index)} ${pick(productTypes, index, Math.floor(index / 10))}`;
    const slug = `bluewave-${slugify(name)}-${index + 1}`;
    const categorySlug = pick(childCategorySlugs, index);
    const category = categoryBySlug.get(categorySlug);

    if (!category) {
      continue;
    }

    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        name,
        shortDescription: `${name} for a polished daily skincare routine.`,
        description: `${name} layers comfortably into morning or evening routines with a modern, skin-friendly finish.`,
        usageInstructions: 'Apply to clean skin and follow with moisturizer or sunscreen as needed.',
        warnings: 'Patch test before use. Avoid direct contact with eyes.',
        status: ProductStatus.PUBLISHED,
        isFeatured: index % 5 === 0,
        publishedAt: now,
        deletedAt: null,
      },
      create: {
        name,
        slug,
        shortDescription: `${name} for a polished daily skincare routine.`,
        description: `${name} layers comfortably into morning or evening routines with a modern, skin-friendly finish.`,
        usageInstructions: 'Apply to clean skin and follow with moisturizer or sunscreen as needed.',
        warnings: 'Patch test before use. Avoid direct contact with eyes.',
        status: ProductStatus.PUBLISHED,
        isFeatured: index % 5 === 0,
        publishedAt: now,
      },
    });

    await Promise.all([
      prisma.productCategory.deleteMany({ where: { productId: product.id } }),
      prisma.productIngredient.deleteMany({ where: { productId: product.id } }),
      prisma.productBenefit.deleteMany({ where: { productId: product.id } }),
      prisma.productConcern.deleteMany({ where: { productId: product.id } }),
      prisma.productSkinType.deleteMany({ where: { productId: product.id } }),
      prisma.productAudience.deleteMany({ where: { productId: product.id } }),
      prisma.productAgeGroup.deleteMany({ where: { productId: product.id } }),
      prisma.productHairProfile.deleteMany({ where: { productId: product.id } }),
      prisma.productTag.deleteMany({ where: { productId: product.id } }),
      prisma.productAttributeValue.deleteMany({ where: { productId: product.id } }),
      prisma.productImage.deleteMany({ where: { productId: product.id } }),
    ]);

    const secondaryCategory = categoryBySlug.get(pick(childCategorySlugs, index, 3));

    await prisma.productCategory.createMany({
      data: [
        {
          productId: product.id,
          categoryId: category.id,
          isPrimary: true,
          sortOrder: 0,
        },
        ...(secondaryCategory
          ? [
              {
                productId: product.id,
                categoryId: secondaryCategory.id,
                isPrimary: false,
                sortOrder: 1,
              },
            ]
          : []),
      ],
      skipDuplicates: true,
    });

    await prisma.productImage.createMany({
      data: [0, 1, 2].map((imageIndex) => ({
        productId: product.id,
        variantId: null,
        url: imageUrl(`bluewave-product-${slug}-${imageIndex}`),
        publicId: `seed-product-${slug}-${imageIndex}`,
        altText: `${name} product image ${imageIndex + 1}`,
        sortOrder: imageIndex,
        isPrimary: imageIndex === 0,
        width: 900,
        height: 1100,
        format: 'jpg',
      })),
    });

    const variantSizes = ['30ml', '50ml', '100ml'];
    const sizeAttribute = attributeData.attributeBySlug.get('size');

    for (const [variantIndex, size] of variantSizes.entries()) {
      const variant = await prisma.productVariant.upsert({
        where: { sku: `BW-${String(index + 1).padStart(3, '0')}-${size}` },
        update: {
          productId: product.id,
          price: String(799 + index * 35 + variantIndex * 250),
          compareAtPrice: String(999 + index * 35 + variantIndex * 300),
          stockQuantity: 20 + ((index + variantIndex) % 40),
          isActive: true,
          deletedAt: null,
        },
        create: {
          productId: product.id,
          sku: `BW-${String(index + 1).padStart(3, '0')}-${size}`,
          price: String(799 + index * 35 + variantIndex * 250),
          compareAtPrice: String(999 + index * 35 + variantIndex * 300),
          stockQuantity: 20 + ((index + variantIndex) % 40),
          isActive: true,
        },
      });

      await prisma.variantAttributeValue.deleteMany({
        where: { variantId: variant.id },
      });

      const sizeOption = attributeData.optionByValue.get(`size:${slugify(size)}`);

      if (sizeAttribute && sizeOption) {
        await prisma.variantAttributeValue.create({
          data: {
            variantId: variant.id,
            attributeId: sizeAttribute.id,
            optionId: sizeOption.id,
          },
        });
      }
    }

    await prisma.productIngredient.createMany({
      data: [0, 1, 2].map((offset) => {
        const ingredient = pick(ingredients, index, offset);
        const record = metadata.ingredientBySlug.get(ingredient.slug);

        return {
          productId: product.id,
          ingredientId: record?.id ?? '',
          purpose: offset === 0 ? 'Hero active' : 'Support active',
          concentration: offset === 0 ? `${2 + (index % 8)}%` : null,
          isKeyIngredient: offset === 0,
          sortOrder: offset,
        };
      }).filter((item) => item.ingredientId),
      skipDuplicates: true,
    });

    await prisma.productBenefit.createMany({
      data: [0, 2, 4].flatMap((offset) => {
        const benefit = metadata.benefitBySlug.get(
          pick(benefits, index, offset).slug,
        );

        return benefit ? [{ productId: product.id, benefitId: benefit.id }] : [];
      }),
      skipDuplicates: true,
    });

    await prisma.productConcern.createMany({
      data: [0, 1].flatMap((offset) => {
        const concern = metadata.concernBySlug.get(
          pick(concerns, index, offset).slug,
        );

        return concern ? [{ productId: product.id, concernId: concern.id }] : [];
      }),
      skipDuplicates: true,
    });

    await prisma.productSkinType.createMany({
      data: [0, 2].flatMap((offset) => {
        const skinType = metadata.skinTypeBySlug.get(
          pick(skinTypes, index, offset).slug,
        );

        return skinType
          ? [{ productId: product.id, skinTypeId: skinType.id }]
          : [];
      }),
      skipDuplicates: true,
    });

    await prisma.productAudience.createMany({
      data: [0, 1].flatMap((offset) => {
        const audience = metadata.audienceBySlug.get(
          pick(audiences, index, offset).slug,
        );

        return audience
          ? [{ productId: product.id, audienceId: audience.id }]
          : [];
      }),
      skipDuplicates: true,
    });

    await prisma.productAgeGroup.createMany({
      data: [0, 1].flatMap((offset) => {
        const ageGroup = metadata.ageGroupBySlug.get(
          pick(ageGroups, index, offset).slug,
        );

        return ageGroup
          ? [{ productId: product.id, ageGroupId: ageGroup.id }]
          : [];
      }),
      skipDuplicates: true,
    });

    const hairProfile = metadata.hairProfileBySlug.get('not-applicable');

    if (hairProfile) {
      await prisma.productHairProfile.create({
        data: {
          productId: product.id,
          hairProfileId: hairProfile.id,
        },
      });
    }

    await prisma.productTag.createMany({
      data: [0, 2].flatMap((offset) => {
        const tag = metadata.tagBySlug.get(pick(tags, index, offset).slug);

        return tag ? [{ productId: product.id, tagId: tag.id }] : [];
      }),
      skipDuplicates: true,
    });

    const skinFeel = pick(['Lightweight', 'Rich', 'Gel', 'Creamy', 'Silky'], index);
    const skinFeelAttribute = attributeData.attributeBySlug.get('skin-feel');
    const skinFeelOption = attributeData.optionByValue.get(
      `skin-feel:${slugify(skinFeel)}`,
    );
    const spfAttribute = attributeData.attributeBySlug.get('spf');
    const fragranceAttribute = attributeData.attributeBySlug.get('fragrance-free');
    const textureAttribute = attributeData.attributeBySlug.get('texture');

    await prisma.productAttributeValue.createMany({
      data: [
        ...(skinFeelAttribute && skinFeelOption
          ? [
              {
                productId: product.id,
                attributeId: skinFeelAttribute.id,
                optionId: skinFeelOption.id,
              },
            ]
          : []),
        ...(spfAttribute
          ? [
              {
                productId: product.id,
                attributeId: spfAttribute.id,
                numberValue: categorySlug === 'sunscreen' ? '50' : '0',
              },
            ]
          : []),
        ...(fragranceAttribute
          ? [
              {
                productId: product.id,
                attributeId: fragranceAttribute.id,
                booleanValue: index % 3 !== 0,
              },
            ]
          : []),
        ...(textureAttribute
          ? [
              {
                productId: product.id,
                attributeId: textureAttribute.id,
                textValue: `${skinFeel} ${categorySlug.replace('-', ' ')}`,
              },
            ]
          : []),
      ],
    });

    await prisma.productSeo.upsert({
      where: { productId: product.id },
      update: {
        title: `${name} | BlueWave Skincare`,
        description: `${name} with curated ingredients for modern skincare routines.`,
        canonicalUrl: `/products/${slug}`,
      },
      create: {
        productId: product.id,
        title: `${name} | BlueWave Skincare`,
        description: `${name} with curated ingredients for modern skincare routines.`,
        canonicalUrl: `/products/${slug}`,
      },
    });
  }
}

async function main() {
  console.log('Seeding BlueWave demo data...');

  await seedAdminUser();
  await seedCurrencies();
  const categoryBySlug = await seedCategories();
  const metadata = await seedMetadata();
  const attributeData = await seedAttributes(categoryBySlug);
  await seedProducts(categoryBySlug, metadata, attributeData);

  console.log(
    'Seed complete: admin, categories, metadata, attributes, and 50 products are ready.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
