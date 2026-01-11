'use client';

import * as React from 'react';
import { getStockSummary, inventory, sales } from '@/lib/data';
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

export default function RecordsPage() {
  const router = useRouter();
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
              <CardContent>
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
                    {sales.map((sale) => {
                      const item = inventory.find((i) => i.id === sale.itemId);
                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-medium">
                            {item?.name || 'Unknown'}
                          </TableCell>
                          <TableCell className="text-right">
                            {sale.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            ₦{sale.total.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            {sale.timestamp.toLocaleTimeString()}
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
              <CardContent>
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
                        <TableCell className="font-medium">{item.name}</TableCell>
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
