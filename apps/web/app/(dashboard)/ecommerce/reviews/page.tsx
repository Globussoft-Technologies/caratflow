'use client';

import { PageHeader } from '@caratflow/ui';
import { Search, Eye, EyeOff } from 'lucide-react';
import { ReviewStars } from '@/features/ecommerce';

// Mock data -- in production from tRPC: ecommerce.listReviews
const reviews = [
  { id: '1', productName: '22K Gold Necklace Set', customerName: 'Meera Joshi', rating: 5, title: 'Absolutely stunning!', body: 'The necklace is beautiful, just as shown in the pictures. Great quality gold work.', isVerified: true, isPublished: true, publishedAt: '2026-04-02T10:00:00Z', createdAt: '2026-04-01T08:00:00Z' },
  { id: '2', productName: 'Diamond Solitaire Ring', customerName: 'Vikram Singh', rating: 4, title: 'Good quality', body: 'Ring looks great. Delivery was slightly delayed but product quality is excellent.', isVerified: true, isPublished: true, publishedAt: '2026-03-28T10:00:00Z', createdAt: '2026-03-27T14:00:00Z' },
  { id: '3', productName: 'Pearl Drop Earrings', customerName: 'Ananya Reddy', rating: 5, title: 'Perfect gift!', body: 'Bought these as a birthday gift. My wife loves them!', isVerified: false, isPublished: false, publishedAt: null, createdAt: '2026-04-03T09:00:00Z' },
  { id: '4', productName: '18K Gold Bangles', customerName: 'Pooja Gupta', rating: 3, title: 'Good but sizing issue', body: 'The bangles are beautiful but the sizing was slightly off. Had to get them adjusted.', isVerified: true, isPublished: false, publishedAt: null, createdAt: '2026-04-03T16:00:00Z' },
  { id: '5', productName: 'Kundan Bridal Set', customerName: 'Riya Sharma', rating: 5, title: 'Gorgeous bridal set', body: 'Wore this at my wedding and got so many compliments. Worth every penny!', isVerified: true, isPublished: true, publishedAt: '2026-03-20T10:00:00Z', createdAt: '2026-03-19T12:00:00Z' },
];

export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Product Reviews"
        description="Moderate customer reviews and manage publication status."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'E-Commerce', href: '/ecommerce' },
          { label: 'Reviews' },
        ]}
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">{reviews.length}</p>
          <p className="text-xs text-muted-foreground">Total Reviews</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">{reviews.filter((r) => r.isPublished).length}</p>
          <p className="text-xs text-muted-foreground">Published</p>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <p className="text-2xl font-bold">{reviews.filter((r) => !r.isPublished).length}</p>
          <p className="text-xs text-muted-foreground">Pending Moderation</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Search reviews..."
          className="h-10 w-full rounded-md border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="space-y-3">
        {reviews.map((review) => (
          <div key={review.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ReviewStars rating={review.rating} />
                  <span className="text-sm font-medium">{review.title}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {review.customerName}
                  {review.isVerified && (
                    <span className="ml-1 inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                      Verified
                    </span>
                  )}
                  {' on '}
                  {review.productName}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {review.isPublished ? (
                  <button
                    className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium transition-colors hover:bg-accent"
                    title="Unpublish"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                    Unpublish
                  </button>
                ) : (
                  <button
                    className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    title="Publish"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Publish
                  </button>
                )}
              </div>
            </div>
            {review.body && (
              <p className="mt-2 text-sm text-muted-foreground">{review.body}</p>
            )}
            <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
              <span>{new Date(review.createdAt).toLocaleDateString()}</span>
              {review.isPublished && review.publishedAt && (
                <span>Published: {new Date(review.publishedAt).toLocaleDateString()}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
