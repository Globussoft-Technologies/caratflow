import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('CMS Feature Components', () => {
  describe('BannerForm', () => {
    it('renders form with title and subtitle fields', async () => {
      const { BannerForm } = await import('../BannerForm');
      render(<BannerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Title *')).toBeInTheDocument();
      expect(screen.getByText('Subtitle')).toBeInTheDocument();
    });

    it('renders position and audience select fields', async () => {
      const { BannerForm } = await import('../BannerForm');
      render(<BannerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Position')).toBeInTheDocument();
      expect(screen.getByText('Target Audience')).toBeInTheDocument();
    });

    it('renders save and cancel buttons', async () => {
      const { BannerForm } = await import('../BannerForm');
      render(<BannerForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText(/Save|Create/)).toBeInTheDocument();
    });
  });

  describe('CollectionBuilder', () => {
    it('renders collection name and slug fields', async () => {
      const { CollectionBuilder } = await import('../CollectionBuilder');
      render(<CollectionBuilder onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Name *')).toBeInTheDocument();
      expect(screen.getByText('Slug *')).toBeInTheDocument();
    });

    it('renders product search area', async () => {
      const { CollectionBuilder } = await import('../CollectionBuilder');
      render(<CollectionBuilder onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByPlaceholderText(/search product/i)).toBeInTheDocument();
    });
  });

  describe('BlogEditor', () => {
    it('renders blog title and slug fields', async () => {
      const { BlogEditor } = await import('../BlogEditor');
      render(<BlogEditor onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Title *')).toBeInTheDocument();
      expect(screen.getByText('Slug *')).toBeInTheDocument();
    });

    it('renders content and excerpt fields', async () => {
      const { BlogEditor } = await import('../BlogEditor');
      render(<BlogEditor onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Excerpt')).toBeInTheDocument();
      expect(screen.getByText('Content *')).toBeInTheDocument();
    });
  });

  describe('HomepageSectionConfigurator', () => {
    const mockSections = [
      { id: 's1', sectionType: 'HERO_BANNER', displayOrder: 1, isActive: true, config: null },
      { id: 's2', sectionType: 'FEATURED_PRODUCTS', displayOrder: 2, isActive: false, config: null },
    ];

    it('renders section cards', async () => {
      const { HomepageSectionConfigurator } = await import('../HomepageSectionConfigurator');
      render(
        <HomepageSectionConfigurator
          sections={mockSections}
          onToggleActive={vi.fn()}
          onDelete={vi.fn()}
          onConfigure={vi.fn()}
          onReorder={vi.fn()}
        />,
      );
      expect(screen.getByText('Hero Banner')).toBeInTheDocument();
      expect(screen.getByText('Featured Products')).toBeInTheDocument();
    });
  });

  describe('SeoForm', () => {
    it('renders SEO form with meta title and description fields', async () => {
      const { SeoForm } = await import('../SeoForm');
      render(<SeoForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Meta Title')).toBeInTheDocument();
      expect(screen.getByText('Meta Description')).toBeInTheDocument();
    });

    it('renders page type selector', async () => {
      const { SeoForm } = await import('../SeoForm');
      render(<SeoForm onSubmit={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getByText('Page Type *')).toBeInTheDocument();
    });
  });
});
