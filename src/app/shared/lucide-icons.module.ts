import { NgModule } from '@angular/core';
import {
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronRight,
  Goal,
  LayoutGrid,
  Loader2,
  Lock,
  LogIn,
  LogOut,
  LucideAngularModule,
  Medal,
  Settings,
  Shield,
  Target,
  Trophy,
  UserPlus,
  Users,
  Zap,
} from 'lucide-angular';

@NgModule({
  imports: [
    LucideAngularModule.pick({
      BookOpen,
      Calendar,
      CheckCircle,
      ChevronRight,
      Goal,
      LayoutGrid,
      Loader2,
      Lock,
      LogIn,
      LogOut,
      Medal,
      Settings,
      Shield,
      Target,
      Trophy,
      UserPlus,
      Users,
      Zap,
    }),
  ],
  exports: [LucideAngularModule],
})
export class AppLucideIconsModule {}
