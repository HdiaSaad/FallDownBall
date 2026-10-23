import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from '../services/i18n.service';

@Pipe({ name: 'translate', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private i18n = inject(I18nService);
  transform(key: string, vars?: Record<string, string | number>): string {
    this.i18n.locale();
    return this.i18n.t(key, vars);
  }
}
