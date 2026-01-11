'use client';

import * as React from 'react';
import { inventory, sales } from '@/lib/data';
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

export default function RecordsPage() {
  const router = useRouter();
  
  return (
    <div className="container mx-auto p-4 sm:p-6">
       <header className="flex items-center justify-between py-4">
        <Logo />
        <Button variant="outline" onClick={() => router.push('/login')}>
          Admin Login
        </Button>
      </header>
      <main className="mt-6">
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
                      <TableCell className="text-right">{sale.quantity}</TableCell>
                      <TableCell className="text-right">
                        ${sale.total.toFixed(2)}
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
      </main>
    </div>
  );
}
