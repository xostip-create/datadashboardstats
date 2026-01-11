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
import { getSalesByItem, getStockSummary, sales } from '@/lib/data';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

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
  const salesSummary = getSalesByItem();
  const stockSummary = getStockSummary();

  const totalRevenue = sales.reduce((acc, sale) => acc + sale.total, 0);
  const totalItemsSold = sales.reduce((acc, sale) => acc + sale.quantity, 0);
  const totalDiscrepancy = stockSummary.reduce((acc, item) => acc + item.discrepancy, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              {salesSummary.length > 0 ? salesSummary.reduce((max, item) => item.quantity > max.quantity ? item : max).name : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              Top-selling item today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Discrepancy</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={cn("text-2xl font-bold font-headline", totalDiscrepancy !== 0 ? 'text-destructive' : '')}>
                {totalDiscrepancy}
            </div>
            <p className="text-xs text-muted-foreground">
              Difference in expected vs. actual stock
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock Summary</CardTitle>
          </CardHeader>
          <CardContent className='overflow-auto max-h-[356px]'>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Open</TableHead>
                  <TableHead className="text-right">Sold</TableHead>
                  <TableHead className="text-right">Closing</TableHead>
                  <TableHead className="text-right">Diff</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stockSummary.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-right">{item.opening}</TableCell>
                    <TableCell className="text-right">{item.sold}</TableCell>
                    <TableCell className="text-right">{item.closing > 0 ? item.closing : '-'}</TableCell>
                    <TableCell className="text-right">
                       <Badge variant={item.discrepancy === 0 ? 'secondary' : 'destructive'} className='font-bold'>
                         {item.discrepancy}
                       </Badge>
                    </TableCell>
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
