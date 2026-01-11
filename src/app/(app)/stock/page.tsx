'use client';

import * as React from 'react';
import { Save } from 'lucide-react';
import { stock, inventory } from '@/lib/data';
import type { StockRecord, Item } from '@/lib/data';
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

type StockInputProps = {
  stockData: StockRecord[];
  type: 'opening' | 'closing';
};

function StockInputTable({ stockData, type }: StockInputProps) {
  const { toast } = useToast();
  const [localStock, setLocalStock] = React.useState(stockData);

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
    // Here you would typically save the data to your backend.
    // For now, we just show a toast notification.
    console.log(`Saving ${type} stock:`, localStock);
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
              <TableHead className="text-right">Category</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
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
                  <TableCell className="text-right whitespace-nowrap">{item?.category}</TableCell>
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
  return (
    <Tabs defaultValue="opening" className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-sm">
        <TabsTrigger value="opening">Opening Stock</TabsTrigger>
        <TabsTrigger value="closing">Closing Stock</TabsTrigger>
      </TabsList>
      <TabsContent value="opening" className='mt-6'>
        <StockInputTable stockData={stock} type="opening" />
      </TabsContent>
      <TabsContent value="closing" className='mt-6'>
        <StockInputTable stockData={stock} type="closing" />
      </TabsContent>
    </Tabs>
  );
}