import { describe, it, expect } from 'vitest';
import {
  BannerInputSchema,
  CollectionInputSchema,
  BlogPostInputSchema,
  HomepageSectionInputSchema,
  PageInputSchema,
  FaqInputSchema,
  AnnouncementInputSchema,
  SeoMetadataInputSchema,
  BannerLinkType,
  BannerPosition,
  TargetAudience,
  HomepageSectionType,
  SeoPageType,
} from '../cms';

describe('BannerInputSchema', () => {
  it('should parse valid banner with defaults', () => {
    const result = BannerInputSchema.safeParse({
      title: 'Diwali Sale',
      imageUrl: 'https://cdn.example.com/banner.jpg',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.linkType).toBe(BannerLinkType.NONE);
      expect(result.data.position).toBe(BannerPosition.HERO);
      expect(result.data.isActive).toBe(true);
      expect(result.data.targetAudience).toBe(TargetAudience.ALL);
    }
  });

  it('should reject invalid imageUrl', () => {
    const result = BannerInputSchema.safeParse({
      title: 'Test',
      imageUrl: 'not-a-url',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty title', () => {
    const result = BannerInputSchema.safeParse({
      title: '',
      imageUrl: 'https://cdn.example.com/img.jpg',
    });
    expect(result.success).toBe(false);
  });

  it('should accept all optional fields', () => {
    const result = BannerInputSchema.safeParse({
      title: 'Sale',
      subtitle: 'Up to 20% off',
      imageUrl: 'https://cdn.example.com/banner.jpg',
      linkUrl: 'https://shop.example.com/sale',
      linkType: BannerLinkType.EXTERNAL,
      position: BannerPosition.POPUP,
      displayOrder: 5,
      startDate: '2026-10-01',
      endDate: '2026-10-31',
      isActive: true,
      targetAudience: TargetAudience.LOYALTY_MEMBERS,
    });
    expect(result.success).toBe(true);
  });
});

describe('CollectionInputSchema', () => {
  it('should parse valid collection', () => {
    const result = CollectionInputSchema.safeParse({
      name: 'Wedding Collection',
      slug: 'wedding-collection',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid slug format', () => {
    const result = CollectionInputSchema.safeParse({
      name: 'Test',
      slug: 'Invalid Slug!',
    });
    expect(result.success).toBe(false);
  });

  it('should accept valid slug with hyphens', () => {
    const result = CollectionInputSchema.safeParse({
      name: 'Bridal Sets',
      slug: 'bridal-sets-2026',
    });
    expect(result.success).toBe(true);
  });
});

describe('BlogPostInputSchema', () => {
  it('should parse valid blog post', () => {
    const result = BlogPostInputSchema.safeParse({
      title: 'How to Choose a Diamond',
      slug: 'how-to-choose-a-diamond',
      content: 'Choosing a diamond requires understanding the 4Cs...',
      author: 'Jeweler Expert',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPublished).toBe(false);
      expect(result.data.readTimeMinutes).toBe(0);
    }
  });

  it('should reject empty content', () => {
    const result = BlogPostInputSchema.safeParse({
      title: 'Test',
      slug: 'test',
      content: '',
      author: 'Author',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid slug', () => {
    const result = BlogPostInputSchema.safeParse({
      title: 'Test',
      slug: 'Test Post',
      content: 'Content',
      author: 'Author',
    });
    expect(result.success).toBe(false);
  });
});

describe('HomepageSectionInputSchema', () => {
  it('should parse valid homepage section', () => {
    const result = HomepageSectionInputSchema.safeParse({
      sectionType: HomepageSectionType.HERO_BANNER,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isActive).toBe(true);
      expect(result.data.displayOrder).toBe(0);
    }
  });

  it('should accept optional config', () => {
    const result = HomepageSectionInputSchema.safeParse({
      sectionType: HomepageSectionType.FEATURED_PRODUCTS,
      config: {
        title: 'Featured Products',
        limit: 8,
        showViewAll: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid section type', () => {
    const result = HomepageSectionInputSchema.safeParse({
      sectionType: 'SIDEBAR_WIDGET',
    });
    expect(result.success).toBe(false);
  });
});

describe('PageInputSchema', () => {
  it('should parse valid page', () => {
    const result = PageInputSchema.safeParse({
      title: 'About Us',
      slug: 'about-us',
      content: '<h1>About Us</h1><p>We are jewelers.</p>',
    });
    expect(result.success).toBe(true);
  });
});

describe('FaqInputSchema', () => {
  it('should parse valid FAQ', () => {
    const result = FaqInputSchema.safeParse({
      question: 'What is hallmarking?',
      answer: 'Hallmarking is a purity certification for gold jewelry.',
    });
    expect(result.success).toBe(true);
  });
});

describe('AnnouncementInputSchema', () => {
  it('should parse valid announcement', () => {
    const result = AnnouncementInputSchema.safeParse({
      message: 'Free shipping on orders above Rs. 50,000!',
    });
    expect(result.success).toBe(true);
  });
});

describe('SeoMetadataInputSchema', () => {
  it('should parse valid SEO metadata', () => {
    const result = SeoMetadataInputSchema.safeParse({
      pageType: SeoPageType.HOME,
      pageIdentifier: 'home',
      metaTitle: 'Best Jewelry Store',
      metaDescription: 'Shop the finest gold and diamond jewelry.',
    });
    expect(result.success).toBe(true);
  });
});
