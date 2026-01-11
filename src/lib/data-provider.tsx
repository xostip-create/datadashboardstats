'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { Item, Sale, StockRecord } from './data';
import { inventory as initialInventory, sales as initialSales, stock as initialStock } from './data';

interface DataContextType {
  items: Item[];
  setItems: React.Dispatch<React.SetStateAction<Item[]>>;
  sales: Sale[];
  setSales: React.Dispatch<React.SetStateAction<Sale[]>>;
  stock: StockRecord[];
  setStock: React.Dispatch<React.SetStateAction<StockRecord[]>>;
  addStockRecord: (record: StockRecord) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<Item[]>(initialInventory);
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [stock, setStock] = useState<StockRecord[]>(initialStock);

  const addStockRecord = (record: StockRecord) => {
    setStock(prevStock => [...prevStock, record]);
  };

  return (
    <DataContext.Provider value={{ items, setItems, sales, setSales, stock, setStock, addStockRecord }}>
      {children}
    </DataContext.Provider>
  );
};

export const useDataContext = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useDataContext must be used within a DataProvider');
  }
  return context;
};