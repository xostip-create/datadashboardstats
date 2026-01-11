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
  
  const today = new Date().toISOString().split('T')[0];
  const stockLevelsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'stockLevels'), where('date', '==', today));
  }, [firestore, today]);
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
      return stock.map(stockItem => {
          const item = items.find(i => i.id === stockItem.itemId);
          const saleInfo = salesByItem.find(s => s.name === item?.name);
          const sold = saleInfo?.quantity || 0;
          const expected = stockItem.openingStock - sold;
          const discrepancy = stockItem.closingStock - expected;
  
          return {
              id: item?.id || '',
              name: item?.name || 'Unknown',
              opening: stockItem.openingStock,
              sold,
              expected,
              closing: stockItem.closingStock,
              discrepancy,
          };
      });
  }, [stock, items, getSalesByItem]);

  const stockSummary = getStockSummary();


  return (
    <div className="container mx-auto p-4 sm:p-6">
      <header className="flex items-center justify-between py-4">
        <Logo />
        <Button variant="outline" onClick={() => router.push('/login')}>
          Admin Login
        </Button>
      </header>
      <main className="mt-6">
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
                    {sales?.map((sale) => {
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
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Closing</TableHead>
                      <TableHead className="text-right">Discrepancy</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockSummary.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
                        <TableCell className="text-right">{item.opening}</TableCell>
                        <TableCell className="text-right">{item.sold}</TableCell>
                        <TableCell className="text-right">{item.expected}</TableCell>
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
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
