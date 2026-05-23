import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  message: string;
  type: ToastType;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly #toast = signal<Toast | null>(null);

  readonly toast = this.#toast.asReadonly();

  show(message: string, type: ToastType = 'info'): void {
    this.#toast.set({ message, type });
  }

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  clear(): void {
    this.#toast.set(null);
  }

  dismiss(): void {
    this.clear();
  }
}
