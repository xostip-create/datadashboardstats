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
import { Logo } from '@/components/logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCollection } from '@/firebase';
import { useMemoFirebase, useFirestore } from '@/firebase/provider';
import { collection, query, where } from 'firebase/firestore';
import type { Item, Sale, StockLevel } from '@/lib/data';
import { Package, Search, ShoppingBag } from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';
import { Input } from '@/components/ui/input';


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

export default function RecordsPage() {
  const firestore = useFirestore();

  const [salesSearchTerm, setSalesSearchTerm] = React.useState('');
  const [stockSearchTerm, setStockSearchTerm] = React.useState('');

  // Common queries
  const itemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'items');
  }, [firestore]);
  const { data: items } = useCollection<Item>(itemsQuery);

  const stockLevelsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'stockLevels');
  }, [firestore]);
  const { data: stock } = useCollection<StockLevel>(stockLevelsQuery);

  // Memoize today's date boundaries to prevent re-renders
  const { todayStart, todayEnd } = React.useMemo(() => {
    const now = new Date();
    return {
      todayStart: startOfDay(now),
      todayEnd: endOfDay(now),
    };
  }, []);


  const todaySalesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(
      collection(firestore, 'sales'),
      where('saleDate', '>=', todayStart),
      where('saleDate', '<=', todayEnd)
    );
  }, [firestore, todayStart, todayEnd]);
  const { data: todaySales } = useCollection<Sale>(todaySalesQuery);

  // Query for all sales (for history tab)
  const allSalesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sales');
  }, [firestore]);
  const { data: allSales } = useCollection<Sale>(allSalesQuery);

  const getSalesSummary = (salesData: Sale[] | null) => {
    if (!salesData || !items) return [];
    const salesByItem = new Map<string, { quantity: number; total: number }>();
    for (const sale of salesData) {
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
  };

  const getStockSummary = React.useCallback(() => {
      if (!stock || !items) return [];
      const salesMap = new Map<string, number>();
      if (todaySales) {
          for (const sale of todaySales) {
              const current = salesMap.get(sale.itemId) || 0;
              salesMap.set(sale.itemId, current + sale.quantity);
          }
      }

      return items.map(item => {
          const stockItem = stock.find(s => s.itemId === item.id);
          const opening = stockItem?.quantity || 0;
          const sold = salesMap.get(item.id) || 0;
          return { id: item.id, name: item.name, remaining: opening - sold };
      });
  }, [stock, items, todaySales]);
  
  const getSalesGroupedByDate = React.useCallback(() => {
    if (!allSales || !items) return {};
    return allSales.reduce((acc, sale) => {
        const itemName = items.find(i => i.id === sale.itemId)?.name || '';
        if (salesSearchTerm && !itemName.toLowerCase().includes(salesSearchTerm.toLowerCase())) {
          return acc;
        }

        const saleDate = sale.saleDate?.toDate ? sale.saleDate.toDate() : new Date(sale.saleDate);
        const dateKey = format(saleDate, 'yyyy-MM-dd');

        if (!acc[dateKey]) {
            acc[dateKey] = [];
        }
        acc[dateKey].push(sale);
        // Sort sales within the day
        acc[dateKey].sort((a, b) => (b.saleDate?.toMillis() ?? 0) - (a.saleDate?.toMillis() ?? 0));
        return acc;
    }, {} as Record<string, Sale[]>);
  }, [allSales, items, salesSearchTerm]);


  // Data for summary cards (today only)
  const todaySalesSummary = getSalesSummary(todaySales);
  const totalRevenueToday = todaySalesSummary.reduce((acc, item) => acc + item.total, 0);
  const totalItemsSoldToday = todaySalesSummary.reduce((acc, item) => acc + item.quantity, 0);
  const bestSellerToday = todaySalesSummary.length > 0 ? todaySalesSummary.reduce((max, item) => item.quantity > max.quantity ? item : max) : null;
  const currentDate = format(new Date(), 'MMMM d, yyyy');

  // Data for tables
  const stockSummary = React.useMemo(() => {
    const summary = getStockSummary();
    if (!stockSearchTerm) return summary;
    return summary.filter(item =>
      item.name.toLowerCase().includes(stockSearchTerm.toLowerCase())
    );
  }, [getStockSummary, stockSearchTerm]);
  
  const salesByDate = getSalesGroupedByDate();
  const sortedSaleDates = Object.keys(salesByDate).sort((a, b) => b.localeCompare(a));


  return (
    <div className="container mx-auto p-4 sm:p-6">
      <header className="flex items-center justify-between py-4">
        <Logo />
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
                  ₦{totalRevenueToday.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Sales for {currentDate}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
                <ShoppingBag className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-headline">{totalItemsSoldToday}</div>
                <p className="text-xs text-muted-foreground">
                  Total items sold on {currentDate}
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
                  {bestSellerToday ? bestSellerToday.name : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Top-selling item for {currentDate}
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
                <CardTitle>Sales History</CardTitle>
                <CardDescription>
                  A public view of all sales transactions, grouped by date.
                </CardDescription>
                <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search sales by item..."
                    className="pl-8 w-full sm:w-64"
                    value={salesSearchTerm}
                    onChange={(e) => setSalesSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                      <TableHead className="text-right">Total Price</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedSaleDates.length > 0 ? (
                        sortedSaleDates.map(date => (
                            <React.Fragment key={date}>
                                <TableRow className="bg-muted/50 hover:bg-muted/50">
                                    <TableCell colSpan={3} className="font-bold text-muted-foreground">
                                        {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                                    </TableCell>
                                </TableRow>
                                {salesByDate[date].map(sale => {
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
                                        </TableRow>
                                    );
                                })}
                            </React.Fragment>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={3} className="text-center text-muted-foreground">
                                {salesSearchTerm ? `No sales found for "${salesSearchTerm}"` : 'No sales recorded yet.'}
                            </TableCell>
                        </TableRow>
                    )}
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
                  A public view of remaining stock based on sales for {currentDate}.
                </CardDescription>
                 <div className="relative mt-2">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search stock by item..."
                    className="pl-8 w-full sm:w-64"
                    value={stockSearchTerm}
                    onChange={(e) => setStockSearchTerm(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Remaining Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockSummary.length > 0 ? (
                        stockSummary.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
                            <TableCell className="text-right">{item.remaining}</TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={2} className="text-center text-muted-foreground">
                                {stockSearchTerm ? `No stock found for "${stockSearchTerm}"` : 'No stock data available.'}
                            </TableCell>
                        </TableRow>
                    )}
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
