import { Component, effect, inject, untracked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../core/services/toast.service';

const TOAST_DURATION = 4000;

@Component({
  selector: 'app-toast',
  imports: [CommonModule],
  templateUrl: './toast.html',
  styleUrl: './toast.scss',
  standalone: true,
})
export class ToastComponent {
  private readonly toastService = inject(ToastService);
  private timeoutId?: ReturnType<typeof setTimeout>;

  toast = this.toastService.toast;

  constructor() {
    effect(() => {
      const currentToast = this.toast();
      if (currentToast) {
        untracked(() => this.scheduleDismiss());
      } else {
        this.clearTimeout();
      }
    });
  }

  private scheduleDismiss(): void {
    this.clearTimeout();
    this.timeoutId = setTimeout(() => {
      this.toastService.dismiss();
    }, TOAST_DURATION);
  }

  private clearTimeout(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = undefined;
    }
  }

  dismiss(): void {
    this.toastService.dismiss();
  }

  get icon(): string {
    const t = this.toast();
    switch (t?.type) {
      case 'success':
        return '✓';
      case 'error':
        return '✕';
      case 'info':
        return 'ℹ';
      default:
        return '';
    }
  }
}
