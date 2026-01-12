'use client';

import * as React from 'react';
import { Save, Trash2 } from 'lucide-react';
import { stock, inventory } from '@/lib/data';
import type { StockRecord, Item } from '@/lib/data';
import { Button, buttonVariants } from '@/components/ui/button';
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
import { cn } from '@/lib/utils';

type StockInputProps = {
  stockData: StockRecord[];
  type: 'opening' | 'closing';
  onStockUpdate: (updatedStock: StockRecord[]) => void;
  onStockDelete: (itemId: string) => void;
};

function StockInputTable({ stockData, type, onStockUpdate, onStockDelete }: StockInputProps) {
  const { toast } = useToast();
  const [localStock, setLocalStock] = React.useState(stockData);

  React.useEffect(() => {
    setLocalStock(stockData);
  }, [stockData]);

  const handleStockChange = (itemId: string, value: string) => {
    const newStock = localStock.map((item) => {
      if (item.itemId === itemId) {
        return { ...item, [type]: Number(value) };
      }
      return item;
    });
    setLocalStock(newStock);
  };

  const handleSave = () => {
    onStockUpdate(localStock);
    toast({
      title: 'Stock Saved',
      description: `The ${type} stock levels have been updated.`,
    });
  };

  return (
    <Card>
       <CardHeader className='flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
        <div>
            <CardTitle>Update {type.charAt(0).toUpperCase() + type.slice(1)} Stock</CardTitle>
            <CardDescription>Enter the stock count for each item.</CardDescription>
        </div>
        <Button onClick={handleSave} className="w-full sm:w-auto">
          <Save className="mr-2 h-4 w-4" /> Save {type.charAt(0).toUpperCase() + type.slice(1)}
        </Button>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[60%]'>Item</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="w-[50px]"><span className='sr-only'>Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localStock.map((stockItem) => {
              const item = inventory.find(
                (i: Item) => i.id === stockItem.itemId
              );
              return (
                <TableRow key={stockItem.itemId}>
                  <TableCell className="font-medium flex items-center gap-3 whitespace-nowrap">
                    {item?.icon && <item.icon className="h-5 w-5 text-muted-foreground"/>}
                    {item?.name || 'Unknown'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{item?.category}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      defaultValue={stockItem[type] > 0 ? stockItem[type] : ''}
                      onChange={(e) =>
                        handleStockChange(stockItem.itemId, e.target.value)
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
                                <AlertDialogAction onClick={() => onStockDelete(stockItem.itemId)} variant="destructive">
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
  const [stockData, setStockData] = React.useState(stock);
  const { toast } = useToast();

  const handleStockUpdate = (updatedStock: StockRecord[]) => {
      setStockData(updatedStock);
  };

  const handleStockDelete = (itemId: string) => {
      setStockData(prev => prev.filter(s => s.itemId !== itemId));
      toast({
          title: 'Stock Record Deleted',
          description: 'The stock record has been removed.',
          variant: 'destructive',
      });
  };

  return (
    <Tabs defaultValue="opening" className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-sm">
        <TabsTrigger value="opening">Opening Stock</TabsTrigger>
        <TabsTrigger value="closing">Closing Stock</TabsTrigger>
      </TabsList>
      <TabsContent value="opening" className='mt-6'>
        <StockInputTable 
            stockData={stockData} 
            type="opening" 
            onStockUpdate={handleStockUpdate} 
            onStockDelete={handleStockDelete} 
        />
      </TabsContent>
      <TabsContent value="closing" className='mt-6'>
        <StockInputTable 
            stockData={stockData} 
            type="closing" 
            onStockUpdate={handleStockUpdate}
            onStockDelete={handleStockDelete}
        />
      </TabsContent>
    </Tabs>
  );
}
