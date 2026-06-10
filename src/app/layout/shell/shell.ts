import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { BRANDING } from '../../core/constants/branding';
import { AuthService } from '../../core/services/auth.service';
import { BrandMarkComponent } from '../../shared/components/brand-mark/brand-mark';
import { AppLucideIconsModule } from '../../shared/lucide-icons.module';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AppLucideIconsModule, BrandMarkComponent],
  templateUrl: './shell.html',
  styleUrl: './shell.scss',
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly branding = BRANDING;
  private readonly router = inject(Router);

  logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/auth');
  }
}
