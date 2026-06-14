import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  OnInit,
  OnDestroy
} from '@angular/core';

import { CommonModule } from '@angular/common';

import { NotificationPageViewModel } from '../viewmodels/notification-page.viewmodel';
import { NotificationItemComponent } from '@features/notifications/notification-item/views/notification-item.component';

/**
 * Componente per la pagina delle Notifiche.
 * Visualizza la lista delle notifiche raggruppate per data e gestisce l'infinite scroll.
 * Delega la logica di business al ViewModel.
 */
@Component({
  selector: 'app-notification-page',
  standalone: true,
  imports: [
    CommonModule,
    NotificationItemComponent
  ],
  templateUrl: './notification-page.component.html',
  styleUrls: ['./notification-page.component.scss'],
  providers: [NotificationPageViewModel]
})
export class NotificationPageComponent implements AfterViewInit, OnInit, OnDestroy {

  @ViewChild('scrollAnchor', { static: false })
  scrollAnchor?: ElementRef<HTMLDivElement>;

  private observer!: IntersectionObserver;

  constructor(public vm: NotificationPageViewModel) {}

  /**
   * Inizializza il componente.
   * Aggiunge una classe al body per lo styling specifico e carica le notifiche.
   */
  async ngOnInit() {
    document.body.classList.add('notifications-page');
    await this.vm.loadFromBackend();
  }

  /**
   * Gestisce il click su una notifica.
   * @param notification La notifica cliccata.
   */
  onNotificationClick(notification: any): void {
    this.vm.handleClick(notification);
  }

  /**
   * Configura l'IntersectionObserver per l'infinite scroll dopo l'inizializzazione della vista.
   * Quando l'elemento di ancoraggio diventa visibile, carica altre notifiche.
   */
  ngAfterViewInit(): void {
    setTimeout(() => {
      if (!this.scrollAnchor) return;

      this.observer = new IntersectionObserver(entries => {
        if (entries[0].isIntersecting) {
          this.vm.loadMore();
        }
      });

      this.observer.observe(this.scrollAnchor.nativeElement);
    });
  }

  /**
   * Pulisce le risorse alla distruzione del componente.
   * Rimuove la classe dal body e disconnette l'observer.
   */
  ngOnDestroy(): void {
    document.body.classList.remove('notifications-page');

    if (this.observer) {
      this.observer.disconnect();
    }
  }
}
