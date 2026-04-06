import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('CMS Pages', () => {
  describe('CMS Dashboard', () => {
    it('renders with page header title "Content Management"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/cms/page');
      render(<Page />);
      expect(screen.getByText('Content Management')).toBeInTheDocument();
    });

    it('renders stat cards for content overview', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/cms/page');
      render(<Page />);
      expect(screen.getByText('Active Banners')).toBeInTheDocument();
      expect(screen.getAllByText('Collections').length).toBeGreaterThan(0);
      expect(screen.getByText('Published Pages')).toBeInTheDocument();
      expect(screen.getByText('Blog Posts')).toBeInTheDocument();
    });
  });

  describe('Banners Page', () => {
    it('renders with page header title "Banners"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/cms/banners/page');
      render(<Page />);
      expect(screen.getByText('Banners')).toBeInTheDocument();
    });
  });

  describe('Collections Page', () => {
    it('renders with page header title "Collections"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/cms/collections/page');
      render(<Page />);
      expect(screen.getByText('Collections')).toBeInTheDocument();
    });
  });

  describe('Static Pages Page', () => {
    it('renders with page header title "Static Pages"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/cms/pages/page');
      render(<Page />);
      expect(screen.getByText('Static Pages')).toBeInTheDocument();
    });
  });

  describe('Blog Posts Page', () => {
    it('renders with page header title "Blog Posts"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/cms/blog/page');
      render(<Page />);
      expect(screen.getByText('Blog Posts')).toBeInTheDocument();
    });
  });

  describe('FAQ Page', () => {
    it('renders with page header title "FAQ Management"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/cms/faq/page');
      render(<Page />);
      expect(screen.getByText('FAQ Management')).toBeInTheDocument();
    });
  });

  describe('Homepage Builder Page', () => {
    it('renders with page header title "Homepage Builder"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/cms/homepage/page');
      render(<Page />);
      expect(screen.getByText('Homepage Builder')).toBeInTheDocument();
    });
  });

  describe('SEO Metadata Page', () => {
    it('renders with page header title "SEO Metadata"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/cms/seo/page');
      render(<Page />);
      expect(screen.getByText('SEO Metadata')).toBeInTheDocument();
    });
  });
});
