import { Injectable } from '@angular/core';
import { Observable, of, catchError, map } from 'rxjs';

import { ErrorService } from '@myrmidon/ng-tools';

import { DbpediaSparqlService } from './dbpedia-sparql.service';
import { LocalCacheService } from './local-cache.service';
import { LodService, RdfTerm, SparqlResult } from './lod.service';
import { CACHE_ID } from '../app/app.config';

const POS_PREFIX = 'pos.';

export interface PlaceInfo {
  uri: string;
  labels: RdfTerm[];
  abstracts?: RdfTerm[];
  depiction?: RdfTerm;
  topic?: RdfTerm;
  lat?: RdfTerm;
  long?: RdfTerm;
}

/**
 * Service to get data from DBPedia about places.
 */
@Injectable({
  providedIn: 'root',
})
export class DbpediaPlaceService {
  constructor(
    private _dbpService: DbpediaSparqlService,
    private _cacheService: LocalCacheService,
    private _errorService: ErrorService,
    private _lodService: LodService
  ) {}

  public buildQuery(id: string): string {
    return `PREFIX dbp: <http://dbpedia.org/property/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX dbr: <http://dbpedia.org/resource/>
    PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
    SELECT DISTINCT
      dbr:${id} as ?place ?label
      ?topic ?depiction ?abstract
      ?lat ?long
    WHERE {
      dbr:${id} rdfs:label ?label.
      OPTIONAL {
        dbr:${id} geo:lat ?lat;
        geo:long ?long.
      }
      OPTIONAL {
        dbr:${id} foaf:isPrimaryTopicOf ?topic.
      }
      OPTIONAL {
        dbr:${id} foaf:depiction ?depiction.
      }
      OPTIONAL {
        dbr:${id} dbo:abstract ?abstract.
      }
    }`;
  }

  public buildPosQuery(id: string): string {
    return `PREFIX dbp: <http://dbpedia.org/property/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX dbr: <http://dbpedia.org/resource/>
    PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
    SELECT DISTINCT dbr:${id} as ?place ?lat ?long
    WHERE {
      dbr:${id} geo:lat ?lat;
        geo:long ?long.
    }`;
  }

  public buildInfo(result: SparqlResult): PlaceInfo | null {
    if (!result) {
      return null;
    }
    const bindings = result.results.bindings;
    const info: PlaceInfo = {
      uri: '',
      labels: [],
    };
    for (const binding of bindings) {
      // place (just once)
      if (!info.uri) {
        info.uri = binding['place'].value;
      }

      // labels
      info.labels = this._lodService.addTerm(binding, 'label', info.labels);

      // abstract
      info.abstracts = this._lodService.addTerm(
        binding,
        'abstract',
        info.abstracts
      );

      // depiction
      info.depiction = this._lodService.replaceTerm(
        binding,
        'depiction',
        null,
        info.depiction || null
      );

      // topic
      info.topic = this._lodService.replaceTerm(
        binding,
        'topic',
        null,
        info.topic || null
      );

      // lat
      info.lat = this._lodService.replaceTerm(
        binding,
        'lat',
        null,
        info.lat || null
      );

      // long
      info.long = this._lodService.replaceTerm(
        binding,
        'long',
        null,
        info.long || null
      );
    }
    return info;
  }

  public getInfo(id: string): Observable<PlaceInfo | null> {
    const cached = this._cacheService.get<SparqlResult>(CACHE_ID, id);
    if (cached) {
      return of(this.buildInfo(cached));
    }

    const query = this.buildQuery(id);
    return this._dbpService.get(query).pipe(
      catchError(this._errorService.handleError),
      map((r: SparqlResult) => {
        this._cacheService.add(CACHE_ID, id, r);
        return this.buildInfo(r);
      })
    );
  }

  public buildPosInfo(result: SparqlResult): PlaceInfo | null {
    if (!result) {
      return null;
    }
    const bindings = result.results.bindings;
    const info: PlaceInfo = {
      uri: '',
      labels: [],
    };
    for (const binding of bindings) {
      // place (just once)
      if (!info.uri) {
        info.uri = binding['place'].value;
      }

      // lat
      info.lat = this._lodService.replaceTerm(
        binding,
        'lat',
        null,
        info.lat || null
      );

      // long
      info.long = this._lodService.replaceTerm(
        binding,
        'long',
        null,
        info.long || null
      );
      if (info.lat.value && info.long.value) {
        break;
      }
    }
    return info;
  }

  public getPosition(id: string): Observable<PlaceInfo | null> {
    const cached = this._cacheService.get<SparqlResult>(
      CACHE_ID,
      POS_PREFIX + id
    );
    if (cached) {
      return of(this.buildPosInfo(cached));
    }

    const query = this.buildPosQuery(id);
    return this._dbpService.get(query).pipe(
      catchError(this._errorService.handleError),
      map((r: SparqlResult) => {
        this._cacheService.add(CACHE_ID, POS_PREFIX + id, r);
        return this.buildInfo(r);
      })
    );
  }
}
