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
