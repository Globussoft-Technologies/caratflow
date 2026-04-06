'use client';

import { useState } from 'react';
import { Search, Plus, X, GripVertical } from 'lucide-react';
import type { CollectionResponse } from '@caratflow/shared-types';

interface CollectionBuilderProps {
  collection?: CollectionResponse;
  onSubmit: (data: Record<string, unknown>) => void;
  onCancel: () => void;
}

// Mock product search -- in production this calls tRPC: inventory.products.search
const mockProducts = [
  { id: 'p1', name: '22K Gold Necklace Set', sku: 'GN-001' },
  { id: 'p2', name: 'Diamond Solitaire Ring', sku: 'DR-001' },
  { id: 'p3', name: '18K Gold Bangles (Set of 4)', sku: 'GB-001' },
  { id: 'p4', name: 'Pearl Earrings', sku: 'PE-001' },
  { id: 'p5', name: 'Kundan Bridal Set', sku: 'KB-001' },
  { id: 'p6', name: 'Platinum Wedding Band', sku: 'PW-001' },
];

export function CollectionBuilder({ collection, onSubmit, onCancel }: CollectionBuilderProps) {
  const [name, setName] = useState(collection?.name ?? '');
  const [slug, setSlug] = useState(collection?.slug ?? '');
  const [description, setDescription] = useState(collection?.description ?? '');
  const [imageUrl, setImageUrl] = useState(collection?.imageUrl ?? '');
  const [selectedProducts, setSelectedProducts] = useState<string[]>(
    (collection?.products as string[]) ?? [],
  );
  const [isActive, setIsActive] = useState(collection?.isActive ?? true);
  const [isFeatured, setIsFeatured] = useState(collection?.isFeatured ?? false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = mockProducts.filter(
    (p) =>
      !selectedProducts.includes(p.id) &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const addProduct = (productId: string) => {
    setSelectedProducts((prev) => [...prev, productId]);
    setSearchQuery('');
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts((prev) => prev.filter((id) => id !== productId));
  };

  const generateSlug = (value: string) => {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (value: string) => {
    setName(value);
    if (!collection) {
      setSlug(generateSlug(value));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      name,
      slug,
      description: description || undefined,
      imageUrl: imageUrl || undefined,
      products: selectedProducts,
      isActive,
      isFeatured,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            required
            className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Collection name"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Slug *</label>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            required
            className="h-9 w-full rounded-md border bg-background px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="collection-slug"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="Collection description..."
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Image URL</label>
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="h-9 w-full rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          placeholder="https://..."
        />
      </div>

      {/* Product Selector */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Products</label>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Search products to add..."
          />
        </div>

        {/* Search Results */}
        {searchQuery && (
          <div className="max-h-40 overflow-auto rounded-md border">
            {filteredProducts.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">No products found</p>
            ) : (
              filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addProduct(product.id)}
                  className="flex w-full items-center justify-between p-2 text-left text-sm transition-colors hover:bg-accent"
                >
                  <div>
                    <span className="font-medium">{product.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">{product.sku}</span>
                  </div>
                  <Plus className="h-4 w-4 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        )}

        {/* Selected Products */}
        <div className="space-y-1">
          {selectedProducts.map((productId, index) => {
            const product = mockProducts.find((p) => p.id === productId);
            return (
              <div
                key={productId}
                className="flex items-center justify-between rounded-md border p-2"
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-4 w-4 cursor-grab text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">#{index + 1}</span>
                  <span className="text-sm font-medium">{product?.name ?? productId}</span>
                  {product && (
                    <span className="text-xs text-muted-foreground">{product.sku}</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeProduct(productId)}
                  className="rounded p-1 transition-colors hover:bg-destructive/10"
                >
                  <X className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>
            );
          })}
          {selectedProducts.length === 0 && (
            <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              No products added yet. Use the search above to add products.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="collection-active"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border"
          />
          <label htmlFor="collection-active" className="text-sm font-medium">Active</label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="collection-featured"
            checked={isFeatured}
            onChange={(e) => setIsFeatured(e.target.checked)}
            className="h-4 w-4 rounded border"
          />
          <label htmlFor="collection-featured" className="text-sm font-medium">Featured</label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium transition-colors hover:bg-accent"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {collection ? 'Update Collection' : 'Create Collection'}
        </button>
      </div>
    </form>
  );
}
