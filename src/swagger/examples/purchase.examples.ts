export const createPurchaseRequestExample = {
  invoiceNumber: 'P-2026-0001',
  supplier: 'مورد النيل',
  date: '2026-07-25',
  items: [
    {
      productName: 'كولا 330مل',
      barcode: '6223000000001',
      quantity: 50,
      purchasePrice: 8,
      salePrice: 15,
      category: 'مشروبات',
    },
  ],
};

export const updatePurchaseRequestExample = {
  invoiceNumber: 'P-2026-0001',
  supplier: 'مورد النيل',
  date: '2026-07-25',
  items: [
    {
      productName: 'كولا 330مل',
      barcode: '6223000000001',
      quantity: 60,
      purchasePrice: 7.5,
      salePrice: 15,
      category: 'مشروبات',
    },
  ],
};

export const purchaseResponseExample = {
  id: '67abc123def4567890123888',
  invoiceNumber: 'P-2026-0001',
  supplier: 'مورد النيل',
  date: '2026-07-25T00:00:00.000Z',
  items: [
    {
      productName: 'كولا 330مل',
      barcode: '6223000000001',
      quantity: 50,
      purchasePrice: 8,
      salePrice: 15,
      category: 'مشروبات',
    },
  ],
  total: 400,
  createdAt: '2026-07-25T09:00:00.000Z',
  updatedAt: '2026-07-25T09:00:00.000Z',
};

export const purchaseListResponseExample = [purchaseResponseExample];

export const nextPurchaseNumberResponseExample = {
  invoiceNumber: 'P-2026-0002',
};
