import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnInit,
  Output,
} from '@angular/core';


import {
  latLng,
  latLngBounds,
  marker,
  tileLayer,
  Map,
  icon,
  layerGroup,
  Layer,
  Marker,
} from 'leaflet';
import { LeafletModule } from '@asymmetrik/ngx-leaflet';

import { GeoPoint } from '../../../services/geo.service';
import { ParsedEntity } from '../../../services/xml.service';

const OSM_ATTR =
  '&copy; <a target="_blank" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

@Component({
  selector: 'app-place-map',
  standalone: true,
  imports: [LeafletModule],
  templateUrl: './place-map.component.html',
  styleUrl: './place-map.component.scss',
})
export class PlaceMapComponent implements OnInit, AfterViewInit {
  private _flyToPoint?: GeoPoint;
  private _map?: Map;
  private _entities: ParsedEntity[] = [];
  // map between string from lat+long and entity
  private _entityMarkers: { [key: string]: ParsedEntity } = {};

  public leafletLayers: Layer[] = [];

  public leafletOptions = {
    layers: [
      tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: OSM_ATTR,
      }),
    ],
    zoom: 5,
    center: latLng(46.879966, -121.726909),
  };

  public layersControl = {
    baseLayers: {
      'Open Street Map': tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 18, attribution: OSM_ATTR }
      ),
    },
    overlays: {
      Markers: layerGroup([]),
    },
  };

  @Input()
  public get entities(): ParsedEntity[] {
    return this._entities;
  }
  public set entities(value: ParsedEntity[]) {
    if (this._entities === value) return;
    this._entities = value;
    this.updateMarkers(value);
  }

  @Input()
  public get flyToPoint(): GeoPoint | undefined | null {
    return this._flyToPoint;
  }
  public set flyToPoint(value: GeoPoint | undefined | null) {
    this._flyToPoint = value || undefined;
    if (this._flyToPoint) {
      this.flyToLocation(value!.lat, value!.long);
    }
  }

  @Output()
  public entityPick: EventEmitter<ParsedEntity> = new EventEmitter();

  public ngOnInit(): void {
    this.updateMarkers(this._entities);
  }

  public ngAfterViewInit() {
    this.fitMapToMarkers();
  }

  private isMarker(layer: any): boolean {
    return typeof layer.getLatLng === 'function';
  }

  public fitMapToMarkers() {
    if (!this._map || !this.leafletLayers.length) return;

    const latlngs = this.leafletLayers
      .filter((layer: Layer) => this.isMarker(layer))
      .map((marker) => (marker as Marker).getLatLng());
    const bounds = latLngBounds(latlngs);
    this._map.fitBounds(bounds);
  }

  private createMarker(
    latlng: [number, number],
    label?: string,
    permanent = true
  ) {
    const newMarker = marker(latlng, {
      icon: icon({
        iconSize: [25, 41],
        iconAnchor: [13, 41],
        iconUrl: 'assets/img/marker-icon.png',
        shadowUrl: 'assets/img/marker-shadow.png',
      }),
    }).setLatLng(latlng);
    if (label) {
      newMarker.bindTooltip(label, {
        permanent: permanent,
        direction: 'top',
        offset: [0, -35],
      });
    }
    newMarker.on('click', () => this.handleMarkerClick(latlng));
    return newMarker;
  }

  private handleMarkerClick(latlng: [number, number]) {
    // find entity from latlng using _entityMarkers
    const key = this.getEntityPositionKey(latlng[0], latlng[1]);
    const entity = this._entityMarkers[key];
    if (entity) {
      this.entityPick.emit(entity);
    }
  }

  public onMapReady(map: Map) {
    this._map = map;
  }

  public flyToLocation(lat: number, lng: number, zoom = 10) {
    if (!this._map) return;

    this._map.flyTo(latLng(lat, lng), zoom);
  }

  private getEntityPositionKey(lat: number, long: number): string {
    return `${lat}_${long}`;
  }

  private updateMarkers(entities: ParsedEntity[]): void {
    this._entityMarkers = {};

    // add markers from locations
    this.leafletLayers = entities
      .filter((e) => e.point)
      .map((e) => {
        const m = this.createMarker([e.point!.lat, e.point!.long]);
        m.bindPopup(e.names[0]);
        this._entityMarkers[
          this.getEntityPositionKey(e.point!.lat, e.point!.long)
        ] = e;
        return m;
      });

    // if there is a single marker, center the map on it;
    // else fit it to the markers bounds
    if (this.leafletLayers.length === 1) {
      const marker = this.leafletLayers[0];
      if (this.isMarker(marker)) {
        const latLng = (marker as Marker).getLatLng();
        this.flyToLocation(latLng.lat, latLng.lng);
      }
    } else {
      this.fitMapToMarkers();
    }
  }
}
