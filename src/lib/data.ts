export type Item = {
  id: string;
  name: string;
  unitPrice: number;
};

export type StockLevel = {
  id: string;
  itemId: string;
  date: string; // YYYY-MM-DD
  openingStock: number;
  closingStock: number; // This will now be calculated automatically
};

export type Sale = {
  id: string;
  itemId: string;
  quantity: number;
  saleDate: any; // Firestore timestamp
};
