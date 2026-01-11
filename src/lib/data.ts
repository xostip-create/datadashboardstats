import type { LucideIcon } from "lucide-react";
import { Beer, Wine, GlassWater, Beef, Bot } from 'lucide-react';

export type Item = {
  id: string;
  name: string;
  icon: LucideIcon;
  price: number;
  category: 'Drinks' | 'Food';
};

export type StockRecord = {
  itemId: string;
  opening: number;
  closing: number;
};

export type Sale = {
  id: string;
  itemId: string;
  quantity: number;
  total: number;
  timestamp: Date;
};

export const inventory: Item[] = [
  { id: 'item-1', name: 'Craft Lager', icon: Beer, price: 6.50, category: 'Drinks' },
  { id: 'item-2', name: 'House Red Wine', icon: Wine, price: 8.00, category: 'Drinks' },
  { id: 'item-3', name: 'Sparkling Water', icon: GlassWater, price: 3.00, category: 'Drinks' },
  { id: 'item-4', name: 'Bourbon Old Fashioned', icon: Bot, price: 12.00, category: 'Drinks' },
  { id: 'item-5', name: 'Bar Nuts', icon: Beef, price: 4.50, category: 'Food' },
  { id: 'item-6', name: 'IPA', icon: Beer, price: 7.00, category: 'Drinks' },
  { id: 'item-7', name: 'Sauvignon Blanc', icon: Wine, price: 9.00, category: 'Drinks' },
];

export const stock: StockRecord[] = [
  { itemId: 'item-1', opening: 100, closing: 0 },
  { itemId: 'item-2', opening: 50, closing: 0 },
  { itemId: 'item-3', opening: 80, closing: 0 },
  { itemId: 'item-4', opening: 30, closing: 0 },
  { itemId: 'item-5', opening: 40, closing: 0 },
  { itemId: 'item-6', opening: 90, closing: 0 },
  { itemId: 'item-7', opening: 45, closing: 0 },
];

export const sales: Sale[] = [
  { id: 'sale-1', itemId: 'item-1', quantity: 2, total: 13.00, timestamp: new Date() },
  { id: 'sale-2', itemId: 'item-4', quantity: 1, total: 12.00, timestamp: new Date() },
  { id: 'sale-3', itemId: 'item-2', quantity: 3, total: 24.00, timestamp: new Date() },
  { id: 'sale-4', itemId: 'item-5', quantity: 2, total: 9.00, timestamp: new Date() },
  { id: 'sale-5', itemId: 'item-1', quantity: 4, total: 26.00, timestamp: new Date() },
  { id: 'sale-6', itemId: 'item-6', quantity: 5, total: 35.00, timestamp: new Date() },
  { id: 'sale-7', itemId: 'item-7', quantity: 2, total: 18.00, timestamp: new Date() },
  { id: 'sale-8', itemId: 'item-3', quantity: 3, total: 9.00, timestamp: new Date() },
];

export const getSalesByItem = () => {
  const salesByItem = new Map<string, { quantity: number; total: number }>();
  for (const sale of sales) {
    const existing = salesByItem.get(sale.itemId) || { quantity: 0, total: 0 };
    salesByItem.set(sale.itemId, {
      quantity: existing.quantity + sale.quantity,
      total: existing.total + sale.total,
    });
  }
  return Array.from(salesByItem.entries()).map(([itemId, data]) => {
    const item = inventory.find(i => i.id === itemId);
    return {
      name: item?.name || 'Unknown',
      quantity: data.quantity,
      total: data.total,
    };
  });
};

export const getStockSummary = () => {
    const salesByItem = getSalesByItem();
    return stock.map(stockItem => {
        const item = inventory.find(i => i.id === stockItem.itemId);
        const saleInfo = salesByItem.find(s => s.name === item?.name);
        const sold = saleInfo?.quantity || 0;
        const expected = stockItem.opening - sold;
        const discrepancy = stockItem.closing - expected;

        return {
            id: item?.id || '',
            name: item?.name || 'Unknown',
            icon: item?.icon,
            opening: stockItem.opening,
            sold,
            expected,
            closing: stockItem.closing,
            discrepancy,
        };
    });
};
