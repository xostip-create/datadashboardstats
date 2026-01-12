'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/logo';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection } from '@/firebase';
import { useMemoFirebase, useFirestore } from '@/firebase/provider';
import { collection, query, where } from 'firebase/firestore';
import type { Item, Sale, StockLevel } from '@/lib/data';
import { Package, ShoppingBag } from 'lucide-react';

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

function FormattedTime({ date }: { date: any }) {
    const [time, setTime] = React.useState('');
    React.useEffect(() => {
        if (date) {
            const d = date.toDate ? date.toDate() : new Date(date);
            setTime(d.toLocaleTimeString());
        }
    }, [date]);
    return <>{time}</>;
}

export default function RecordsPage() {
  const router = useRouter();
  const firestore = useFirestore();

  const itemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'items');
  }, [firestore]);
  const { data: items } = useCollection<Item>(itemsQuery);

  const salesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sales');
  }, [firestore]);
  const { data: sales } = useCollection<Sale>(salesQuery);
  
  const stockLevelsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'stockLevels');
  }, [firestore]);
  const { data: stock } = useCollection<StockLevel>(stockLevelsQuery);


  const getSalesByItem = React.useCallback(() => {
    if (!sales || !items) return [];
    const salesByItem = new Map<string, { quantity: number; total: number }>();
    for (const sale of sales) {
      const item = items.find(i => i.id === sale.itemId);
      const saleTotal = item ? sale.quantity * item.unitPrice : 0;
      const existing = salesByItem.get(sale.itemId) || { quantity: 0, total: 0 };
      salesByItem.set(sale.itemId, {
        quantity: existing.quantity + sale.quantity,
        total: existing.total + saleTotal,
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
      
      const salesMap = new Map<string, number>();
      if (sales) {
          for (const sale of sales) {
              const current = salesMap.get(sale.itemId) || 0;
              salesMap.set(sale.itemId, current + sale.quantity);
          }
      }

      return items.map(item => {
          const stockItem = stock.find(s => s.itemId === item.id);
          const opening = stockItem?.quantity || 0;
          const sold = salesMap.get(item.id) || 0;
          const closing = opening - sold;
          return {
              id: item.id,
              name: item.name,
              opening: opening,
              sold: sold,
              closing: closing,
          };
      });
  }, [stock, items, sales, getSalesByItem]);

  const salesSummary = getSalesByItem();
  const stockSummary = getStockSummary();

  const totalRevenue = sales ? sales.reduce((acc, sale) => acc + (sale.quantity * (items?.find(i => i.id === sale.itemId)?.unitPrice || 0)), 0) : 0;
  const totalItemsSold = sales ? sales.reduce((acc, sale) => acc + sale.quantity, 0) : 0;
  const bestSeller = salesSummary.length > 0 ? salesSummary.reduce((max, item) => item.quantity > max.quantity ? item : max) : null;


  return (
    <div className="container mx-auto p-4 sm:p-6">
      <header className="flex items-center justify-between py-4">
        <Logo />
        <Button variant="outline" onClick={() => router.push('/login')}>
          Admin Login
        </Button>
      </header>
      <main className="mt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
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

        <Tabs defaultValue="sales">
          <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger value="sales">Sales Records</TabsTrigger>
            <TabsTrigger value="stock">Stock Summary</TabsTrigger>
          </TabsList>
          <TabsContent value="sales" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Sales Records</CardTitle>
                <CardDescription>
                  A public view of all sales transactions.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Total Price</TableHead>
                      <TableHead className="text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sales?.sort((a, b) => (b.saleDate?.toMillis() ?? 0) - (a.saleDate?.toMillis() ?? 0)).map((sale) => {
                      const item = items?.find((i) => i.id === sale.itemId);
                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium whitespace-nowrap">
                            {item?.name || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-right">
                            {sale.quantity}
                          </TableCell>
                          <TableCell className="text-right whitespace-nowrap">
                            ₦{(sale.quantity * (item?.unitPrice || 0)).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <FormattedTime date={sale.saleDate} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="stock" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Stock Summary</CardTitle>
                <CardDescription>
                  A public view of daily stock levels and discrepancies.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
