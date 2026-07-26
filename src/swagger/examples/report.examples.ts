export const salesReportResponseExample = {
  type: 'sales',
  from: '2026-07-01',
  to: '2026-07-25',
  totalSales: 12500,
  invoiceCount: 48,
  rows: [
    {
      date: '2026-07-25',
      invoiceNumber: 'S-2026-0001',
      total: 150,
      cashier: 'admin',
    },
  ],
};

export const profitsReportResponseExample = {
  type: 'profits',
  from: '2026-07-01',
  to: '2026-07-25',
  revenue: 12500,
  cost: 7200,
  profit: 5300,
};

export const topSellingReportResponseExample = {
  type: 'top-selling',
  from: '2026-07-01',
  to: '2026-07-25',
  items: [
    {
      name: 'كولا 330مل',
      quantity: 320,
      revenue: 4800,
    },
  ],
};
