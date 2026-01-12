'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Sale } from '@/lib/data';
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
import { useDataContext } from '@/lib/data-provider';
import { useFirestore } from '@/firebase';
import { doc, collection, serverTimestamp, writeBatch, deleteDoc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';


type SaleFormValues = z.infer<ReturnType<typeof getSaleFormSchema>>;

function getSaleFormSchema(stockData: { itemId: string; quantity: number }[]) {
  return z.object({
      itemId: z.string().min(1, 'Please select an item.'),
      quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
  }).refine((data) => {
      const stockItem = stockData.find(s => s.itemId === data.itemId);
      // If stock info isn't available yet, pass validation and check on submission.
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
  const firestore = useFirestore();
  const { toast } = useToast();
  const { items, sales, stock } = useDataContext();

  const [isConfirmingDelete, setIsConfirmingDelete] = React.useState(false);
  const [saleToDelete, setSaleToDelete] = React.useState<Sale | null>(null);

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
  }, [selectedItemId, form, stock]);


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

    if (data.quantity > stockItem.quantity) {
        form.setError("quantity", {
            type: "manual",
            message: "Quantity cannot exceed current stock.",
        });
        return;
    }

    const saleRef = doc(collection(firestore, "sales"));
    const stockRef = doc(firestore, "stockLevels", stockItem.id);
    const batch = writeBatch(firestore);

    batch.set(saleRef, {
        ...data,
        id: saleRef.id,
        saleDate: serverTimestamp()
    });

    const newQuantity = stockItem.quantity - data.quantity;
    batch.update(stockRef, { quantity: newQuantity });
    
    try {
      await batch.commit();
      toast({
        title: "Sale Logged",
        description: `Successfully recorded sale of ${data.quantity} unit(s).`,
      });
      form.reset();
    } catch(e: any) {
        toast({
            variant: "destructive",
            title: "Error",
            description: e.message || "Could not log the sale.",
        });
    }
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
    const saleRef = doc(firestore, 'sales', saleToDelete.id);

    try {
        if (stockItem) {
            const batch = writeBatch(firestore);
            const stockRef = doc(firestore, 'stockLevels', stockItem.id);
            const newQuantity = stockItem.quantity + saleToDelete.quantity;
            batch.update(stockRef, { quantity: newQuantity });
            batch.delete(saleRef);
            await batch.commit();
        } else {
            // If for some reason there is no stock item, just delete the sale
            await deleteDoc(saleRef);
        }
    } catch(e) {
      console.error("Failed to delete sale:", e);
    } finally {
      setIsConfirmingDelete(false);
      setSaleToDelete(null);
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select an item" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {items?.map((item) => (
                                <SelectItem key={item.id} value={item.id} disabled={(stock?.find(s => s.itemId === item.id)?.quantity || 0) === 0}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
                                    {selectedItemId && selectedItemStock !== undefined && (
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
              <AlertDialogAction onClick={handleConfirmDelete} className={cn(buttonVariants({ variant: "destructive" }))}>
                  Delete
              </AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
