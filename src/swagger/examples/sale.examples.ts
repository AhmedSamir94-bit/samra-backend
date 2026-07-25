export const createSaleRequestExample = {
  items: [
    {
      id: '67abc123def4567890123456',
      name: 'كولا 330مل',
      quantity: 2,
    },
    {
      id: '67abc123def4567890123457',
      name: 'شيبسي',
      quantity: 1,
    },
  ],
  cashier: 'admin',
};

export const saleResponseExample = {
  id: '67abc123def4567890123999',
  invoiceNumber: 'S-2026-0001',
  items: [
    {
      productId: '67abc123def4567890123456',
      name: 'كولا 330مل',
      quantity: 2,
      price: 15,
      total: 30,
    },
  ],
  total: 30,
  cashier: 'admin',
  createdAt: '2026-07-25T09:00:00.000Z',
  updatedAt: '2026-07-25T09:00:00.000Z',
};

export const saleListResponseExample = [saleResponseExample];
