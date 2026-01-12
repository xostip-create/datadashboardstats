'use client';

import * as React from 'react';
import { Save, PackagePlus } from 'lucide-react';
import { useDataContext } from '@/lib/data-provider';
import type { Item } from '@/lib/data';
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
import { useFirestore } from '@/firebase';
import { collection, doc, writeBatch, serverTimestamp, getDocs, query, where, Timestamp } from 'firebase/firestore';

function getStartOfDay(date: Date) {
    const newDate = new Date(date);
    newDate.setHours(0, 0, 0, 0);
    return newDate;
}

export default function StockPage() {
    const { items, sales, stock } = useDataContext();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [openingStock, setOpeningStock] = React.useState<Map<string, number>>(new Map());
    const [restockQuantities, setRestockQuantities] = React.useState<Map<string, number>>(new Map());

    const getSalesByItem = React.useCallback(() => {
        if (!sales || !items) return new Map<string, number>();
        const salesByItem = new Map<string, number>();
        for (const sale of sales) {
            const existing = salesByItem.get(sale.itemId) || 0;
            salesByItem.set(sale.itemId, existing + sale.quantity);
        }
        return salesByItem;
    }, [sales, items]);

    const salesByItem = getSalesByItem();

    React.useEffect(() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        const today = new Date().toISOString().split('T')[0];
        
        async function initializeStock() {
            if (!firestore || !items) return;
    
            const todayStockQuery = query(collection(firestore, 'stockLevels'), where('date', '==', today));
            const todaySnapshot = await getDocs(todayStockQuery);
    
            const newOpeningStock = new Map<string, number>();

            if (!todaySnapshot.empty) {
                // Today's stock already initialized, load it
                todaySnapshot.forEach(doc => {
                    const data = doc.data();
                    newOpeningStock.set(data.itemId, data.openingStock);
                });
            } else {
                // Initialize today's stock from yesterday's closing stock
                const yesterdayStockQuery = query(collection(firestore, 'stockLevels'), where('date', '==', yesterdayStr));
                const yesterdaySnapshot = await getDocs(yesterdayStockQuery);
                const yesterdayStockMap = new Map<string, any>();
                yesterdaySnapshot.forEach(doc => {
                    yesterdayStockMap.set(doc.data().itemId, doc.data());
                });

                const batch = writeBatch(firestore);

                for (const item of items) {
                    const yesterdayStock = yesterdayStockMap.get(item.id);
                    let opening = 0;
                    if (yesterdayStock) {
                        const startOfYesterday = getStartOfDay(yesterday);
                        const endOfYesterday = new Date(startOfYesterday);
                        endOfYesterday.setHours(23, 59, 59, 999);

                        const yesterdaySalesQuery = query(
                            collection(firestore, 'sales'), 
                            where('saleDate', '>=', Timestamp.fromDate(startOfYesterday)), 
                            where('saleDate', '<=', Timestamp.fromDate(endOfYesterday))
                        );
                        const yesterdaySalesSnapshot = await getDocs(yesterdaySalesQuery);
                        const yesterdaySalesByItem = new Map<string, number>();
                        yesterdaySalesSnapshot.forEach(doc => {
                            const sale = doc.data();
                            if(sale.itemId === item.id) {
                                const existing = yesterdaySalesByItem.get(sale.itemId) || 0;
                                yesterdaySalesByItem.set(sale.itemId, existing + sale.quantity);
                            }
                        });
                        const soldYesterday = yesterdaySalesByItem.get(item.id) || 0;
                        opening = yesterdayStock.openingStock - soldYesterday;
                    }
                    newOpeningStock.set(item.id, opening < 0 ? 0 : opening);
                    
                    const todayStockRef = doc(collection(firestore, 'stockLevels'));
                    batch.set(todayStockRef, {
                        id: todayStockRef.id,
                        itemId: item.id,
                        date: today,
                        openingStock: opening < 0 ? 0 : opening,
                    });
                }
                if (items.length > 0 && todaySnapshot.empty) {
                    await batch.commit();
                }
            }
            setOpeningStock(newOpeningStock);
        }
    
        if(items){
            initializeStock();
        }
    
    }, [firestore, items]);


    const handleOpeningStockChange = (itemId: string, value: string) => {
        const newStock = new Map(openingStock);
        newStock.set(itemId, Number(value));
        setOpeningStock(newStock);
    };

    const handleSaveOpeningStock = async () => {
        if (!firestore) return;
        const batch = writeBatch(firestore);
        const today = new Date().toISOString().split('T')[0];
        
        const stockQuery = query(collection(firestore, 'stockLevels'), where('date', '==', today));
        const snapshot = await getDocs(stockQuery);
        const stockDocs = new Map<string, any>();
        snapshot.forEach(doc => stockDocs.set(doc.data().itemId, doc.ref));

        openingStock.forEach((quantity, itemId) => {
            const docRef = stockDocs.get(itemId);
            if (docRef) {
                batch.update(docRef, { openingStock: quantity });
            }
        });

        await batch.commit();
        toast({
          title: 'Stock Saved',
          description: `The opening stock levels have been updated.`,
        });
      };

      const handleRestockQuantityChange = (itemId: string, value: string) => {
        const newQuantities = new Map(restockQuantities);
        newQuantities.set(itemId, Number(value) || 0);
        setRestockQuantities(newQuantities);
    };

    const handleRestock = async () => {
        if (!firestore) return;
        const batch = writeBatch(firestore);
        const today = new Date().toISOString().split('T')[0];

        const stockQuery = query(collection(firestore, 'stockLevels'), where('date', '==', today));
        const snapshot = await getDocs(stockQuery);
        const stockDocs = new Map<string, any>();
        snapshot.forEach(doc => stockDocs.set(doc.data().itemId, {ref: doc.ref, data: doc.data()}));

        const newOpeningStockMap = new Map(openingStock);
        restockQuantities.forEach((quantity, itemId) => {
            if (quantity > 0) {
                const stockDoc = stockDocs.get(itemId);
                if (stockDoc) {
                    const newOpeningStock = stockDoc.data.openingStock + quantity;
                    batch.update(stockDoc.ref, { openingStock: newOpeningStock });
                    newOpeningStockMap.set(itemId, newOpeningStock);
                }
            }
        });

        await batch.commit();
        setOpeningStock(newOpeningStockMap);
        setRestockQuantities(new Map());
        toast({
            title: 'Stock Updated',
            description: 'Inventory has been restocked successfully.',
        });
    };

  return (
    <Tabs defaultValue="daily" className="w-full">
      <TabsList className="grid w-full grid-cols-2 max-w-sm">
        <TabsTrigger value="daily">Daily Stock</TabsTrigger>
        <TabsTrigger value="restock">Restock</TabsTrigger>
      </TabsList>
      <TabsContent value="daily" className='mt-6'>
         <Card>
            <CardHeader className='flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
                <div>
                    <CardTitle>Daily Stock Levels</CardTitle>
                    <CardDescription>Set opening stock. Closing is calculated automatically.</CardDescription>
                </div>
                <Button onClick={handleSaveOpeningStock} className="w-full sm:w-auto">
                    <Save className="mr-2 h-4 w-4" /> Save Opening Stock
                </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Opening</TableHead>
                        <TableHead className="text-right">Sold</TableHead>
                        <TableHead className="text-right">Closing</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items?.map((item) => {
                        const opening = openingStock.get(item.id) || 0;
                        const sold = salesByItem.get(item.id) || 0;
                        const closing = opening - sold;
                    return (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
                            <TableCell className="text-right">
                                <Input
                                    type="number"
                                    value={opening}
                                    onChange={(e) => handleOpeningStockChange(item.id, e.target.value)}
                                    className="ml-auto max-w-[100px] text-right"
                                    placeholder="0"
                                />
                            </TableCell>
                            <TableCell className="text-right">{sold}</TableCell>
                            <TableCell className="text-right">{closing}</TableCell>
                        </TableRow>
                    );
                    })}
                </TableBody>
                </Table>
            </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="restock" className='mt-6'>
      <Card>
            <CardHeader className='flex-col sm:flex-row items-start sm:items-center justify-between gap-4'>
                <div>
                    <CardTitle>Restock Inventory</CardTitle>
                    <CardDescription>Add new quantities to your items.</CardDescription>
                </div>
                <Button onClick={handleRestock} className="w-full sm:w-auto">
                    <PackagePlus className="mr-2 h-4 w-4" /> Add to Stock
                </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className='w-[60%]'>Item</TableHead>
                        <TableHead>Current Stock</TableHead>
                        <TableHead className="text-right">Add Quantity</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items?.map((item) => (
                        <TableRow key={item.id}>
                            <TableCell className="font-medium whitespace-nowrap">{item.name}</TableCell>
                            <TableCell>{openingStock.get(item.id) || 0}</TableCell>
                            <TableCell className="text-right">
                                <Input
                                    type="number"
                                    value={restockQuantities.get(item.id) || ''}
                                    onChange={(e) => handleRestockQuantityChange(item.id, e.target.value)}
                                    className="ml-auto max-w-[120px] text-right"
                                    placeholder="0"
                                />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
                </Table>
            </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
