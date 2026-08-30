import { InventoryService } from './inventoryService';
import { OrderRepository } from '../database/repositories/orderRepository';
import { calculateTax } from '../utils/taxCalculator';

export class OrderService {
  private inventoryService: InventoryService;
  private orderRepo: OrderRepository;

  constructor() {
    this.inventoryService = new InventoryService();
    this.orderRepo = new OrderRepository();
  }

  public async createOrder(userId: string, items: Array<{ itemId: string; quantity: number }>, price: number) {
    const tax = calculateTax(price);
    const total = price + tax;

    await this.inventoryService.reserveStock(items);

    const order = await this.orderRepo.createOrderRecord({
      userId,
      items,
      total,
      status: 'PENDING_PAYMENT'
    });

    return order;
  }

  public async notifyPaymentCompleted(orderId: string) {
    return this.orderRepo.updateOrderStatus(orderId, 'PAID');
  }

  public async cancelOrder(orderId: string) {
    const order = await this.orderRepo.findOrderById(orderId);
    if (order) {
      await this.inventoryService.releaseStock(order.items);
      await this.orderRepo.updateOrderStatus(orderId, 'CANCELLED');
    }
  }
}
