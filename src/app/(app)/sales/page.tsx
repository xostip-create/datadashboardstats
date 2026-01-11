'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronsUpDown, PlusCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { useDataContext } from '@/lib/data-provider';
import type { Item, Sale } from '@/lib/data';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useFirestore } from '@/firebase';
import { addDoc, collection, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';


const salesFormSchema = z.object({
  itemId: z.string().min(1, 'Please select an item.'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
});

type SalesFormValues = z.infer<typeof salesFormSchema>;

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
  const { items, sales } = useDataContext();
  const firestore = useFirestore();
  const [isPopoverOpen, setPopoverOpen] = React.useState(false);
  const [isSaleModalOpen, setSaleModalOpen] = React.useState(false);

  const [editingSale, setEditingSale] = React.useState<Sale | null>(null);

  const salesForm = useForm<SalesFormValues>({
    resolver: zodResolver(salesFormSchema),
    defaultValues: {
      itemId: '',
      quantity: 1,
    },
  });

  React.useEffect(() => {
    if (editingSale) {
        salesForm.setValue('itemId', editingSale.itemId);
        salesForm.setValue('quantity', editingSale.quantity);
        setSaleModalOpen(true);
    } else {
        salesForm.reset({ itemId: '', quantity: 1 });
    }
  }, [editingSale, salesForm]);


  async function onSaleSubmit(data: SalesFormValues) {
    if(!firestore || !items) return;
    const item = items.find((i) => i.id === data.itemId);
    if (!item) return;

    try {
        if (editingSale) {
            // Update existing sale
            const saleRef = doc(firestore, 'sales', editingSale.id);
            await updateDoc(saleRef, {
                itemId: data.itemId,
                quantity: data.quantity,
            });

            toast({
                title: 'Sale Updated',
                description: `Sale record for ${item.name} has been updated.`,
            });
        } else {
            // Create new sale
            const salesCollection = collection(firestore, 'sales');
            await addDoc(salesCollection, {
                itemId: data.itemId,
                quantity: data.quantity,
                saleDate: serverTimestamp(),
            });

            toast({
              title: 'Sale Recorded',
              description: `${data.quantity} x ${item.name} added.`,
            });
        }
        salesForm.reset({ itemId: '', quantity: 1 });
        setEditingSale(null);
        setSaleModalOpen(false);
    } catch(e: any) {
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: e.message || "Could not save sale.",
        });
    }
  }

  async function handleDeleteSale(saleId: string) {
    if(!firestore) return;
    try {
        const saleRef = doc(firestore, 'sales', saleId);
        await deleteDoc(saleRef);
        toast({
            title: 'Sale Deleted',
            description: 'The sale record has been removed.',
            variant: 'destructive'
        });
    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: e.message || "Could not delete sale.",
        });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Log a New Sale</CardTitle>
          <CardDescription>
            Select an item and enter the quantity sold.
          </CardDescription>
        </CardHeader>
        <CardContent>
           <Dialog open={isSaleModalOpen} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setEditingSale(null);
                }
                setSaleModalOpen(isOpen);
            }}>
            <DialogTrigger asChild>
                <Button>
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Sale
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{editingSale ? 'Edit Sale' : 'Log a New Sale'}</DialogTitle>
                    <DialogDescription>
                        {editingSale ? 'Update the details for this sale.' : 'Select an item and enter the quantity sold.'}
                    </DialogDescription>
                </DialogHeader>
                 <Form {...salesForm}>
                    <form onSubmit={salesForm.handleSubmit(onSaleSubmit)} className="flex flex-col gap-4">
                       <FormField
                        control={salesForm.control}
                        name="itemId"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Item</FormLabel>
                             <Popover open={isPopoverOpen} onOpenChange={setPopoverOpen}>
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
                                      : "Select an item to sell"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                <Command>
                                  <CommandInput placeholder="Search item..." />
                                  <CommandList>
                                    <CommandEmpty>No item found.</CommandEmpty>
                                    <CommandGroup>
                                      {items?.map((item) => (
                                        <CommandItem
                                          value={item.id}
                                          key={item.id}
                                          onSelect={(currentValue) => {
                                            salesForm.setValue("itemId", currentValue === field.value ? "" : currentValue)
                                            setPopoverOpen(false)
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
                        control={salesForm.control}
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
                       <DialogFooter>
                        <Button type="submit">
                            {editingSale ? 'Update Sale' : 'Add Sale'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
            </Dialog>
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
                    <TableCell className="text-right">₦{(sale.quantity * (item?.unitPrice || 0)).toFixed(2)}</TableCell>
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
                                <DropdownMenuItem onClick={() => setEditingSale(sale)}>
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
