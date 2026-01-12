'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MoreHorizontal, Pencil, Trash2, ChevronsUpDown, Check } from 'lucide-react';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDataContext } from '@/lib/data-provider';
import { useFirestore } from '@/firebase';
import { doc, deleteDoc, addDoc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

const saleFormSchema = z.object({
  itemId: z.string().min(1, 'Please select an item.'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
});

type SaleFormValues = z.infer<typeof saleFormSchema>;

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
  const { items, sales, stock } = useDataContext();

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      itemId: '',
      quantity: 1,
    },
  });

  async function onSubmit(data: SaleFormValues) {
    if (!firestore) return;

    const saleRef = doc(collection(firestore, "sales"));
    const stockItem = stock?.find(s => s.itemId === data.itemId);

    if (!stockItem) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Stock information for this item not found.",
        });
        return;
    }

    const batch = writeBatch(firestore);

    // 1. Add the sale
    batch.set(saleRef, {
        ...data,
        id: saleRef.id,
        saleDate: serverTimestamp()
    });

    // 2. Update the stock level
    const stockRef = doc(firestore, "stockLevels", stockItem.id);
    const newQuantity = stockItem.quantity - data.quantity;
    batch.update(stockRef, { quantity: newQuantity });
    

    await batch.commit();
    toast({
        title: "Sale Logged",
        description: `Successfully logged sale.`,
    });
    form.reset();
  }

  async function handleDeleteSale(sale: Sale) {
    if (!firestore) return;

    const stockItem = stock?.find(s => s.itemId === sale.itemId);
    if (!stockItem) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not find stock to return for this sale.",
        });
        return;
    }

    const batch = writeBatch(firestore);

    // Delete sale
    const saleRef = doc(firestore, 'sales', sale.id);
    batch.delete(saleRef);

    // Return stock
    const stockRef = doc(firestore, 'stockLevels', stockItem.id);
    const newQuantity = stockItem.quantity + sale.quantity;
    batch.update(stockRef, { quantity: newQuantity });

    await batch.commit();

    toast({
        title: 'Sale Deleted',
        description: 'The sale record has been removed and stock was returned.',
        variant: 'destructive'
    });
  }

  return (
    <div className="flex flex-col gap-6">
       <Card>
        <CardHeader>
            <CardTitle>Log a New Sale</CardTitle>
            <CardDescription>Select an item and enter the quantity sold.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row items-end gap-4">
                    <FormField
                        control={form.control}
                        name="itemId"
                        render={({ field }) => (
                            <FormItem className="flex-1 w-full sm:w-auto">
                                <FormLabel>Item</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                            "w-full justify-between",
                                            !field.value && "text-muted-foreground"
                                            )}
                                        >
                                            {field.value
                                            ? items?.find(
                                                (item) => item.id === field.value
                                                )?.name
                                            : "Select item"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-full p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search item..." />
                                            <CommandList>
                                                <CommandEmpty>No item found.</CommandEmpty>
                                                <CommandGroup>
                                                    {items?.map((item) => (
                                                    <CommandItem
                                                        value={item.name}
                                                        key={item.id}
                                                        onSelect={() => {
                                                            form.setValue("itemId", item.id)
                                                        }}
                                                    >
                                                        <Check
                                                            className={cn(
                                                                "mr-2 h-4 w-4",
                                                                item.id === field.value
                                                                ? "opacity-100"
                                                                : "opacity-0"
                                                            )}
                                                        />
                                                        {item.name}
                                                    </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Quantity</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="1" {...field} className="w-24"/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button type="submit">Add Sale</Button>
                </form>
            </Form>
        </CardContent>
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
                                <DropdownMenuItem disabled>
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
                                            This action cannot be undone. This will permanently delete this sale record and return the stock.
                                        </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteSale(sale)} variant="destructive">
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
