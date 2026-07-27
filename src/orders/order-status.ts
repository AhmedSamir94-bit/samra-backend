export enum OrderStatus {
  RECEIVED = 'received',
  PREPARING = 'preparing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  OrderStatus.RECEIVED,
  OrderStatus.PREPARING,
  OrderStatus.SHIPPED,
  OrderStatus.DELIVERED,
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.RECEIVED]: 'تم استلام الطلب',
  [OrderStatus.PREPARING]: 'جاري التجهيز',
  [OrderStatus.SHIPPED]: 'تم الشحن',
  [OrderStatus.DELIVERED]: 'تم التسليم',
  [OrderStatus.CANCELLED]: 'ملغي',
};
