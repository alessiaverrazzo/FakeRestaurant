import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe per formattare le date in formato relativo (es. "5 min fa", "2 giorni fa").
 * Utile per visualizzare timestamp in modo user-friendly nelle notifiche o nei commenti.
 */
@Pipe({
  name: 'timeAgo',
  standalone: true,
})
export class TimeAgoPipe implements PipeTransform {

  /**
   * Trasforma una data in una stringa di tempo relativo.
   * @param value La data da formattare (stringa ISO, Date object, o null/undefined).
   * @returns Una stringa che rappresenta il tempo trascorso (es. "proprio ora", "1 ora fa").
   */
  transform(value: string | Date | undefined | null): string {
    if (!value) return '';

    const date = new Date(value);
    const diff = Date.now() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'proprio ora';
    if (minutes < 60) return `${minutes} min fa`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} h fa`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} gg fa`;

    const months = Math.floor(days / 30);
    if (months < 12) return months === 1 ? '1 mese fa' : `${months} mesi fa`;

    const years = Math.floor(days / 365);
    return years === 1 ? '1 anno fa' : `${years} anni fa`;
  }
}
