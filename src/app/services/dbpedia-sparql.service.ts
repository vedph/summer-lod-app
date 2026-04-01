import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { HttpParams, HttpClient } from '@angular/common/http';

import { UrlParamEncodingService } from './url-param-encoding.service';
import { SparqlResult } from './lod.service';

/**
 * Service to get data from DBPedia using SPARQL.
 */
@Injectable({
  providedIn: 'root',
})
export class DbpediaSparqlService {
  constructor(
    private http: HttpClient,
    private urlParamEncodingService: UrlParamEncodingService
  ) {}

  /**
   * Get SparQL DBPedia Results.
   * Note: no default-graph-uri is sent so Virtuoso searches the full dataset.
   * Restricting to 'http://dbpedia.org' silently excludes abstracts and other
   * triples that the endpoint loads into separate named graphs.
   */
  public get(query: string): Observable<SparqlResult> {
    return this.http.get<SparqlResult>('https://dbpedia.org/sparql', {
      params: new HttpParams({
        fromObject: {
          query,
          format: 'application/sparql-results+json',
          timeout: '30000',
        },
        encoder: this.urlParamEncodingService,
      }),
    }).pipe(
      tap((r: SparqlResult) => {
        console.log('[SPARQL raw] vars:', r?.head?.vars);
        console.log('[SPARQL raw] row count:', r?.results?.bindings?.length);
        if (r?.results?.bindings?.length) {
          console.log('[SPARQL raw] first row (full):', JSON.stringify(r.results.bindings[0]));
        }
      })
    );
  }
}
