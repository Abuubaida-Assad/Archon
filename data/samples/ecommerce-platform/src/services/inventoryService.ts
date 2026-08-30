import { InventoryRepository } from '../database/repositories/inventoryRepository';

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
