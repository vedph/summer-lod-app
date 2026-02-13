import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
} from '@angular/core';

import {
  MapComponent,
  MarkerComponent,
} from '@maplibre/ngx-maplibre-gl';
import { LngLatBounds, LngLatLike, Map as MaplibreMap } from 'maplibre-gl';

import { GeoPoint } from '../../services/geo.service';
import { ParsedEntity } from '../../services/xml.service';

@Component({
  selector: 'app-place-map',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MapComponent, MarkerComponent],
  templateUrl: './place-map.component.html',
  styleUrl: './place-map.component.scss',
})
export class PlaceMapComponent {
  // Signal inputs
  readonly entities = input<ParsedEntity[]>([]);
  readonly flyToPoint = input<GeoPoint | null | undefined>(undefined);

  // Signal output
  readonly entityPick = output<ParsedEntity>();

  // Internal state
  private readonly _map = signal<MaplibreMap | undefined>(undefined);

  // Computed: entities that have geo points
  readonly markerEntities = computed(() =>
    this.entities().filter((e) => e.point)
  );

  // Map configuration
  readonly mapStyle =
    'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json';
  readonly mapZoom: [number] = [5];
  readonly mapCenter: LngLatLike = [12.3155, 45.4408]; // Venice default

  constructor() {
    // Fit bounds whenever marker entities change
    effect(() => {
      const entities = this.markerEntities();
      const map = this._map();
      if (!map || entities.length === 0) return;

      if (entities.length === 1) {
        const p = entities[0].point!;
        map.flyTo({ center: [p.long, p.lat], zoom: 10 });
      } else {
        const bounds = new LngLatBounds();
        for (const e of entities) {
          bounds.extend([e.point!.long, e.point!.lat]);
        }
        map.fitBounds(bounds, { padding: 50 });
      }
    });

    // Fly to point when flyToPoint input changes
    effect(() => {
      const point = this.flyToPoint();
      const map = this._map();
      if (!point || !map) return;
      map.flyTo({ center: [point.long, point.lat], zoom: 10 });
    });
  }

  onMapLoad(map: MaplibreMap): void {
    this._map.set(map);
  }

  onMarkerClick(entity: ParsedEntity): void {
    this.entityPick.emit(entity);
  }
}
