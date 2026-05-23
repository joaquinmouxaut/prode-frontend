import { NgModule } from '@angular/core';
import {
  Calendar,
  ChevronRight,
  Goal,
  LayoutGrid,
  Loader2,
  LogIn,
  LogOut,
  LucideAngularModule,
  Medal,
  Shield,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-angular';

@NgModule({
  imports: [
    LucideAngularModule.pick({
      Calendar,
      ChevronRight,
      Goal,
      LayoutGrid,
      Loader2,
      LogIn,
      LogOut,
      Medal,
      Shield,
      Trophy,
      UserPlus,
      Users,
    }),
  ],
  exports: [LucideAngularModule],
})
export class AppLucideIconsModule {}
