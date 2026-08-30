import fs from 'fs';
import path from 'path';

export function ensureSampleRepositories(): string {
  const sampleDir = path.join(process.cwd(), 'data', 'samples', 'ecommerce-platform');
  const vaultDir = path.join(process.cwd(), 'data', 'samples', 'obsidian-vault');

  // Ensure Vault Sample
  if (!fs.existsSync(path.join(vaultDir, 'Index.md'))) {
    fs.mkdirSync(path.join(vaultDir, 'architecture'), { recursive: true });
    fs.mkdirSync(path.join(vaultDir, 'guides'), { recursive: true });
    fs.mkdirSync(path.join(vaultDir, 'services'), { recursive: true });

    fs.writeFileSync(
      path.join(vaultDir, 'Index.md'),
      `# System Knowledge Base

Welcome to the engineering knowledge vault.

## Key Hubs
- [[Architecture Overview]] — System topology and layer boundaries
- [[Payment Integration]] — Stripe webhook and payment lifecycle
- [[Deployment Guide]] — Multi-region Kubernetes rollouts

#engineering #knowledge #architecture
`
    );

    fs.writeFileSync(
      path.join(vaultDir, 'architecture', 'Architecture Overview.md'),
      `# Architecture Overview

The system is organized into modular services:
- [[Payment Integration]] handles credit card transactions and settlements.
- [[Order Management]] coordinates fulfillment and inventory reservations.
- Refer to [[Deployment Guide]] for staging and production rollout pipelines.

#core #architecture
`
    );

    fs.writeFileSync(
      path.join(vaultDir, 'services', 'Payment Integration.md'),
      `# Payment Integration

Handles payment processing and fraud detection.

## Connected Documents
- Links to [[Architecture Overview]]
- Integrates with [[Order Management]]
- Testing instructions in [[Deployment Guide]]

#payments #stripe
`
    );

    fs.writeFileSync(
      path.join(vaultDir, 'services', 'Order Management.md'),
      `# Order Management

Processes customer checkout workflows.

- Validates cart before calling [[Payment Integration]]
- Updates inventory state described in [[Architecture Overview]]

#orders #ecommerce
`
    );

    fs.writeFileSync(
      path.join(vaultDir, 'guides', 'Deployment Guide.md'),
      `# Deployment Guide

Continuous delivery checklist for [[Payment Integration]] and [[Order Management]].

1. Run automated test suites
2. Check blast radius with Archon
3. Deploy canary pods

#devops #deployment
`
    );
  }

  if (fs.existsSync(path.join(sampleDir, 'package.json'))) {
    return sampleDir;
  }

  fs.mkdirSync(path.join(sampleDir, 'src', 'api', 'controllers'), { recursive: true });
  fs.mkdirSync(path.join(sampleDir, 'src', 'services'), { recursive: true });
  fs.mkdirSync(path.join(sampleDir, 'src', 'domain', 'models'), { recursive: true });
  fs.mkdirSync(path.join(sampleDir, 'src', 'database', 'repositories'), { recursive: true });
  fs.mkdirSync(path.join(sampleDir, 'src', 'utils'), { recursive: true });
  fs.mkdirSync(path.join(sampleDir, 'tests'), { recursive: true });

  // package.json
  fs.writeFileSync(
    path.join(sampleDir, 'package.json'),
    JSON.stringify({
      name: 'ecommerce-platform',
      version: '2.4.0',
      description: 'Distributed e-commerce architecture with payments, orders, and inventory',
      main: 'src/index.ts',
      dependencies: {
        express: '^4.19.0',
        '@prisma/client': '^5.10.0',
        stripe: '^14.0.0',
        redis: '^4.6.0',
        jsonwebtoken: '^9.0.0'
      }
    }, null, 2)
  );

  // 1. Payment Service
  fs.writeFileSync(
    path.join(sampleDir, 'src', 'services', 'paymentService.ts'),
    `import { validateTransaction } from '../utils/validator';
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
`
  );

  // 2. Order Service
  fs.writeFileSync(
    path.join(sampleDir, 'src', 'services', 'orderService.ts'),
    `import { InventoryService } from './inventoryService';
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
`
  );

  // 3. Inventory Service
  fs.writeFileSync(
    path.join(sampleDir, 'src', 'services', 'inventoryService.ts'),
    `import { InventoryRepository } from '../database/repositories/inventoryRepository';

export class InventoryService {
  private repo: InventoryRepository;

  constructor() {
    this.repo = new InventoryRepository();
  }

  public async reserveStock(items: Array<{ itemId: string; quantity: number }>) {
    for (const item of items) {
      const stock = await this.repo.getStock(item.itemId);
      if (stock < item.quantity) {
        throw new Error('Insufficient inventory stock');
      }
      await this.repo.decrementStock(item.itemId, item.quantity);
    }
  }

  public async releaseStock(items: Array<{ itemId: string; quantity: number }>) {
    for (const item of items) {
      await this.repo.incrementStock(item.itemId, item.quantity);
    }
  }
}
`
  );

  // 4. API Controllers
  fs.writeFileSync(
    path.join(sampleDir, 'src', 'api', 'controllers', 'orderController.ts'),
    `import { OrderService } from '../../services/orderService';
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
`
  );

  // 5. Database Repositories
  fs.writeFileSync(
    path.join(sampleDir, 'src', 'database', 'repositories', 'paymentRepository.ts'),
    `export class PaymentRepository {
  public async saveTransaction(data: any) {
    // Database INSERT into payments table
    return { id: 'pay_9921', ...data, createdAt: new Date() };
  }

  public async updateStatus(id: string, status: string) {
    // Database UPDATE payments table
    return { id, status, updatedAt: new Date() };
  }
}
`
  );

  fs.writeFileSync(
    path.join(sampleDir, 'src', 'database', 'repositories', 'orderRepository.ts'),
    `export class OrderRepository {
  public async createOrderRecord(data: any) {
    // Database INSERT into orders table
    return { id: 'ord_5412', ...data, createdAt: new Date() };
  }

  public async findOrderById(id: string) {
    // Database SELECT from orders table
    return { id, items: [{ itemId: 'item_1', quantity: 2 }] };
  }

  public async updateOrderStatus(id: string, status: string) {
    // Database UPDATE orders table
    return { id, status, updatedAt: new Date() };
  }
}
`
  );

  fs.writeFileSync(
    path.join(sampleDir, 'src', 'database', 'repositories', 'inventoryRepository.ts'),
    `export class InventoryRepository {
  public async getStock(itemId: string): Promise<number> {
    // Database SELECT from inventory table
    return 100;
  }

  public async decrementStock(itemId: string, qty: number) {
    // Database UPDATE inventory table
    return true;
  }

  public async incrementStock(itemId: string, qty: number) {
    // Database UPDATE inventory table
    return true;
  }
}
`
  );

  // 6. Utilities
  fs.writeFileSync(
    path.join(sampleDir, 'src', 'utils', 'validator.ts'),
    `export function validateTransaction(transaction: { orderId: string; amount: number; currency: string }) {
  if (!transaction.orderId || transaction.amount <= 0) return false;
  if (!['USD', 'EUR', 'GBP'].includes(transaction.currency)) return false;
  return true;
}
`
  );

  fs.writeFileSync(
    path.join(sampleDir, 'src', 'utils', 'taxCalculator.ts'),
    `export function calculateTax(price: number, taxRate: number = 0.08): number {
  return price * taxRate;
}
`
  );

  // 7. Express App Index
  fs.writeFileSync(
    path.join(sampleDir, 'src', 'index.ts'),
    `import { createOrderHandler, processPaymentHandler } from './api/controllers/orderController';

export function setupRoutes(app: any) {
  app.post('/api/v1/orders', createOrderHandler);
  app.post('/api/v1/payments', processPaymentHandler);
}
`
  );

  // 8. Automated Tests
  fs.writeFileSync(
    path.join(sampleDir, 'tests', 'paymentService.test.ts'),
    `import { PaymentService } from '../src/services/paymentService';

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
`
  );

  return sampleDir;
}

export function getVaultSampleDirectory(): string {
  return path.join(process.cwd(), 'data', 'samples', 'obsidian-vault');
}
