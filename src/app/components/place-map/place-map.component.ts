import { AfterViewInit, Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

import {
  AnyLayout,
  GeoJSONSourceRaw,
  LngLat,
  LngLatBounds,
  Map,
  MapMouseEvent,
  NavigationControl,
} from 'mapbox-gl';
import { NgxMapboxGLModule } from 'ngx-mapbox-gl';

import { EnvService } from '@myrmidon/ng-tools';

import { GeoMarker, GeoPoint } from '../../../services/geo.service';
import { MapglWrapperModule } from '../../mapgl-wrapper-module';
import { ParsedEntity } from '../../../services/xml.service';

@Component({
  selector: 'app-place-map',
  standalone: true,
  imports: [CommonModule, MapglWrapperModule, NgxMapboxGLModule],
  templateUrl: './place-map.component.html',
  styleUrl: './place-map.component.scss',
})
export class PlaceMapComponent implements OnInit, AfterViewInit {
  private _map?: Map;
  private _rendered?: boolean;
  private _entities: any[] = [];
  private _flyToPoint?: GeoPoint;

  public resultSource?: GeoJSON.FeatureCollection<GeoJSON.Point>;
  public rawResultSource?: GeoJSONSourceRaw;
  public readonly labelLayout: AnyLayout;
  public isGlobeView?: boolean;
  public markers: GeoMarker[] = [];

  @Input()
  public get entities(): ParsedEntity[] {
    return this._entities;
  }
  public set entities(value: ParsedEntity[]) {
    if (this._entities === value) return;
    this._entities = value;
    this.updateMarkers();
  }

  @Input()
  public get flyToPoint(): GeoPoint | undefined | null {
    return this._flyToPoint;
  }
  public set flyToPoint(value: GeoPoint | undefined | null) {
    this._flyToPoint = value || undefined;
    if (this._flyToPoint) {
      this.flyToLocation(new LngLat(value!.long, value!.lat));
    }
  }

  constructor() {
    // https://stackoverflow.com/questions/62343360/add-text-to-mapbox-marker
    this.labelLayout = {
      'text-field': ['get', 'title'],
      'text-variable-anchor': ['top', 'bottom', 'left', 'right'],
      'text-radial-offset': 0.5,
      'text-justify': 'auto',
      'icon-image': ['concat', ['get', 'icon'], '-15'],
    };
  }

  public ngOnInit(): void {
    this.updateMarkers();
  }

  public ngAfterViewInit(): void {
    setTimeout(() => {
      console.log('initial resize to fit');
      this._map?.resize();
    });
  }

  private updateMarkers(): void {
    this.markers = this._entities.map((e: ParsedEntity) => {
      return {
        id: e.ids[0],
        lat: e.point?.lat || 0,
        long: e.point?.long || 0,
        name: e.names[0],
      };
    });
    this.setFeaturesFromMarkers();

    // zoom to include all the markers
    if (this.markers?.length) {
      const pagePoints: LngLat[] = this.markers!.filter((r) => r.lat).map(
        (r) => new LngLat(r.long!, r.lat!)
      ) as LngLat[];
      const bounds = this.getRectBounds(pagePoints);
      if (bounds) {
        this._map?.fitBounds(bounds, { padding: 50 });
      }
    }
  }

  private flyToLocation(location: LngLat) {
    this._map?.flyTo({ center: location, zoom: 6 });
  }

  public onMapCreate(map: Map): void {
    this._map = map;
    // navigation
    this._map.addControl(new NavigationControl());
  }

  public onMapClick(event: MapMouseEvent): void {
    if (!this._map || !event.lngLat) {
      return;
    }
    console.log(event.point);
  }

  public onRender(event: any): void {
    // resize to fit container
    // https://github.com/Wykks/ngx-mapbox-gl/issues/344
    if (!this._rendered) {
      console.log('resize to fit');
      event.target.resize();
      this._rendered = true;
    }
  }

  private getRectBounds(points: LngLat[]): LngLatBounds | null {
    // min lng,lat and max lng,lat
    const min = new LngLat(180, 90);
    const max = new LngLat(-180, -90);
    points.forEach((pt) => {
      // min
      if (min.lng > pt.lng) {
        min.lng = pt.lng;
      }
      if (min.lat > pt.lat) {
        min.lat = pt.lat;
      }
      // max
      if (max.lng < pt.lng) {
        max.lng = pt.lng;
      }
      if (max.lat < pt.lat) {
        max.lat = pt.lat;
      }
    });
    return new LngLatBounds(min, max);
  }

  private setFeaturesFromMarkers(): void {
    const features: GeoJSON.Feature<GeoJSON.Point>[] = [];
    if (this.markers?.length) {
      this.markers
        .filter((r) => r.lat)
        .forEach((r) => {
          features.push({
            type: 'Feature',
            properties: {
              id: r.id,
              title: r.name,
            },
            geometry: {
              type: 'Point',
              coordinates: [r.long || 0, r.lat || 0],
            },
          });
        });
    }
    // the markers source
    this.resultSource = {
      type: 'FeatureCollection',
      features: features,
    };
    // the markers labels source
    this.rawResultSource = {
      type: 'geojson',
      data: this.resultSource,
    };
    // fit to markers bounds
    if (this.markers?.length) {
      const pagePoints: LngLat[] = this.markers!.filter((r) => r.lat).map(
        (r) => new LngLat(r.long!, r.lat!)
      ) as LngLat[];
      const bounds = this.getRectBounds(pagePoints);
      if (bounds) {
        this._map?.fitBounds(bounds);
      }
    }
  }
}
