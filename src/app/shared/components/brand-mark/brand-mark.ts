import { Component, computed, input } from '@angular/core';

export type BrandMarkSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-brand-mark',
  standalone: true,
  templateUrl: './brand-mark.html',
})
export class BrandMarkComponent {
  readonly size = input<BrandMarkSize>('sm');
  readonly cohort = input('93');

  protected readonly px = computed(() => {
    switch (this.size()) {
      case 'md':
        return 56;
      case 'lg':
        return 512;
      default:
        return 40;
    }
  });
}
