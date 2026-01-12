'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Check,
  ChevronsUpDown,
  MoreHorizontal,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

import { useDataContext } from '@/lib/data-provider';
import type { Item, Sale } from '@/lib/data';
import { useFirestore } from '@/firebase';
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  deleteDoc,
  updateDoc,
} from 'firebase/firestore';
import { cn } from '@/lib/utils';

export default function SalesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { items, sales, stock } = useDataContext();

  const [isMounted, setIsMounted] = React.useState(false);
  const [deleteSaleId, setDeleteSaleId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const getSaleFormSchema = () => {
    return z.object({
      itemId: z.string({ required_error: 'Please select an item.' }),
      quantity: z.coerce
        .number()
        .min(1, 'Quantity must be at least 1.'),
    }).superRefine((data, ctx) => {
        if (data.itemId) {
            const stockItem = stock?.find(s => s.itemId === data.itemId);
            const availableStock = stockItem?.quantity || 0;
            if (data.quantity > availableStock) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: `Not enough stock. Only ${availableStock} available.`,
                    path: ['quantity'],
                });
            }
        }
    });
  }

  const form = useForm<z.infer<ReturnType<typeof getSaleFormSchema>>>({
    resolver: zodResolver(getSaleFormSchema()),
    defaultValues: {
      itemId: '',
      quantity: 1,
    },
  });

  // We need to re-create the resolver when stock data changes
  React.useEffect(() => {
    form.trigger();
  }, [stock, form]);

  const onSubmit = async (data: z.infer<ReturnType<typeof getSaleFormSchema>>) => {
    if (!firestore) return;

    const saleRef = doc(collection(firestore, 'sales'));
    const stockItem = stock?.find(s => s.itemId === data.itemId);

    if (!stockItem) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not find stock for the selected item."
        });
        return;
    }

    const newStockQuantity = stockItem.quantity - data.quantity;
    const stockRef = doc(firestore, 'stockLevels', stockItem.id);

    const batch = writeBatch(firestore);

    batch.set(saleRef, {
        id: saleRef.id,
        itemId: data.itemId,
        quantity: data.quantity,
        saleDate: serverTimestamp(),
    });

    batch.update(stockRef, { quantity: newStockQuantity });

    try {
        await batch.commit();
        toast({
            title: 'Sale Logged',
            description: `A new sale has been successfully recorded.`,
        });
        form.reset();
        // Manually reset combobox trigger
        const trigger = document.querySelector('#item-combobox-trigger');
        if (trigger) {
          trigger.textContent = 'Select item';
        }

    } catch(error: any) {
        toast({
            variant: "destructive",
            title: "Error Logging Sale",
            description: error.message || "An unexpected error occurred."
        });
    }
  };

  const handleDeleteSale = async (sale: Sale) => {
    if (!firestore) return;

    const saleRef = doc(firestore, 'sales', sale.id);
    const stockItem = stock?.find(s => s.itemId === sale.itemId);

    const batch = writeBatch(firestore);
    batch.delete(saleRef);
    
    // Add the quantity back to stock
    if (stockItem) {
        const stockRef = doc(firestore, 'stockLevels', stockItem.id);
        const newStockQuantity = stockItem.quantity + sale.quantity;
        batch.update(stockRef, { quantity: newStockQuantity });
    }
    
    try {
        await batch.commit();
    } catch(error: any) {
         toast({
            variant: "destructive",
            title: "Error Deleting Sale",
            description: error.message || "An unexpected error occurred."
        });
    } finally {
        setDeleteSaleId(null);
    }
  };
  
  if (!isMounted) {
    return null; // Or a loading skeleton
  }

  const getItemName = (itemId: string) => items?.find(i => i.id === itemId)?.name || 'Unknown Item';

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Log a New Sale</CardTitle>
          <CardDescription>Select an item and enter the quantity sold.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
              <FormField
                control={form.control}
                name="itemId"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Item</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            id="item-combobox-trigger"
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? items?.find(item => item.id === field.value)?.name
                              : "Select item"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search items..." />
                          <CommandList>
                            <CommandEmpty>No items found.</CommandEmpty>
                            <CommandGroup>
                              {items?.map((item) => (
                                <CommandItem
                                  value={item.name}
                                  key={item.id}
                                  onSelect={(currentValue) => {
                                    const selectedItem = items.find(i => i.name.toLowerCase() === currentValue.toLowerCase());
                                    if(selectedItem) {
                                      form.setValue("itemId", selectedItem.id);
                                      form.trigger("quantity"); // Re-validate quantity on item change
                                    }
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
                      <Input type="number" placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="sm:pt-8">
                 <Button type="submit" className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Add Sale
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Today's Sales</CardTitle>
          <CardDescription>A list of all sales recorded today.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sales?.sort((a,b) => b.saleDate?.toMillis() - a.saleDate?.toMillis()).map((sale) => {
                const item = items?.find(i => i.id === sale.itemId);
                return (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium whitespace-nowrap">{item?.name || 'Unknown'}</TableCell>
                    <TableCell className="text-right">{sale.quantity}</TableCell>
                    <TableCell className="text-right">₦{(sale.quantity * (item?.unitPrice || 0)).toFixed(2)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            className="text-destructive hover:!text-destructive"
                            onSelect={() => setDeleteSaleId(sale.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteSaleId} onOpenChange={(open) => !open && setDeleteSaleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the sale record and return the sold quantity back to stock.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              onClick={() => {
                const saleToDelete = sales?.find(s => s.id === deleteSaleId);
                if (saleToDelete) {
                  handleDeleteSale(saleToDelete);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
