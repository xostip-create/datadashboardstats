'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { Item, Sale, StockLevel } from './data';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

interface DataContextType {
  items: Item[] | null;
  sales: Sale[] | null;
  stock: StockLevel[] | null;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const firestore = useFirestore();

  const itemsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'items');
  }, [firestore]);
  const { data: items } = useCollection<Item>(itemsQuery);

  const salesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'sales');
  }, [firestore]);
  const { data: sales } = useCollection<Sale>(salesQuery);
  
  const today = new Date().toISOString().split('T')[0];
  const stockLevelsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'stockLevels'), where('date', '==', today));
  }, [firestore, today]);

  const { data: stock } = useCollection<StockLevel>(stockLevelsQuery);

  return (
    <DataContext.Provider value={{ items, sales, stock }}>
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
