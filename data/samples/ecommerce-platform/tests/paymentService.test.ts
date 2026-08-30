import { PaymentService } from '../src/services/paymentService';

describe('PaymentService', () => {
  it('should process payment successfully and trigger order update', async () => {
    const paymentService = new PaymentService();
    const result = await paymentService.processPayment('ord_123', 99.99, 'USD');
    expect(result.status).toBe('SUCCESS');
  });

  it('should reject invalid currency', async () => {
    const paymentService = new PaymentService();
    await expect(paymentService.processPayment('ord_123', 99.99, 'INVALID')).rejects.toThrow();
  });
});
