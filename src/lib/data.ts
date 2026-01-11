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

export const inventory: Item[] = [];

export const stock: StockRecord[] = [];

export const sales: Sale[] = [];

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
