import { NgModule } from '@angular/core';
import {
  Calendar,
  CheckCircle,
  ChevronRight,
  Goal,
  LayoutGrid,
  Loader2,
  LogIn,
  LogOut,
  LucideAngularModule,
  Medal,
  Settings,
  Shield,
  Trophy,
  UserPlus,
  Users,
} from 'lucide-angular';

@NgModule({
  imports: [
    LucideAngularModule.pick({
      Calendar,
      CheckCircle,
      ChevronRight,
      Goal,
      LayoutGrid,
      Loader2,
      LogIn,
      LogOut,
      Medal,
      Settings,
      Shield,
      Trophy,
      UserPlus,
      Users,
    }),
  ],
  exports: [LucideAngularModule],
})
export class AppLucideIconsModule {}
