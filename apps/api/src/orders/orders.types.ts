// Shared status type works with PostgreSQL enums and SQLite string columns.
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

export type OrdersRequestIdentity = {
  userId: string | null;
  guestId: string | null;
};
