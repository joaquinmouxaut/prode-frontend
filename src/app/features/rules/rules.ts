import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppLucideIconsModule } from '../../shared/lucide-icons.module';

@Component({
  selector: 'app-rules',
  imports: [RouterLink, AppLucideIconsModule],
  templateUrl: './rules.html',
})
export class Rules {}
