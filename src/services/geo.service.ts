import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

import { ErrorService } from '@myrmidon/ng-tools';
import { LocalCacheService } from './local-cache.service';
import { CACHE_ID } from '../app/app.config';

export interface GeoPoint {
  lat: number;
  long: number;
  alt?: number;
}

export interface GeoMarker extends GeoPoint {
  id: string;
  name?: string;
  options?: any;
}

const GEO_PREFIX = 'geo.';

/**
 * Service to get geographic coordinates from Wikidata and DBpedia
 * given the corresponding place ID.
 */
@Injectable({
  providedIn: 'root',
})
export class GeoService {
  constructor(
    private http: HttpClient,
    private _cacheService: LocalCacheService,
    private _error: ErrorService
  ) {}

  getPointFromWikidata(id: string): Observable<GeoPoint> {
    const cached = this._cacheService.get<GeoPoint>(CACHE_ID, GEO_PREFIX + id);
    if (cached) {
      return of(cached);
    }

    const query = `
      SELECT ?lat ?long
      WHERE {
        wd:${id} wdt:P625 ?coord .
        BIND(xsd:decimal(strBefore(str(?coord), " ")) AS ?lat)
        BIND(xsd:decimal(strAfter(str(?coord), " ")) AS ?long)
      }
    `;
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(
      query
    )}&format=json`;

    console.log(query);

    return this.http.get<any>(url).pipe(
      map((response) => {
        const bindings = response.results.bindings[0];
        const lat = parseFloat(bindings.lat.value);
        const long = parseFloat(bindings.long.value);
        this._cacheService.add(CACHE_ID, GEO_PREFIX + id, { lat, long });
        return { lat, long };
      }),
      catchError(this._error.handleError)
    );
  }

  getPointFromDBpedia(id: string): Observable<GeoPoint> {
    const cached = this._cacheService.get<GeoPoint>(CACHE_ID, GEO_PREFIX + id);
    if (cached) {
      return of(cached);
    }

    const query = `
      PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
      PREFIX dbo: <http://dbpedia.org/ontology/>

      SELECT ?lat ?long
      WHERE {
        <${id}> geo:lat ?lat ;
                geo:long ?long .
      }
    `;
    const url = `http://dbpedia.org/sparql?query=${encodeURIComponent(
      query
    )}&format=json`;

    console.log(query);

    return this.http.get<any>(url).pipe(
      map((response) => {
        const bindings = response.results.bindings[0];
        const lat = parseFloat(bindings.lat.value);
        const long = parseFloat(bindings.long.value);
        this._cacheService.add(CACHE_ID, GEO_PREFIX + id, { lat, long });
        return { lat, long };
      }),
      catchError(this._error.handleError)
    );
  }
}
