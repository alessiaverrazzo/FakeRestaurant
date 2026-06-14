import { Component, ViewChild, ElementRef, Input } from '@angular/core';

/**
 * Componente riutilizzabile per lo scorrimento orizzontale di contenuti.
 * Fornisce pulsanti di navigazione (sinistra/destra) e un contenitore scrollabile.
 * Utile per liste di card o elementi che eccedono la larghezza dello schermo.
 */
@Component({
  selector: 'app-horizontal-scroller',
  standalone: true,
  templateUrl: './horizontal-scroller.component.html',
  styleUrls: ['./horizontal-scroller.component.scss']
})
export class HorizontalScrollerComponent {

  /** Riferimento al contenitore scrollabile nel template. */
  @ViewChild('scroller') scroller!: ElementRef<HTMLDivElement>;

  /** Quantità di pixel da scorrere ad ogni click. */
  @Input() scrollAmount: number = 350;

  /** Larghezza minima degli elementi contenuti */
  @Input() minItemWidth: string = '320px';

  /** Larghezza massima degli elementi contenuti */
  @Input() maxItemWidth: string = '440px';

  /**
   * Scorre il contenuto verso sinistra.
   */
  scrollLeft() {
    this.scroller.nativeElement.scrollBy({
      left: -this.scrollAmount,
      behavior: 'smooth'
    });
  }

  /**
   * Scorre il contenuto verso destra.
   */
  scrollRight() {
    this.scroller.nativeElement.scrollBy({
      left: this.scrollAmount,
      behavior: 'smooth'
    });
  }
}
