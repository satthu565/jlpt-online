import { Injectable } from '@nestjs/common';
import type { IPaymentProvider } from './payment-provider.interface.js';
import { PayOSAdapter } from './payos.adapter.js';

@Injectable()
export class PaymentProviderRegistry {
  private readonly providers = new Map<string, IPaymentProvider>();

  constructor() {
    const payos = new PayOSAdapter();
    this.registerProvider(payos);
  }

  registerProvider(provider: IPaymentProvider): void {
    this.providers.set(provider.name.toLowerCase(), provider);
  }

  getProvider(name: string): IPaymentProvider | undefined {
    return this.providers.get(name.toLowerCase());
  }

  getAllProviders(): IPaymentProvider[] {
    return Array.from(this.providers.values());
  }
}
