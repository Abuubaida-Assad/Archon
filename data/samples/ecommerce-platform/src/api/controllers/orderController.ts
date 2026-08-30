import { OrderService } from '../../services/orderService';
import { PaymentService } from '../../services/paymentService';

const orderService = new OrderService();
const paymentService = new PaymentService();

export async function createOrderHandler(req: any, res: any) {
  const { userId, items, price } = req.body;
  const order = await orderService.createOrder(userId, items, price);
  return res.json({ success: true, order });
}

export async function processPaymentHandler(req: any, res: any) {
  const { orderId, amount } = req.body;
  const payment = await paymentService.processPayment(orderId, amount);
  return res.json({ success: true, payment });
}
