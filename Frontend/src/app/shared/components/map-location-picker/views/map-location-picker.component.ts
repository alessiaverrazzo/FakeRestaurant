import {
  Component,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  ElementRef,
  ViewChild
} from '@angular/core';
import * as L from 'leaflet';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

/**
 * Componente per la selezione di una posizione sulla mappa.
 * Permette di cercare un indirizzo, selezionare un punto cliccando sulla mappa
 * e opzionalmente definire un raggio di ricerca.
 * Utilizza Leaflet per la visualizzazione della mappa.
 */
@Component({
  selector: 'app-map-location-picker',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './map-location-picker.component.html',
  styleUrls: ['./map-location-picker.component.scss']
})
export class MapLocationPickerComponent implements AfterViewInit {

  /** Abilita lo slider per la selezione del raggio. */
  @Input() enableRadiusSelection = false;
  /** Raggio iniziale in km (se null, default a 5). */
  @Input() initialRadiusKm: number | null = null;
  /** Mostra o nasconde la barra di ricerca indirizzi. */
  @Input() showSearchBar = true;

  /** URL dell'icona personalizzata per il marker. */
  @Input() markerIconUrl = 'assets/icons/restaurant-marker.svg';

  /** Evento emesso quando viene selezionata una posizione (lat, lng). */
  @Output() locationSelected = new EventEmitter<{ lat: number; lng: number }>();
  /** Evento emesso quando cambia il raggio di ricerca. */
  @Output() radiusChanged = new EventEmitter<number>();

  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;

  private map!: L.Map;
  marker!: L.Marker | null;
  circle!: L.Circle | null;

  searchTerm = '';
  searchResults: Array<{ display_name: string; lat: number; lon: number }> = [];

  private debounceTimer: any = null;

  currentRadiusKm: number = 5;

  constructor() {}

  /**
   * Inizializza il componente dopo che la vista è stata creata.
   * Imposta il raggio iniziale e inizializza la mappa Leaflet.
   */
  ngAfterViewInit(): void {
    this.currentRadiusKm = this.initialRadiusKm ?? 5;
    this.initializeMap();
  }

  /**
   * Inizializza la mappa Leaflet, imposta la vista iniziale e i tile layer.
   * Aggiunge un listener per il click sulla mappa.
   */
  private initializeMap() {
    this.map = L.map(this.mapContainer.nativeElement, {
      zoomControl: false
    }).setView([41.9028, 12.4964], 6);

    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }
    ).addTo(this.map);

    this.map.on('click', (e: any) => {
      this.setLocation(e.latlng.lat, e.latlng.lng);
    });
  }

  /** Aumenta lo zoom della mappa. */
  zoomIn() {
    this.map.zoomIn();
  }

  /** Diminuisce lo zoom della mappa. */
  zoomOut() {
    this.map.zoomOut();
  }

  /**
   * Imposta la posizione del marker sulla mappa.
   * Valida le coordinate, emette l'evento di selezione e aggiorna la visualizzazione (marker e cerchio).
   * @param lat Latitudine.
   * @param lng Longitudine.
   */
  private setLocation(lat: any, lng: any) {
    lat = Number(lat);
    lng = Number(lng);

    // Validazione coordinate
    if (
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 || lat > 90 ||
      lng < -180 || lng > 180
    ) {
      return; // scarta input non valido
    }

    this.locationSelected.emit({ lat, lng });

    if (this.marker) this.marker.remove();

    this.marker = L.marker([lat, lng], {
      icon: L.icon({
        iconUrl: this.markerIconUrl,
        iconSize: [40, 40],
        iconAnchor: [20, 40],
      }),
    }).addTo(this.map);

    this.map.setView([lat, lng], 15);

    if (this.enableRadiusSelection) {
      this.updateRadius(lat, lng, this.currentRadiusKm);
    }
  }

  /**
   * Cerca un indirizzo tramite il servizio Nominatim (OpenStreetMap).
   * Utilizza un debounce per evitare troppe richieste durante la digitazione.
   * @param term Il termine di ricerca.
   */
  async searchAddress(term: string) {
    // Limite massimo input per sicurezza
    if (term.length > 80) {
      term = term.slice(0, 80);
    }
    this.searchTerm = term;

     // Sanitizzazione testo ricerca
    const cleaned = term
      .replace(/[^0-9a-zA-ZÀ-ÖØ-öø-ÿ\s,'’-]/g, '')
      .trim()
      .toLowerCase();

    clearTimeout(this.debounceTimer);

    this.debounceTimer = setTimeout(() => {
      if (cleaned.length < 3) {
        this.searchResults = [];
        return;
      }

      const url =
        `https://corsproxy.io/?https://nominatim.openstreetmap.org/search` +
        `?format=json&q=${encodeURIComponent(cleaned)}` +
        `&addressdetails=1&limit=8`;

      fetch(url)
        .then(res => {
          if (!res.ok) {
            this.searchResults = [];
            return null;
          }
          return res.json();
        })
        .then(data => {
          if (!data || !Array.isArray(data)) {
            this.searchResults = [];
            return;
          }

          this.searchResults = data.map((item: any) => ({
            display_name: item.display_name,
            lat: parseFloat(item.lat),
            lon: parseFloat(item.lon),
          }));
        })
        .catch(() => {
          this.searchResults = [];
        });
    }, 300);
  }

  /**
   * Gestisce la selezione di un risultato dalla ricerca indirizzi.
   * Imposta la posizione sulla mappa in base al risultato scelto.
   * @param result Il risultato selezionato.
   */
  selectSearchResult(result: { display_name: string; lat: number; lon: number }) {
    this.searchTerm = result.display_name;
    this.searchResults = [];

    const lat = parseFloat(result.lat as any);
    const lon = parseFloat(result.lon as any);

    this.setLocation(lat, lon);
  }

  /**
   * Gestisce il cambiamento del valore dello slider del raggio.
   * Aggiorna il cerchio sulla mappa e emette l'evento.
   * @param value Il nuovo raggio in km.
   */
  onRadiusInput(value: number) {
    this.currentRadiusKm = Number(value);
    this.radiusChanged.emit(this.currentRadiusKm);

    if (this.marker) {
      const { lat, lng } = this.marker.getLatLng();
      this.updateRadius(lat, lng, this.currentRadiusKm);
    }
  }

  /**
   * Aggiorna o crea il cerchio che rappresenta il raggio di ricerca sulla mappa.
   * @param lat Latitudine centrale.
   * @param lng Longitudine centrale.
   * @param km Raggio in km.
   */
  updateRadius(lat: number, lng: number, km: number) {
    if (this.circle) this.circle.remove();

    this.circle = L.circle([lat, lng], {
      radius: km * 1000,
      color: 'var(--red-accent)',
      weight: 2,
      fillColor: 'var(--peach)',
      fillOpacity: 0.15,
    }).addTo(this.map);
  }
}
