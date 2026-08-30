import { validateTransaction } from '../utils/validator';
import { PaymentRepository } from '../database/repositories/paymentRepository';
import { OrderService } from './orderService';

export class PaymentService {
  private paymentRepo: PaymentRepository;
  private orderService: OrderService;

  constructor() {
    this.paymentRepo = new PaymentRepository();
    this.orderService = new OrderService();
  }

  public async processPayment(orderId: string, amount: number, currency: string = 'USD') {
    const isValid = validateTransaction({ orderId, amount, currency });
    if (!isValid) {
      throw new Error('Payment validation failed');
    }

    const transaction = await this.paymentRepo.saveTransaction({
      orderId,
      amount,
      currency,
      status: 'SUCCESS'
    });

    await this.orderService.notifyPaymentCompleted(orderId);
    return transaction;
  }

  public async refundPayment(paymentId: string) {
    return this.paymentRepo.updateStatus(paymentId, 'REFUNDED');
  }
}
