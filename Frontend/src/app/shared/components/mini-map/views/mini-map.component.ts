import {
  Component,
  AfterViewInit,
  Input,
  ElementRef,
  ViewChild,
  OnDestroy,
  inject
} from '@angular/core';

import * as L from 'leaflet';
import { MiniMapViewModel } from '../viewmodels/mini-map.viewmodel';

/**
 * Componente per la visualizzazione di una mappa statica/interattiva ridotta (MiniMap).
 * Mostra un singolo marker in una posizione specifica.
 * Gestisce il ridimensionamento automatico tramite ResizeObserver per garantire il rendering corretto di Leaflet.
 */
@Component({
  selector: 'app-mini-map',
  standalone: true,
  imports: [],
  templateUrl: './mini-map.component.html',
  styleUrls: ['./mini-map.component.scss'],
  providers: [MiniMapViewModel]
})
export class MiniMapComponent implements AfterViewInit, OnDestroy {

  /** Latitudine del punto da visualizzare. */
  @Input() latitude!: number;
  /** Longitudine del punto da visualizzare. */
  @Input() longitude!: number;
  /** Nome del luogo (es. ristorante) per il tooltip del marker. */
  @Input() name!: string;

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  private map!: L.Map;
  private resizeObs!: ResizeObserver;

  private vm = inject(MiniMapViewModel);

  /**
   * Inizializza il componente dopo che la vista è stata creata.
   * Imposta le coordinate nel ViewModel e avvia un ResizeObserver per inizializzare
   * la mappa solo quando il contenitore ha dimensioni valide.
   */
  ngAfterViewInit(): void {
    const lat = Number(this.latitude);
    const lng = Number(this.longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      console.error("Coordinate MiniMap non valide:", this.latitude, this.longitude);
      return;
    }

    this.vm.setCoords(this.latitude, this.longitude, this.name);

    const el = this.mapContainer.nativeElement;

    // Utilizza ResizeObserver per gestire l'inizializzazione lazy o il resize
    this.resizeObs = new ResizeObserver(() => {
      clearTimeout((this as any)._resizeTimeout);

      (this as any)._resizeTimeout = setTimeout(() => {

        const rect = el.getBoundingClientRect();
        if (rect.height <= 0 || rect.width <= 0) {
          return;
        }

        if (!this.map) {
          this.initMap();
        } else {
          this.map.invalidateSize(true);
        }

      }, 120);
    });

    this.resizeObs.observe(el);
  }

  /**
   * Inizializza l'istanza della mappa Leaflet.
   * Configura i controlli, il tile layer e aggiunge il marker con il tooltip.
   */
  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: true,
      attributionControl: false,
      dragging: true,
      scrollWheelZoom: true,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: true
    }).setView([Number(this.vm.latitude), Number(this.vm.longitude)], 16);

    const tileLayer = L.tileLayer(
      'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
      {
        maxZoom: 20,
        attribution: '&copy; OpenStreetMap contributors, &copy; CARTO'
      }
    ).addTo(this.map);

    // Aggiunge una classe al contenitore quando le tile sono caricate (per effetti CSS)
    tileLayer.on('load', () => {
      const host = this.mapContainer.nativeElement.closest('app-mini-map');
      host?.classList.add('map-loaded');
    });

    const icon = L.icon({
      iconUrl: 'assets/icons/restaurant-marker.svg',
      iconSize: [60, 60],
      iconAnchor: [20, 40],
      popupAnchor: [0, -40]
    });

    const marker = L.marker(
      [Number(this.vm.latitude), Number(this.vm.longitude)],
      { icon }
    ).addTo(this.map);

    marker.bindTooltip(this.vm.restaurantName, {
      permanent: false,
      direction: 'top',
      offset: [0, -10],
      className: 'restaurant-tooltip'
    });
  }

  /**
   * Pulisce le risorse alla distruzione del componente.
   * Disconnette l'observer e rimuove l'istanza della mappa.
   */
  ngOnDestroy(): void {
    if (this.resizeObs) this.resizeObs.disconnect();
    if (this.map) this.map.remove();
  }
}
