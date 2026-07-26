export enum ExpenseType {
  RENT = 'rent',
  ELECTRICITY = 'electricity',
  WATER = 'water',
  GAS = 'gas',
  SALARIES = 'salaries',
  TRANSPORTATION = 'transportation',
  MAINTENANCE = 'maintenance',
  MARKETING = 'marketing',
  PACKAGING = 'packaging',
  CLEANING = 'cleaning',
  INTERNET = 'internet',
  PHONE = 'phone',
  SUPPLIES = 'supplies',
  TAXES = 'taxes',
  INSURANCE = 'insurance',
  OTHER = 'other',
}

export enum ExpensePaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  TRANSFER = 'transfer',
}

export const EXPENSE_TYPE_LABELS: Record<ExpenseType, string> = {
  [ExpenseType.RENT]: 'إيجار',
  [ExpenseType.ELECTRICITY]: 'كهرباء',
  [ExpenseType.WATER]: 'مياه',
  [ExpenseType.GAS]: 'غاز',
  [ExpenseType.SALARIES]: 'رواتب',
  [ExpenseType.TRANSPORTATION]: 'مواصلات',
  [ExpenseType.MAINTENANCE]: 'صيانة',
  [ExpenseType.MARKETING]: 'تسويق',
  [ExpenseType.PACKAGING]: 'تغليف',
  [ExpenseType.CLEANING]: 'نظافة',
  [ExpenseType.INTERNET]: 'إنترنت',
  [ExpenseType.PHONE]: 'هاتف',
  [ExpenseType.SUPPLIES]: 'مستلزمات',
  [ExpenseType.TAXES]: 'ضرائب ورسوم',
  [ExpenseType.INSURANCE]: 'تأمين',
  [ExpenseType.OTHER]: 'أخرى',
};

export function listExpenseTypes() {
  return Object.values(ExpenseType).map((type) => ({
    type,
    label: EXPENSE_TYPE_LABELS[type],
  }));
}
