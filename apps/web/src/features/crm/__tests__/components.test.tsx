import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

describe('CRM Feature Components', () => {
  describe('Customer360Card', () => {
    const mockCustomer = {
      id: 'c1',
      firstName: 'Priya',
      lastName: 'Sharma',
      phone: '9876543210',
      email: 'priya@example.com',
      city: 'Mumbai',
      state: 'Maharashtra',
      customerType: 'RETAIL',
      loyaltyPoints: 5200,
      loyaltyTier: 'GOLD',
    };

    it('shows customer name', async () => {
      const { Customer360Card } = await import('../Customer360Card');
      render(<Customer360Card customer={mockCustomer} />);
      expect(screen.getByText(/Priya/)).toBeInTheDocument();
      expect(screen.getByText(/Sharma/)).toBeInTheDocument();
    });

    it('shows customer phone and email', async () => {
      const { Customer360Card } = await import('../Customer360Card');
      render(<Customer360Card customer={mockCustomer} />);
      expect(screen.getByText('9876543210')).toBeInTheDocument();
      expect(screen.getByText('priya@example.com')).toBeInTheDocument();
    });

    it('shows loyalty tier badge', async () => {
      const { Customer360Card } = await import('../Customer360Card');
      render(<Customer360Card customer={mockCustomer} />);
      expect(screen.getByText('GOLD')).toBeInTheDocument();
    });
  });

  describe('LeadPipelineBoard', () => {
    it('renders pipeline stages', async () => {
      const { LeadPipelineBoard } = await import('../LeadPipelineBoard');
      const pipeline = {
        NEW: [{ id: 'l1', firstName: 'Rahul', lastName: 'Mehta', status: 'NEW', source: 'WALK_IN', estimatedValuePaise: 500000, assignedTo: null, nextFollowUpDate: null }],
        CONTACTED: [],
        QUALIFIED: [],
      };
      render(<LeadPipelineBoard pipeline={pipeline} stages={['NEW', 'CONTACTED', 'QUALIFIED']} />);
      expect(screen.getByText('NEW')).toBeInTheDocument();
      expect(screen.getByText('CONTACTED')).toBeInTheDocument();
      expect(screen.getByText('QUALIFIED')).toBeInTheDocument();
    });

    it('renders leads within stages', async () => {
      const { LeadPipelineBoard } = await import('../LeadPipelineBoard');
      const pipeline = {
        NEW: [{ id: 'l1', firstName: 'Rahul', lastName: 'Mehta', status: 'NEW', source: 'WALK_IN', estimatedValuePaise: 500000, assignedTo: null, nextFollowUpDate: null }],
      };
      render(<LeadPipelineBoard pipeline={pipeline} stages={['NEW']} />);
      expect(screen.getByText(/Rahul/)).toBeInTheDocument();
    });
  });

  describe('LoyaltyBadge', () => {
    it('shows tier and points', async () => {
      const { LoyaltyBadge } = await import('../LoyaltyBadge');
      render(<LoyaltyBadge tier="GOLD" points={5200} />);
      expect(screen.getByText(/GOLD/)).toBeInTheDocument();
      expect(screen.getByText(/5,200|5200/)).toBeInTheDocument();
    });

    it('handles null tier gracefully', async () => {
      const { LoyaltyBadge } = await import('../LoyaltyBadge');
      render(<LoyaltyBadge tier={null} points={0} />);
      expect(screen.getByText(/0/)).toBeInTheDocument();
    });
  });

  describe('CampaignWizard', () => {
    it('renders first step with campaign details', async () => {
      const { CampaignWizard } = await import('../CampaignWizard');
      render(
        <CampaignWizard
          templates={[{ id: 't1', name: 'Diwali Offer', channel: 'WHATSAPP' }]}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText('Campaign Details')).toBeInTheDocument();
    });

    it('renders navigation buttons', async () => {
      const { CampaignWizard } = await import('../CampaignWizard');
      render(
        <CampaignWizard
          templates={[{ id: 't1', name: 'Diwali Offer', channel: 'WHATSAPP' }]}
          onSubmit={vi.fn()}
          onCancel={vi.fn()}
        />,
      );
      expect(screen.getByText('Next')).toBeInTheDocument();
    });
  });

  describe('InteractionTimeline', () => {
    it('renders interaction entries', async () => {
      const { InteractionTimeline } = await import('../InteractionTimeline');
      const interactions = [
        { id: 'i1', interactionType: 'CALL', direction: 'OUTBOUND', subject: 'Follow-up call', content: 'Discussed new collection', createdAt: new Date('2026-04-05') },
        { id: 'i2', interactionType: 'EMAIL', direction: 'INBOUND', subject: 'Price inquiry', content: null, createdAt: new Date('2026-04-03') },
      ];
      render(<InteractionTimeline interactions={interactions} />);
      expect(screen.getByText('Follow-up call')).toBeInTheDocument();
      expect(screen.getByText('Price inquiry')).toBeInTheDocument();
    });

    it('renders empty state when no interactions', async () => {
      const { InteractionTimeline } = await import('../InteractionTimeline');
      render(<InteractionTimeline interactions={[]} />);
      expect(screen.getByText(/no interactions/i)).toBeInTheDocument();
    });
  });
});
