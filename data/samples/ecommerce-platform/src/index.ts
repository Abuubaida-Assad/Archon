import { createOrderHandler, processPaymentHandler } from './api/controllers/orderController';

export function setupRoutes(app: any) {
  app.post('/api/v1/orders', createOrderHandler);
  app.post('/api/v1/payments', processPaymentHandler);
}
