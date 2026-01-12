'use client';

import * as React from 'react';
import { Package, ShoppingBag, TrendingDown } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useDataContext } from '@/lib/data-provider';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { Item, Sale } from '@/lib/data';

function NairaIcon({ className }: { className?: string }) {
    return (
      <svg
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M6 18h12" />
        <path d="M6 12h12" />
        <path d="M19 6H5L12 20L19 6Z" />
      </svg>
    );
  }

export default function DashboardPage() {
  const { items, sales, stock } = useDataContext();

  const getSalesByItem = React.useCallback(() => {
    if (!sales || !items) return [];
    const salesByItem = new Map<string, { quantity: number; total: number }>();
    for (const sale of sales) {
      const existing = salesByItem.get(sale.itemId) || { quantity: 0, total: 0 };
      salesByItem.set(sale.itemId, {
        quantity: existing.quantity + sale.quantity,
        total: existing.total + (sale.quantity * (items.find(i => i.id === sale.itemId)?.unitPrice || 0)),
      });
    }
    return Array.from(salesByItem.entries()).map(([itemId, data]) => {
      const item = items.find(i => i.id === itemId);
      return {
        name: item?.name || 'Unknown',
        quantity: data.quantity,
        total: data.total,
      };
    });
  }, [sales, items]);
  
  const getStockSummary = React.useCallback(() => {
    if (!stock || !items) return [];
    const salesByItem = getSalesByItem();
    return stock.map(stockItem => {
        const item = items.find(i => i.id === stockItem.itemId);
        const saleInfo = salesByItem.find(s => s.name === item?.name);
        const sold = saleInfo?.quantity || 0;
        const closingStock = stockItem.openingStock - sold;

        return {
            id: item?.id || '',
            name: item?.name || 'Unknown',
            opening: stockItem.openingStock,
            sold,
            closing: closingStock,
        };
    });
  }, [stock, items, getSalesByItem]);

  const salesSummary = getSalesByItem();
  const stockSummary = getStockSummary();

  const totalRevenue = sales ? sales.reduce((acc, sale) => acc + (sale.quantity * (items.find(i => i.id === sale.itemId)?.unitPrice || 0)), 0) : 0;
  const totalItemsSold = sales ? sales.reduce((acc, sale) => acc + sale.quantity, 0) : 0;

  const bestSeller = salesSummary.length > 0 ? salesSummary.reduce((max, item) => item.quantity > max.quantity ? item : max) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <NairaIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">
              ₦{totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Today's total sales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">{totalItemsSold}</div>
            <p className="text-xs text-muted-foreground">
              Total items sold today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Best Seller</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-headline">
              {bestSeller ? bestSeller.name : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Top-selling item today
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock Summary</CardTitle>
          </CardHeader>
          <CardContent className='overflow-x-auto max-h-[356px]'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Opening</TableHead>
                  <TableHead className="text-right">Sold</TableHead>
                  <TableHead className="text-right">Closing</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockSummary.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
                    <TableCell className="text-right">{item.opening}</TableCell>
                    <TableCell className="text-right">{item.sold}</TableCell>
                    <TableCell className="text-right">{item.closing}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
