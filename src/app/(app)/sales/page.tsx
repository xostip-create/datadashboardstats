'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronsUpDown, PlusCircle, Beer, Wine, GlassWater, Beef, Bot } from 'lucide-react';

import { inventory, sales } from '@/lib/data';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const salesFormSchema = z.object({
  itemId: z.string().min(1, 'Please select an item.'),
  quantity: z.coerce.number().min(1, 'Quantity must be at least 1.'),
});

type SalesFormValues = z.infer<typeof salesFormSchema>;

const newItemSchema = z.object({
    name: z.string().min(1, 'Item name is required.'),
    price: z.coerce.number().min(0.01, 'Price must be greater than 0.'),
    category: z.enum(['Drinks', 'Food']),
});

type NewItemFormValues = z.infer<typeof newItemSchema>;

function FormattedTime({ date }: { date: Date }) {
    const [time, setTime] = React.useState('');
    React.useEffect(() => {
        if (date) {
            setTime(date.toLocaleTimeString());
        }
    }, [date]);
    return <>{time}</>;
}


export default function SalesPage() {
  const { toast } = useToast();
  const [salesData, setSalesData] = React.useState<Sale[]>(sales);
  const [inventoryData, setInventoryData] = React.useState<Item[]>(inventory);
  const [isItemDialogOpen, setItemDialogOpen] = React.useState(false);
  const [isPopoverOpen, setPopoverOpen] = React.useState(false);

  const salesForm = useForm<SalesFormValues>({
    resolver: zodResolver(salesFormSchema),
    defaultValues: {
      itemId: '',
      quantity: 1,
    },
  });

  const newItemForm = useForm<NewItemFormValues>({
    resolver: zodResolver(newItemSchema),
    defaultValues: {
        name: '',
        price: 0,
        category: 'Drinks',
    },
  });

  function onSaleSubmit(data: SalesFormValues) {
    const item = inventoryData.find((i) => i.id === data.itemId);
    if (!item) return;

    const newSale: Sale = {
      id: `sale-${Date.now()}`,
      itemId: data.itemId,
      quantity: data.quantity,
      total: item.price * data.quantity,
      timestamp: new Date(),
    };

    setSalesData((prev) => [newSale, ...prev]);

    toast({
      title: 'Sale Recorded',
      description: `${data.quantity} x ${item.name} added.`,
    });

    salesForm.reset();
  }

  const iconMap = { Beer, Wine, GlassWater, Beef, Bot };

  function onNewItemSubmit(data: NewItemFormValues) {
    const newId = `item-${Date.now()}`;
    const newItem: Item = {
        id: newId,
        name: data.name,
        price: data.price,
        category: data.category,
        icon: data.category === 'Drinks' ? Bot : Beef, // Default icons
    };
    setInventoryData(prev => [...prev, newItem]);
    toast({
        title: 'Item Created',
        description: `${newItem.name} has been added to the inventory.`
    });
    newItemForm.reset();
    setItemDialogOpen(false);
    salesForm.setValue('itemId', newId);
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
          <Form {...salesForm}>
            <form onSubmit={salesForm.handleSubmit(onSaleSubmit)} className="flex flex-col md:flex-row items-end gap-4">
               <FormField
                control={salesForm.control}
                name="itemId"
                render={({ field }) => (
                  <FormItem className="flex-1 w-full">
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
                              ? inventoryData.find(
                                  (item) => item.id === field.value
                                )?.name
                              : "Select an item to sell"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Search item..." />
                          <CommandList>
                            <CommandEmpty>No item found.</CommandEmpty>
                            <CommandGroup>
                              {inventoryData.map((item) => (
                                <CommandItem
                                  value={item.name}
                                  key={item.id}
                                  onSelect={() => {
                                    salesForm.setValue("itemId", item.id)
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
                  <FormItem className='w-full md:max-w-[120px]'>
                    <FormLabel>Quantity</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex w-full flex-col sm:flex-row md:w-auto gap-2">
                 <Dialog open={isItemDialogOpen} onOpenChange={setItemDialogOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className='w-full'>
                            <PlusCircle className="mr-2 h-4 w-4" /> Create Item
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                            <DialogTitle>Create New Item</DialogTitle>
                            <DialogDescription>
                                Add a new item to your inventory. Click save when you're done.
                            </DialogDescription>
                        </DialogHeader>
                        <Form {...newItemForm}>
                            <form onSubmit={newItemForm.handleSubmit(onNewItemSubmit)} className="space-y-4">
                                <FormField
                                    control={newItemForm.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Item Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="e.g. Craft Lager" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={newItemForm.control}
                                    name="price"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Price</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="0.00" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={newItemForm.control}
                                    name="category"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Category</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                        <SelectValue placeholder="Select a category" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="Drinks">Drinks</SelectItem>
                                                        <SelectItem value="Food">Food</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <DialogFooter>
                                    <Button type="submit">Save Item</Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
                <Button type="submit" className="w-full">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add Sale
                </Button>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesData.map((sale) => {
                const item = inventoryData.find((i) => i.id === sale.itemId);
                return (
                  <TableRow key={sale.id}>
                    <TableCell className="font-medium whitespace-nowrap">{item?.name || 'Unknown'}</TableCell>
                    <TableCell className="text-right">{sale.quantity}</TableCell>
                    <TableCell className="text-right">₦{sale.total.toFixed(2)}</TableCell>
                    <TableCell className="text-right">
                      <FormattedTime date={sale.timestamp} />
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