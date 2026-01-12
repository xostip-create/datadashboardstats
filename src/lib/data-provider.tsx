'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import type { Item, Sale, StockLevel, Shortage, Staff } from './data';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';

interface DataContextType {
  items: Item[] | null;
  sales: Sale[] | null;
  stock: StockLevel[] | null;
  shortages: Shortage[] | null;
  staff: Staff[] | null;
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
  
  const stockLevelsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'stockLevels');
  }, [firestore]);
  const { data: stock } = useCollection<StockLevel>(stockLevelsQuery);
  
  const shortagesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'shortages');
    }, [firestore]);
  const { data: shortages } = useCollection<Shortage>(shortagesQuery);

  const staffQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'staff');
    }, [firestore]);
  const { data: staff } = useCollection<Staff>(staffQuery);

  return (
    <DataContext.Provider value={{ items, sales, stock, shortages, staff }}>
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
