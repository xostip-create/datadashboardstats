'use client';

import * as React from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  MoreHorizontal,
  PlusCircle,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { Item, StockLevel } from '@/lib/data';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useDataContext } from '@/lib/data-provider';
import { useFirestore } from '@/firebase';
import { collection, doc, writeBatch, updateDoc, deleteDoc, getDocs, query, where } from 'firebase/firestore';

const itemFormSchema = z.object({
  name: z.string().min(1, 'Item name is required.'),
  unitPrice: z.coerce.number().min(0.01, 'Price must be greater than 0.'),
  quantity: z.coerce.number().min(0, 'Quantity cannot be negative.'),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

export default function ItemsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  const { items, stock } = useDataContext();

  const [editingItem, setEditingItem] = React.useState<(Item & { stockId?: string, quantity?: number }) | null>(null);
  const [isModalOpen, setModalOpen] = React.useState(false);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      name: '',
      unitPrice: 0,
      quantity: 0,
    },
  });

  const handleEdit = (item: Item) => {
    const stockItem = stock?.find(s => s.itemId === item.id);
    setEditingItem({
        ...item,
        stockId: stockItem?.id,
        quantity: stockItem?.quantity || 0
    });
  }

  React.useEffect(() => {
    if (editingItem) {
        form.setValue('name', editingItem.name);
        form.setValue('unitPrice', editingItem.unitPrice);
        form.setValue('quantity', editingItem.quantity || 0);
        setModalOpen(true);
    } else {
        form.reset({ name: '', unitPrice: 0, quantity: 0 });
    }
  }, [editingItem, form]);

  const onSubmit = async (data: ItemFormValues) => {
    if (!firestore) return;
    if (editingItem) {
      // Update item and stock
      const itemRef = doc(firestore, 'items', editingItem.id);
      const batch = writeBatch(firestore);

      batch.update(itemRef, {
        name: data.name,
        unitPrice: data.unitPrice,
      });

      if(editingItem.stockId) {
        const stockRef = doc(firestore, 'stockLevels', editingItem.stockId);
        batch.update(stockRef, {
            quantity: data.quantity
        });
      } else {
        // This case should ideally not happen if stock is created with item
        const stockRef = doc(collection(firestore, 'stockLevels'));
        batch.set(stockRef, {
            id: stockRef.id,
            itemId: editingItem.id,
            quantity: data.quantity
        });
      }


      await batch.commit();

      toast({
        title: 'Item Updated',
        description: `${data.name} has been updated.`,
      });
    } else {
      // Create new item
      const newItemRef = doc(collection(firestore, 'items'));
      const newStockRef = doc(collection(firestore, 'stockLevels'));

      const batch = writeBatch(firestore);

      batch.set(newItemRef, {
        id: newItemRef.id,
        name: data.name,
        unitPrice: data.unitPrice,
      });

      batch.set(newStockRef, {
          id: newStockRef.id,
          itemId: newItemRef.id,
          quantity: data.quantity,
      });

      await batch.commit();
      
      toast({
        title: 'Item Created',
        description: `${data.name} has been added to the inventory.`,
      });
    }
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!firestore) return;

    const batch = writeBatch(firestore);
    
    // Delete item
    const itemRef = doc(firestore, 'items', itemId);
    batch.delete(itemRef);

    // Find and delete associated stock level
    const stockQuery = query(collection(firestore, 'stockLevels'), where('itemId', '==', itemId));
    const stockSnapshot = await getDocs(stockQuery);
    stockSnapshot.forEach(doc => {
        batch.delete(doc.ref);
    });

    await batch.commit();

    toast({
      title: 'Item Deleted',
      description: 'The item has been removed from inventory.',
      variant: 'destructive',
    });
  };

  if (!isMounted) {
    return null;
  }

  const getItemStock = (itemId: string) => {
    return stock?.find(s => s.itemId === itemId)?.quantity || 0;
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <div>
            <CardTitle>Manage Inventory Items</CardTitle>
            <CardDescription>
              View, create, and manage your bar's items and stock levels.
            </CardDescription>
          </div>
          <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
                if (!isOpen) {
                    setEditingItem(null);
                }
                setModalOpen(isOpen);
            }}>
            <DialogTrigger asChild>
              <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Item
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>{editingItem ? 'Edit Item' : 'Create New Item'}</DialogTitle>
                <DialogDescription>
                  {editingItem ? 'Update the details for this item.' : "Add a new item to your inventory. Click save when you're done."}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
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
                    control={form.control}
                    name="unitPrice"
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
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantity</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <DialogFooter>
                    <Button type="submit">{editingItem ? 'Save Changes' : 'Save Item'}</Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead className="text-right">Current Stock</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="w-[50px]"><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium whitespace-nowrap flex items-center gap-3">
                    {item.name}
                  </TableCell>
                  <TableCell className="text-right">{getItemStock(item.id)}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">₦{item.unitPrice.toFixed(2)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(item)}>
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
                                    This action cannot be undone. This will permanently delete the item and its associated stock records.
                                </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteItem(item.id)} variant="destructive">
                                    Delete
                                </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>

                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
