export type Item = {
  id: string;
  name: string;
  unitPrice: number;
};

export type StockLevel = {
  id: string;
  itemId: string;
  date: string;
  openingStock: number;
  closingStock: number;
};

export type Sale = {
  id: string;
  itemId: string;
  quantity: number;
  saleDate: any; // Firestore timestamp
};
