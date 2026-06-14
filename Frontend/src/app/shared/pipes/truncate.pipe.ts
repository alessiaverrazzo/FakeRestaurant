import { Pipe, PipeTransform } from '@angular/core';

/**
 * Pipe per troncare stringhe di testo che superano una certa lunghezza.
 * Aggiunge un suffisso (default '…') se il testo viene tagliato.
 */
@Pipe({
  name: 'truncate',
  standalone: true,
})
export class TruncatePipe implements PipeTransform {

  /**
   * Trasforma la stringa in input troncandola se necessario.
   * @param value La stringa da troncare.
   * @param maxLength Lunghezza massima consentita (default 150).
   * @param suffix Suffisso da aggiungere se troncata (default '…').
   * @returns La stringa troncata o l'originale se più corta del limite.
   */
  transform(value: string | null | undefined, maxLength: number = 150, suffix = '…'): string {
    if (!value) return '';
    return value.length > maxLength ? value.slice(0, maxLength).trimEnd() + suffix : value;
  }
}
