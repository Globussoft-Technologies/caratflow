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
      expect(screen.getAllByText('Pages').length).toBeGreaterThan(0);
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
    it('renders with page header title "Pages"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/cms/pages/page');
      render(<Page />);
      // page title was renamed from "Static Pages" to just "Pages"
      expect(screen.getAllByText('Pages').length).toBeGreaterThan(0);
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
    it('renders with page header title "FAQ"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/cms/faq/page');
      render(<Page />);
      // page title was renamed from "FAQ Management" to "FAQ"
      expect(screen.getByText('FAQ')).toBeInTheDocument();
    });
  });

  describe('Homepage Builder Page', () => {
    it('renders with page header title "Homepage Sections"', async () => {
      const { default: Page } = await import('../../../app/(dashboard)/cms/homepage/page');
      render(<Page />);
      // page title is "Homepage Sections" (was "Homepage Builder" in an earlier spec)
      expect(screen.getByText('Homepage Sections')).toBeInTheDocument();
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
