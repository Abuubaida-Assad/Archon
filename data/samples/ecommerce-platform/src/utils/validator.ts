export function validateTransaction(transaction: { orderId: string; amount: number; currency: string }) {
  if (!transaction.orderId || transaction.amount <= 0) return false;
  if (!['USD', 'EUR', 'GBP'].includes(transaction.currency)) return false;
  return true;
}
