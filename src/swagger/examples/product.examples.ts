export const createProductRequestExample = {
  name: 'كولا 330مل',
  price: 15,
  stock: 100,
  cost: 8,
  barcode: '6223000000001',
  category: 'مشروبات',
};

export const updateProductRequestExample = {
  name: 'كولا 330مل',
  price: 16,
  stock: 95,
  cost: 8.5,
  barcode: '6223000000001',
  category: 'مشروبات',
};

export const productResponseExample = {
  id: '67abc123def4567890123456',
  name: 'كولا 330مل',
  price: 15,
  stock: 100,
  cost: 8,
  barcode: '6223000000001',
  category: 'مشروبات',
  createdAt: '2026-07-25T09:00:00.000Z',
  updatedAt: '2026-07-25T09:00:00.000Z',
};

export const productListResponseExample = [productResponseExample];
