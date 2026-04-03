'use client';

import { useState } from 'react';
import { Search } from 'lucide-react';

const HS_CODES = [
  { hsCode: '7113.11', description: 'Articles of jewellery - of silver', chapter: '71', heading: '7113', subheading: '7113.11', dutyRate: 500 },
  { hsCode: '7113.19', description: 'Articles of jewellery - of other precious metal (gold, platinum)', chapter: '71', heading: '7113', subheading: '7113.19', dutyRate: 650 },
  { hsCode: '7113.20', description: 'Articles of jewellery - of base metal clad with precious metal', chapter: '71', heading: '7113', subheading: '7113.20', dutyRate: 400 },
  { hsCode: '7114.11', description: 'Articles of goldsmiths/silversmiths wares - of silver', chapter: '71', heading: '7114', subheading: '7114.11', dutyRate: 500 },
  { hsCode: '7114.19', description: 'Articles of goldsmiths/silversmiths wares - of other precious metal', chapter: '71', heading: '7114', subheading: '7114.19', dutyRate: 650 },
  { hsCode: '7116.10', description: 'Articles of natural pearls', chapter: '71', heading: '7116', subheading: '7116.10', dutyRate: 300 },
  { hsCode: '7116.20', description: 'Articles of precious or semi-precious stones', chapter: '71', heading: '7116', subheading: '7116.20', dutyRate: 300 },
  { hsCode: '7117.11', description: 'Imitation jewellery - cuff links and studs of base metal', chapter: '71', heading: '7117', subheading: '7117.11', dutyRate: 1000 },
  { hsCode: '7117.19', description: 'Imitation jewellery - other of base metal', chapter: '71', heading: '7117', subheading: '7117.19', dutyRate: 1000 },
  { hsCode: '7117.90', description: 'Imitation jewellery - other', chapter: '71', heading: '7117', subheading: '7117.90', dutyRate: 1000 },
  { hsCode: '7101.10', description: 'Natural pearls', chapter: '71', heading: '7101', subheading: '7101.10', dutyRate: 0 },
  { hsCode: '7102.31', description: 'Diamonds - non-industrial, unworked', chapter: '71', heading: '7102', subheading: '7102.31', dutyRate: 0 },
  { hsCode: '7103.91', description: 'Rubies, sapphires, emeralds - worked', chapter: '71', heading: '7103', subheading: '7103.91', dutyRate: 250 },
  { hsCode: '7108.13', description: 'Gold in semi-manufactured forms', chapter: '71', heading: '7108', subheading: '7108.13', dutyRate: 300 },
];

export function HsCodeLookup() {
  const [searchQuery, setSearchQuery] = useState('');

  const filtered = HS_CODES.filter((hs) =>
    hs.hsCode.includes(searchQuery) || hs.description.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by HS code or description..."
          className="h-10 w-full rounded-md border bg-background pl-9 pr-3 text-sm"
        />
      </div>

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">HS Code</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">Chapter</th>
              <th className="px-4 py-3 text-left font-medium">Heading</th>
              <th className="px-4 py-3 text-right font-medium">Default Duty Rate</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map((hs) => (
              <tr key={hs.hsCode} className="hover:bg-accent/50">
                <td className="px-4 py-3 font-mono font-medium">{hs.hsCode}</td>
                <td className="px-4 py-3">{hs.description}</td>
                <td className="px-4 py-3 font-mono">{hs.chapter}</td>
                <td className="px-4 py-3 font-mono">{hs.heading}</td>
                <td className="px-4 py-3 text-right">
                  {hs.dutyRate === 0 ? (
                    <span className="text-green-600 font-medium">Duty Free</span>
                  ) : (
                    <span>{(hs.dutyRate / 100).toFixed(2)}%</span>
                  )}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No HS codes found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {HS_CODES.length} codes. Chapter 71 covers natural or cultured pearls, precious or semi-precious stones, precious metals, and articles thereof.
      </p>
    </div>
  );
}
