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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useFirestore } from '@/firebase';
import {
  collection,
  doc,
  writeBatch,
  serverTimestamp,
  deleteDoc,
  query,
  where,
  getDocs,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { startOfDay, endOfDay } from 'date-fns';
import type { Sale } from '@/lib/data';

export default function SalesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { items, sales, stock } = useDataContext();
  const [popoverOpen, setPopoverOpen] = React.useState(false);
  const [selectedItemStock, setSelectedItemStock] = React.useState<number | null>(null);

  const getSaleFormSchema = () => {
    return z.object({
      itemId: z.string({ required_error: 'Please select an item.' }),
      quantity: z.coerce
        .number()
        .min(1, 'Quantity must be at least 1.'),
    }).superRefine((data, ctx) => {
      if (data.itemId) {
        const salesOfItem = sales?.filter(s => s.itemId === data.itemId).reduce((acc, sale) => acc + sale.quantity, 0) || 0;
        const stockItem = stock?.find(s => s.itemId === data.itemId);
        const availableStock = (stockItem?.quantity || 0) - salesOfItem;
        
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

  const onSubmit = async (data: z.infer<ReturnType<typeof getSaleFormSchema>>) => {
    if (!firestore) return;
  
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
  
    const salesCollection = collection(firestore, 'sales');
    const q = query(salesCollection, 
        where('itemId', '==', data.itemId),
        where('saleDate', '>=', todayStart),
        where('saleDate', '<=', todayEnd)
    );
  
    try {
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        // Update existing sale
        const saleDoc = querySnapshot.docs[0];
        const existingQuantity = saleDoc.data().quantity || 0;
        await updateDoc(saleDoc.ref, {
          quantity: existingQuantity + data.quantity
        });
        toast({
          title: 'Sale Updated',
          description: `Quantity updated for the existing sale record.`,
        });
      } else {
        // Create new sale
        const saleRef = doc(collection(firestore, 'sales'));
        await setDoc(saleRef, {
          id: saleRef.id,
          itemId: data.itemId,
          quantity: data.quantity,
          saleDate: serverTimestamp(),
        });
        toast({
          title: 'Sale Logged',
          description: `A new sale has been successfully recorded.`,
        });
      }
  
      form.reset({ itemId: '', quantity: 1 });
      setSelectedItemStock(null);
  
    } catch(error: any) {
      console.error("Error logging sale:", error);
      toast({
        variant: "destructive",
        title: "Error Logging Sale",
        description: error.message || "An unexpected error occurred."
      });
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!firestore) return;
    
    if (window.confirm('Are you sure you want to delete this sale record for today?')) {
      const saleRef = doc(firestore, 'sales', saleId);
      try {
        await deleteDoc(saleRef);
        toast({
            title: 'Sale Deleted',
            description: 'The sale record for today has been removed.',
            variant: 'destructive',
        });
      } catch(error: any) {
        console.error("Error deleting sale:", error);
         toast({
            variant: "destructive",
            title: "Error Deleting Sale",
            description: error.message || "An unexpected error occurred."
        });
      }
    }
  };

  const todaySales = React.useMemo(() => {
    if (!sales) return [];
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    return sales.filter(sale => {
        const saleDate = sale.saleDate?.toDate ? sale.saleDate.toDate() : new Date(sale.saleDate);
        return saleDate >= todayStart && saleDate <= todayEnd;
    });
  }, [sales]);


  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Log a New Sale</CardTitle>
          <CardDescription>Select an item and enter the quantity sold.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-4 sm:items-start">
              <FormField
                control={form.control}
                name="itemId"
                render={({ field }) => (
                  <FormItem className="flex flex-col w-full sm:w-auto sm:flex-1">
                    <FormLabel>Item</FormLabel>
                    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
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
                                  onSelect={() => {
                                    form.setValue("itemId", item.id);
                                    form.trigger("quantity");
                                    const stockItem = stock?.find(s => s.itemId === item.id);
                                    const salesByItem = sales?.filter(s => s.itemId === item.id).reduce((acc, sale) => acc + sale.quantity, 0) || 0;
                                    setSelectedItemStock((stockItem?.quantity || 0) - salesByItem);
                                    setPopoverOpen(false);
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
                    {selectedItemStock !== null && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {selectedItemStock} in stock.
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem className='w-full sm:w-auto'>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="pt-0 sm:pt-6">
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
          <CardDescription>A consolidated list of all sales recorded today.</CardDescription>
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
              {todaySales?.sort((a,b) => (b.saleDate?.toMillis() ?? 0) - (a.saleDate?.toMillis() ?? 0)).map((sale) => {
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
                            onSelect={(e) => {
                                e.preventDefault();
                                handleDeleteSale(sale.id);
                            }}
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
    </div>
  );
}

    