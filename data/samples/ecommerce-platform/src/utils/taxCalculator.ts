export function calculateTax(price: number, taxRate: number = 0.08): number {
  return price * taxRate;
}
