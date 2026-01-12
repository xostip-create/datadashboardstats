'use client';

import * as React from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Sale } from '@/lib/data';
import { Button } from '@/components/ui/button';
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

import { useToast } from '@/hooks/use-toast';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDataContext } from '@/lib/data-provider';
import { useFirestore } from '@/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';


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


export default function SalesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { items, sales } = useDataContext();
  
  const [editingSale, setEditingSale] = React.useState<Sale | null>(null);


  async function handleDeleteSale(saleId: string) {
    if (!firestore) return;
    await deleteDoc(doc(firestore, 'sales', saleId));
    toast({
        title: 'Sale Deleted',
        description: 'The sale record has been removed.',
        variant: 'destructive'
    });
  }

  return (
    <div className="flex flex-col gap-6">
       <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Sales Management</CardTitle>
            <CardDescription>
              View and manage today's transaction history.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Today's Sales</CardTitle>
          <CardDescription>A list of all transactions for today.</CardDescription>
        </CardHeader>
        <CardContent className='overflow-x-auto'>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Total Price</TableHead>
                <TableHead className="text-right">Time</TableHead>
                <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales?.map((sale) => {
                const item = items?.find((i) => i.id === sale.itemId);
                return (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium whitespace-nowrap">{item?.name || 'Unknown'}</TableCell>
                    <TableCell className="text-right">{sale.quantity}</TableCell>
                    <TableCell className="text-right">₦{(item ? item.unitPrice * sale.quantity : 0).toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <FormattedTime date={sale.saleDate} />
                    </TableCell>
                    <TableCell>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                    <span className="sr-only">Open menu</span>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditingSale(sale)} disabled>
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                </DropdownMenuItem>
                                 <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" className="w-full justify-start text-sm text-destructive hover:text-destructive px-2 py-1.5 font-normal relative flex cursor-default select-none items-center rounded-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 hover:bg-destructive/10">
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          Delete
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone. This will permanently delete this sale record.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteSale(sale.id)} variant="destructive">
                                            Delete
                                        </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
