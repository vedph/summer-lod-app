import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map } from 'rxjs';

import { ErrorService } from '@myrmidon/ng-tools';

interface Coordinates {
  latitude: number;
  longitude: number;
}

/**
 * Service to get geographic coordinates from Wikidata and DBpedia
 * given the corresponding place ID.
 */
@Injectable({
  providedIn: 'root',
})
export class GeoService {
  constructor(private http: HttpClient, private _error: ErrorService) {}

  getCoordsFromWikidata(entityId: string): Observable<Coordinates> {
    const query = `
      SELECT ?lat ?long
      WHERE {
        wd:${entityId} wdt:P625 ?coord .
        BIND(xsd:decimal(strBefore(str(?coord), " ")) AS ?lat)
        BIND(xsd:decimal(strAfter(str(?coord), " ")) AS ?long)
      }
    `;
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(
      query
    )}&format=json`;
    return this.http.get<any>(url).pipe(
      map((response) => {
        const bindings = response.results.bindings[0];
        const latitude = parseFloat(bindings.lat.value);
        const longitude = parseFloat(bindings.long.value);
        return { latitude, longitude };
      }),
      catchError(this._error.handleError)
    );
  }

  getCoordsFromDBpedia(resourceId: string): Observable<Coordinates> {
    const query = `
      PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
      PREFIX dbo: <http://dbpedia.org/ontology/>

      SELECT ?lat ?long
      WHERE {
        <${resourceId}> geo:lat ?lat ;
                        geo:long ?long .
      }
    `;
    const url = `http://dbpedia.org/sparql?query=${encodeURIComponent(
      query
    )}&format=json`;
    return this.http.get<any>(url).pipe(
      map((response) => {
        const bindings = response.results.bindings[0];
        const latitude = parseFloat(bindings.lat.value);
        const longitude = parseFloat(bindings.long.value);
        return { latitude, longitude };
      }),
      catchError(this._error.handleError)
    );
  }
}
