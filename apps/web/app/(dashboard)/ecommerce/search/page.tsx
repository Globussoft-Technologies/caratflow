'use client';

import { useState } from 'react';
import { PageHeader } from '@caratflow/ui';
import {
  Search,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  BarChart3,
  Zap,
  BookOpen,
  Lightbulb,
} from 'lucide-react';

// ─── Mock Data ────────────────────────────────────────────────────
// In production: from tRPC search.getAnalytics, search.listSynonyms, etc.

const mockAnalytics = {
  totalSearches: 12847,
  uniqueQueries: 3421,
  avgResultCount: 14.3,
  zeroResultCount: 234,
  topQueries: [
    { query: 'gold necklace', count: 523, resultCount: 45 },
    { query: 'diamond ring', count: 412, resultCount: 38 },
    { query: 'mangalsutra', count: 387, resultCount: 22 },
    { query: 'silver bracelet', count: 298, resultCount: 31 },
    { query: 'kundan earrings', count: 256, resultCount: 18 },
    { query: 'solitaire ring', count: 234, resultCount: 12 },
    { query: 'gold bangles', count: 201, resultCount: 28 },
    { query: 'jhumka', count: 189, resultCount: 15 },
    { query: 'pearl necklace', count: 167, resultCount: 9 },
    { query: 'platinum ring', count: 145, resultCount: 7 },
  ],
  zeroResultQueries: [
    { query: 'rose gold anklet', count: 34, lastSearchedAt: '2026-04-06T14:00:00Z' },
    { query: 'lab grown diamond', count: 28, lastSearchedAt: '2026-04-07T10:00:00Z' },
    { query: 'titanium ring', count: 22, lastSearchedAt: '2026-04-05T18:00:00Z' },
    { query: 'moissanite earrings', count: 18, lastSearchedAt: '2026-04-06T09:00:00Z' },
    { query: 'toe ring gold', count: 15, lastSearchedAt: '2026-04-04T11:00:00Z' },
  ],
  trendingQueries: [
    { query: 'temple jewelry', count: 89, growth: 245 },
    { query: 'bridal set', count: 156, growth: 180 },
    { query: 'daily wear earrings', count: 67, growth: 120 },
    { query: 'men gold chain', count: 45, growth: 95 },
  ],
};

const mockSynonyms = [
  { id: '1', term: 'choker', synonyms: ['short necklace', 'collar necklace'], isActive: true, createdAt: '2026-03-15T10:00:00Z', updatedAt: '2026-03-15T10:00:00Z' },
  { id: '2', term: 'mangalsutra', synonyms: ['wedding chain', 'thali'], isActive: true, createdAt: '2026-03-15T10:00:00Z', updatedAt: '2026-03-15T10:00:00Z' },
  { id: '3', term: 'jhumka', synonyms: ['drop earring', 'traditional earring'], isActive: true, createdAt: '2026-03-15T10:00:00Z', updatedAt: '2026-03-15T10:00:00Z' },
  { id: '4', term: 'kada', synonyms: ['thick bangle', 'men bangle'], isActive: true, createdAt: '2026-03-15T10:00:00Z', updatedAt: '2026-03-15T10:00:00Z' },
  { id: '5', term: 'polki', synonyms: ['uncut diamond'], isActive: true, createdAt: '2026-03-15T10:00:00Z', updatedAt: '2026-03-15T10:00:00Z' },
  { id: '6', term: 'kundan', synonyms: ['traditional setting'], isActive: true, createdAt: '2026-03-15T10:00:00Z', updatedAt: '2026-03-15T10:00:00Z' },
  { id: '7', term: 'solitaire', synonyms: ['single diamond ring'], isActive: false, createdAt: '2026-03-15T10:00:00Z', updatedAt: '2026-03-15T10:00:00Z' },
  { id: '8', term: 'eternity band', synonyms: ['full diamond ring'], isActive: true, createdAt: '2026-03-15T10:00:00Z', updatedAt: '2026-03-15T10:00:00Z' },
];

const mockSuggestions = [
  { id: '1', suggestion: 'Explore our bridal collection', category: 'Bridal', priority: 10, isActive: true },
  { id: '2', suggestion: 'New arrivals in diamond jewelry', category: 'Diamond', priority: 9, isActive: true },
  { id: '3', suggestion: 'Gold coins starting at Rs. 5,000', category: 'Gold', priority: 8, isActive: true },
  { id: '4', suggestion: 'Akshaya Tritiya special offers', category: null, priority: 7, isActive: false },
];

// ─── Tab definitions ──────────────────────────────────────────────

type Tab = 'overview' | 'synonyms' | 'suggestions' | 'popular';

const TABS: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
  { id: 'overview', label: 'Overview', icon: <BarChart3 className="h-4 w-4" /> },
  { id: 'synonyms', label: 'Synonyms', icon: <BookOpen className="h-4 w-4" /> },
  { id: 'suggestions', label: 'Suggestions', icon: <Lightbulb className="h-4 w-4" /> },
  { id: 'popular', label: 'Popular Searches', icon: <TrendingUp className="h-4 w-4" /> },
];

// ─── Page Component ───────────────────────────────────────────────

export default function SearchDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isReindexing, setIsReindexing] = useState(false);

  // Synonym form state
  const [showSynonymForm, setShowSynonymForm] = useState(false);
  const [synonymTerm, setSynonymTerm] = useState('');
  const [synonymValues, setSynonymValues] = useState('');
  const [editingSynonymId, setEditingSynonymId] = useState<string | null>(null);

  // Suggestion form state
  const [showSuggestionForm, setShowSuggestionForm] = useState(false);
  const [suggestionText, setSuggestionText] = useState('');
  const [suggestionCategory, setSuggestionCategory] = useState('');
  const [suggestionPriority, setSuggestionPriority] = useState(0);

  const handleReindex = () => {
    setIsReindexing(true);
    // In production: trpc.search.reindexAll.mutate()
    setTimeout(() => setIsReindexing(false), 3000);
  };

  const handleAddSynonym = () => {
    // In production: trpc.search.createSynonym.mutate({ term, synonyms })
    setShowSynonymForm(false);
    setSynonymTerm('');
    setSynonymValues('');
  };

  const handleAddSuggestion = () => {
    // In production: trpc.search.createSuggestion.mutate({ suggestion, category, priority })
    setShowSuggestionForm(false);
    setSuggestionText('');
    setSuggestionCategory('');
    setSuggestionPriority(0);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Search Analytics"
        description="Monitor search performance, manage synonyms, and optimize the search experience."
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'E-Commerce', href: '/ecommerce' },
          { label: 'Search Analytics' },
        ]}
        actions={
          <button
            onClick={handleReindex}
            disabled={isReindexing}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isReindexing ? 'animate-spin' : ''}`} />
            {isReindexing ? 'Reindexing...' : 'Reindex All'}
          </button>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Searches"
          value={mockAnalytics.totalSearches.toLocaleString()}
          icon={<Search className="h-4 w-4" />}
          color="blue"
        />
        <StatCard
          label="Unique Queries"
          value={mockAnalytics.uniqueQueries.toLocaleString()}
          icon={<BarChart3 className="h-4 w-4" />}
          color="purple"
        />
        <StatCard
          label="Avg. Results"
          value={mockAnalytics.avgResultCount.toString()}
          icon={<TrendingUp className="h-4 w-4" />}
          color="green"
        />
        <StatCard
          label="Zero Results"
          value={mockAnalytics.zeroResultCount.toLocaleString()}
          icon={<AlertTriangle className="h-4 w-4" />}
          color="red"
        />
      </div>

      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Queries */}
          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Top Search Queries
            </h3>
            <div className="space-y-2">
              {mockAnalytics.topQueries.map((q, i) => (
                <div key={q.query} className="flex items-center gap-3">
                  <span className="w-5 text-xs font-medium text-muted-foreground text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{q.query}</span>
                      <span className="text-xs text-muted-foreground">{q.count} searches</span>
                    </div>
                    <div className="mt-0.5 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{
                          width: `${(q.count / mockAnalytics.topQueries[0].count) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Zero Result Queries */}
          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Zero-Result Queries
              <span className="text-xs font-normal text-muted-foreground">
                (Action needed)
              </span>
            </h3>
            <div className="space-y-2">
              {mockAnalytics.zeroResultQueries.map((q) => (
                <div key={q.query} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{q.query}</p>
                    <p className="text-xs text-muted-foreground">
                      {q.count} searches &middot; Last: {new Date(q.lastSearchedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab('synonyms');
                      setSynonymTerm(q.query);
                      setSynonymValues('');
                      setShowSynonymForm(true);
                    }}
                    className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs font-medium transition-colors hover:bg-accent"
                  >
                    <Plus className="h-3 w-3" />
                    Add Synonym
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Trending Queries */}
          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-500" />
              Trending Queries (Last 7 days)
            </h3>
            <div className="space-y-2">
              {mockAnalytics.trendingQueries.map((q) => (
                <div key={q.query} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{q.query}</p>
                    <p className="text-xs text-muted-foreground">{q.count} searches</p>
                  </div>
                  <span className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    <TrendingUp className="h-3 w-3" />
                    +{q.growth}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Search Volume Chart (simplified) */}
          <div className="rounded-lg border p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              Search Volume (Last 7 days)
            </h3>
            <div className="flex items-end gap-2 h-40">
              {[1820, 2100, 1950, 2300, 1780, 2450, 2447].map((v, i) => {
                const max = 2500;
                const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-primary/20 rounded-t-sm relative group"
                      style={{ height: `${(v / max) * 100}%` }}
                    >
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-primary rounded-t-sm"
                        style={{ height: '100%' }}
                      />
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block text-[10px] font-medium bg-foreground text-background px-1.5 py-0.5 rounded whitespace-nowrap">
                        {v.toLocaleString()}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{days[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'synonyms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Synonyms expand search queries to include related terms, improving result quality.
            </p>
            <button
              onClick={() => {
                setShowSynonymForm(true);
                setEditingSynonymId(null);
                if (!synonymTerm) setSynonymTerm('');
                setSynonymValues('');
              }}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Synonym
            </button>
          </div>

          {/* Synonym Form */}
          {showSynonymForm && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <h4 className="text-sm font-semibold">
                {editingSynonymId ? 'Edit Synonym' : 'Add New Synonym'}
              </h4>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Term
                  </label>
                  <input
                    type="text"
                    value={synonymTerm}
                    onChange={(e) => setSynonymTerm(e.target.value)}
                    placeholder="e.g., choker"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Synonyms (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={synonymValues}
                    onChange={(e) => setSynonymValues(e.target.value)}
                    placeholder="e.g., short necklace, collar necklace"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddSynonym}
                  disabled={!synonymTerm.trim() || !synonymValues.trim()}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <Check className="h-3 w-3" />
                  {editingSynonymId ? 'Update' : 'Add'}
                </button>
                <button
                  onClick={() => {
                    setShowSynonymForm(false);
                    setSynonymTerm('');
                    setSynonymValues('');
                    setEditingSynonymId(null);
                  }}
                  className="inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Synonyms Table */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Term</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Synonyms</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockSynonyms.map((synonym) => (
                  <tr key={synonym.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{synonym.term}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {synonym.synonyms.map((s) => (
                          <span
                            key={s}
                            className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          synonym.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {synonym.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingSynonymId(synonym.id);
                            setSynonymTerm(synonym.term);
                            setSynonymValues(synonym.synonyms.join(', '));
                            setShowSynonymForm(true);
                          }}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-accent"
                          title="Edit"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-destructive transition-colors hover:bg-destructive/10"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Curated suggestions are shown in the autocomplete dropdown to guide customers.
            </p>
            <button
              onClick={() => {
                setShowSuggestionForm(true);
                setSuggestionText('');
                setSuggestionCategory('');
                setSuggestionPriority(0);
              }}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Add Suggestion
            </button>
          </div>

          {/* Suggestion Form */}
          {showSuggestionForm && (
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <h4 className="text-sm font-semibold">Add New Suggestion</h4>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Suggestion Text
                  </label>
                  <input
                    type="text"
                    value={suggestionText}
                    onChange={(e) => setSuggestionText(e.target.value)}
                    placeholder="e.g., Explore our bridal collection"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Category (optional)
                  </label>
                  <input
                    type="text"
                    value={suggestionCategory}
                    onChange={(e) => setSuggestionCategory(e.target.value)}
                    placeholder="e.g., Bridal"
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Priority (0-100)
                  </label>
                  <input
                    type="number"
                    value={suggestionPriority}
                    onChange={(e) => setSuggestionPriority(parseInt(e.target.value, 10) || 0)}
                    min={0}
                    max={100}
                    className="h-9 w-full rounded-md border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleAddSuggestion}
                  disabled={!suggestionText.trim()}
                  className="inline-flex h-8 items-center gap-1 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
                >
                  <Check className="h-3 w-3" />
                  Add
                </button>
                <button
                  onClick={() => setShowSuggestionForm(false)}
                  className="inline-flex h-8 items-center gap-1 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-accent"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Suggestions Table */}
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Suggestion</th>
                  <th className="text-left p-3 font-medium text-muted-foreground">Category</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Priority</th>
                  <th className="text-center p-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockSuggestions.map((suggestion) => (
                  <tr key={suggestion.id} className="border-b last:border-0">
                    <td className="p-3 font-medium">{suggestion.suggestion}</td>
                    <td className="p-3 text-muted-foreground">
                      {suggestion.category ?? '--'}
                    </td>
                    <td className="p-3 text-center">{suggestion.priority}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          suggestion.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {suggestion.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border transition-colors hover:bg-accent"
                          title="Edit"
                        >
                          <Edit2 className="h-3 w-3" />
                        </button>
                        <button
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-destructive transition-colors hover:bg-destructive/10"
                          title="Delete"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'popular' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Popular searches shown to customers when they focus the search bar. Remove irrelevant entries.
          </p>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter popular searches..."
              className="h-10 w-full rounded-md border bg-background pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-medium text-muted-foreground">Query</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Search Count</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Results</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Last Searched</th>
                  <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {mockAnalytics.topQueries.map((q) => (
                  <tr key={q.query} className="border-b last:border-0">
                    <td className="p-3 font-medium">{q.query}</td>
                    <td className="p-3 text-right">{q.count}</td>
                    <td className="p-3 text-right">
                      <span
                        className={`${
                          q.resultCount === 0
                            ? 'text-red-500 font-medium'
                            : 'text-muted-foreground'
                        }`}
                      >
                        {q.resultCount}
                      </span>
                    </td>
                    <td className="p-3 text-right text-muted-foreground">Today</td>
                    <td className="p-3 text-right">
                      <button
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-destructive transition-colors hover:bg-destructive/10"
                        title="Remove"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color: 'blue' | 'purple' | 'green' | 'red';
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-2">
        <span className={`inline-flex h-8 w-8 items-center justify-center rounded-md ${colorMap[color]}`}>
          {icon}
        </span>
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
