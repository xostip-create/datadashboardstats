export type Item = {
  id: string;
  name: string;
  unitPrice: number;
};

export type StockLevel = {
  id: string;
  itemId: string;
  quantity: number;
};

export type Sale = {
  id: string;
  itemId: string;
  quantity: number;
  saleDate: any; // Firestore timestamp
};

export type Shortage = {
    id: string;
    staffName: string;
    amount: number;
    shortageDate: any; // Firestore timestamp
};