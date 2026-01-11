'use client';

import * as React from 'react';
import { Save, Trash2 } from 'lucide-react';
import { useDataContext } from '@/lib/data-provider';
import type { StockLevel, Item } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useFirestore } from '@/firebase';
import { doc, writeBatch, deleteDoc } from 'firebase/firestore';

type StockInputProps = {
  stockData: StockLevel[];
  items: Item[];
  type: 'openingStock' | 'closingStock';
};

function StockInputTable({ items, stockData, type }: StockInputProps) {
  const { toast } = useToast();
  const firestore = useFirestore();
  const [localStock, setLocalStock] = React.useState<StockLevel[]>([]);

  React.useEffect(() => {
    if (stockData) {
      setLocalStock(JSON.parse(JSON.stringify(stockData)));
    }
  }, [stockData]);

  const handleStockChange = (stockId: string, value: string) => {
    const newStock = localStock.map((item) => {
      if (item.id === stockId) {
        return { ...item, [type]: Number(value) };
      }
      return item;
    });
    setLocalStock(newStock);
  };

  const handleSave = async () => {
    if (!firestore) return;
    const batch = writeBatch(firestore);
    localStock.forEach((stockItem) => {
        const stockRef = doc(firestore, 'stockLevels', stockItem.id);
        batch.update(stockRef, { [type]: stockItem[type] });
    });

    try {
        await batch.commit();
        toast({
          title: 'Stock Saved',
          description: `The ${type === 'openingStock' ? 'opening' : 'closing'} stock levels have been updated.`,
        });
    } catch(e: any) {
        toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: e.message || "Could not save stock levels.",
        });
    }
  };

  const onStockDelete = async (stockId: string) => {
      if (!firestore) return;
      try {
        await deleteDoc(doc(firestore, 'stockLevels', stockId));
        toast({
            title: 'Stock Record Deleted',
            description: 'The stock record has been removed.',
            variant: 'destructive',
        });
      } catch (e: any) {
          toast({
            variant: "destructive",
            title: "Uh oh! Something went wrong.",
            description: e.message || "Could not delete stock record.",
        });
      }
  }

  return (
    <Card>
       <CardHeader className='flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
        <div>
            <CardTitle>Update {type === 'openingStock' ? 'Opening' : 'Closing'} Stock</CardTitle>
            <CardDescription>Enter the stock count for each item.</CardDescription>
        </div>
        <Button onClick={handleSave} className="w-full sm:w-auto">
          <Save className="mr-2 h-4 w-4" /> Save {type === 'openingStock' ? 'Opening' : 'Closing'}
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[60%]'>Item</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="w-[50px]"><span className='sr-only'>Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localStock.map((stockItem) => {
              const item = items.find(
                (i: Item) => i.id === stockItem.itemId
              );
              return (
                <TableRow key={stockItem.id}>
                  <TableCell className="font-medium flex items-center gap-3 whitespace-nowrap">
                    {item?.name || 'Unknown'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      value={stockItem[type] > 0 ? stockItem[type] : ''}
                      onChange={(e) =>
                        handleStockChange(stockItem.id, e.target.value)
                      }
                      className="ml-auto max-w-[100px] text-right"
                      placeholder="0"
                    />
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                                <Trash2 className="h-4 w-4"/>
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete the stock record for this item.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => onStockDelete(stockItem.id)} variant="destructive">
                                     Delete
                                </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export default function StockPage() {
  const { items, stock } = useDataContext();

  if (!items || !stock) {
      return <div>Loading...</div>
  }

  return (
    <Tabs defaultValue="opening" className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-sm">
        <TabsTrigger value="opening">Opening Stock</TabsTrigger>
        <TabsTrigger value="closing">Closing Stock</TabsTrigger>
      </TabsList>
      <TabsContent value="opening" className='mt-6'>
        <StockInputTable 
            stockData={stock} 
            items={items}
            type="openingStock" 
        />
      </TabsContent>
      <TabsContent value="closing" className='mt-6'>
        <StockInputTable 
            stockData={stock} 
            items={items}
            type="closingStock"
        />
      </TabsContent>
    </Tabs>
  );
}
