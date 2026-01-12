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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useDataContext } from '@/lib/data-provider';
import { useFirestore } from '@/firebase';
import { doc, collection, serverTimestamp, writeBatch, deleteDoc } from 'firebase/firestore';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';


type SaleFormValues = z.infer<ReturnType<typeof getSaleFormSchema>>;

function getSaleFormSchema(stockData: { itemId: string; quantity: number }[]) {
    return z.object({
        itemId: z.string().min(1, 'Please select an item.'),
        quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
    }).refine((data) => {
        const stockItem = stockData.find(s => s.itemId === data.itemId);
        if (!stockItem) return true; 
        const availableStock = stockItem.quantity;
        return data.quantity <= availableStock;
    }, {
        message: "Quantity cannot exceed current stock.",
        path: ["quantity"],
    });
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

export default function SalesPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { items, sales, stock } = useDataContext();

  const [saleToDelete, setSaleToDelete] = React.useState<Sale | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);


  const saleFormSchema = React.useMemo(() => {
    const stockData = stock ? stock.map(s => ({ itemId: s.itemId, quantity: s.quantity })) : [];
    return getSaleFormSchema(stockData);
  }, [stock]);

  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      itemId: '',
      quantity: 1,
    },
  });
  
  const selectedItemId = form.watch('itemId');
  React.useEffect(() => {
    if (selectedItemId) {
        form.trigger('quantity');
    }
  }, [selectedItemId, form]);


  async function onSubmit(data: SaleFormValues) {
    if (!firestore) return;

    const stockItem = stock?.find(s => s.itemId === data.itemId);

    if (!stockItem) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Stock information for this item not found.",
        });
        return;
    }

    const saleRef = doc(collection(firestore, "sales"));
    const batch = writeBatch(firestore);

    batch.set(saleRef, {
        ...data,
        id: saleRef.id,
        saleDate: serverTimestamp()
    });

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

  const handleDeleteRequest = (sale: Sale) => {
    setSaleToDelete(sale);
    setIsConfirmingDelete(true);
  };

  const handleCancelDelete = () => {
    setSaleToDelete(null);
    setIsConfirmingDelete(false);
  };
  
  const handleConfirmDelete = async () => {
    if (!saleToDelete || !firestore) return;

    const stockItem = stock?.find(s => s.itemId === saleToDelete.itemId);
    if (!stockItem) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Could not find stock to return for this sale.",
        });
        setSaleToDelete(null);
        setIsConfirmingDelete(false);
        return;
    }

    const batch = writeBatch(firestore);
    const saleRef = doc(firestore, 'sales', saleToDelete.id);
    batch.delete(saleRef);
    
    const stockRef = doc(firestore, 'stockLevels', stockItem.id);
    const newQuantity = stockItem.quantity + saleToDelete.quantity;
    batch.update(stockRef, { quantity: newQuantity });

    try {
      await batch.commit();
      toast({
          title: 'Sale Deleted',
          description: 'The sale record has been removed and stock was returned.',
          variant: 'destructive'
      });
    } catch(e) {
      console.error("Failed to delete sale:", e)
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete the sale record.",
      });
    } finally {
      setSaleToDelete(null);
      setIsConfirmingDelete(false);
    }
  };

  const selectedItemStock = stock?.find(s => s.itemId === form.watch('itemId'))?.quantity;

  return (
    <div className="flex flex-col gap-6">
       <Card>
        <CardHeader>
            <CardTitle>Log a New Sale</CardTitle>
            <CardDescription>Select an item and enter the quantity sold.</CardDescription>
        </CardHeader>
        <CardContent>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row items-start gap-4">
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
                                <FormLabel>
                                    Quantity
                                    {selectedItemStock !== undefined && (
                                        <span className="text-muted-foreground text-xs ml-2">
                                            (In Stock: {selectedItemStock})
                                        </span>
                                    )}
                                </FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="1" {...field} className="w-32"/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <div className="self-end h-full pb-1">
                        <Button type="submit">Add Sale</Button>
                    </div>
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
                                <DropdownMenuItem onClick={() => handleDeleteRequest(sale)} className="text-destructive hover:!text-destructive focus:!text-destructive">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
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

       <AlertDialog open={isConfirmingDelete} onOpenChange={setIsConfirmingDelete}>
          <AlertDialogContent>
              <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this sale record and return the stock.
              </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelDelete}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmDelete} variant="destructive">
                  Delete
              </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
