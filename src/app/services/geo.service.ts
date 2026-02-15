import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

import { ErrorService } from '@myrmidon/ng-tools';

import { CACHE_ID } from '../app.config';
import { DbpediaSparqlService } from './dbpedia-sparql.service';
import { LocalCacheService } from './local-cache.service';
import { SparqlResult } from './lod.service';

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
    private _http: HttpClient,
    private _dbpService: DbpediaSparqlService,
    private _cacheService: LocalCacheService,
    private _error: ErrorService
  ) {}

  getPointFromWikidata(id: string): Observable<GeoPoint> {
    const cached = this._cacheService.get<GeoPoint>(
      CACHE_ID,
      GEO_PREFIX + id
    );
    if (cached) {
      console.log(`cache hit for ${GEO_PREFIX + id}`, cached);
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

    console.log('Wikidata Query:\n' + query);

    return this._http.get<any>(url).pipe(
      map((response) => {
        const bindings = response?.results?.bindings;
        if (!bindings?.length) {
          throw new Error(`No Wikidata geo results for ${id}`);
        }
        const lat = parseFloat(bindings[0].lat.value);
        const long = parseFloat(bindings[0].long.value);
        if (isNaN(lat) || isNaN(long)) {
          throw new Error(`Invalid Wikidata coordinates for ${id}`);
        }
        this._cacheService.add(CACHE_ID, GEO_PREFIX + id, { lat, long });
        return { lat, long };
      }),
      catchError(this._error.handleError)
    );
  }

  getPointFromDBpedia(id: string): Observable<GeoPoint> {
    const cached = this._cacheService.get<GeoPoint>(
      CACHE_ID,
      GEO_PREFIX + id
    );
    if (cached) {
      console.log(`cache hit for ${GEO_PREFIX + id}`, cached);
      return of(cached);
    }

    const query = `PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
SELECT ?lat ?long
WHERE {
  <${id}> geo:lat ?lat ;
          geo:long ?long .
}`;

    console.log('DBPedia Geo Query:\n' + query);

    return this._dbpService.get(query).pipe(
      map((response: SparqlResult) => {
        const bindings = response?.results?.bindings;
        if (!bindings?.length) {
          throw new Error(`No DBpedia geo results for ${id}`);
        }
        const lat = parseFloat(bindings[0]['lat']?.value);
        const long = parseFloat(bindings[0]['long']?.value);
        if (isNaN(lat) || isNaN(long)) {
          throw new Error(`Invalid DBpedia coordinates for ${id}`);
        }
        this._cacheService.add(CACHE_ID, GEO_PREFIX + id, { lat, long });
        return { lat, long };
      }),
      catchError(this._error.handleError)
    );
  }
}
