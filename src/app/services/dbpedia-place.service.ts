import { Injectable } from '@angular/core';
import { Observable, of, catchError, map } from 'rxjs';

import { ErrorService } from '@myrmidon/ng-tools';

import { CACHE_ID } from '../app.config';
import { DbpediaSparqlService } from './dbpedia-sparql.service';
import { LocalCacheService } from './local-cache.service';
import { LodService, RdfTerm, SparqlResult } from './lod.service';

const POS_PREFIX = 'pos.';

export interface PlaceInfo {
  uri: string;
  labels: RdfTerm[];
  description?: RdfTerm;
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
    private _lodService: LodService,
  ) {}

  /**
   * Parse coordinates from WKT POINT format: "POINT(long lat)".
   * @param wkt The WKT string.
   * @returns An object with lat and long as strings, or null if parsing fails.
   */
  private parseWkt(wkt: string): { lat: string; long: string } | null {
    const match = wkt.match(/POINT\s*\(\s*([\d.-]+)\s+([\d.-]+)\s*\)/i);
    if (match) {
      return {
        long: match[1],
        lat: match[2],
      };
    }
    return null;
  }

  /**
   * Parse coordinates from georss:point format: "lat long".
   * @param point The point string.
   * @returns An object with lat and long as strings, or null if parsing fails.
   */
  private parsePoint(point: string): { lat: string; long: string } | null {
    const parts = point.trim().split(/\s+/);
    if (parts.length === 2) {
      return {
        lat: parts[0],
        long: parts[1],
      };
    }
    return null;
  }

  /**
   * Extract coordinates from SPARQL binding, trying multiple sources.
   * Priority: geo:lat/long > georss:point > geo:geometry (WKT).
   * @param binding The SPARQL result binding.
   * @returns An object with lat and long RdfTerms, or null if no coordinates found.
   */
  private extractCoordinates(binding: any): {
    lat: RdfTerm | null;
    long: RdfTerm | null;
  } {
    let lat: RdfTerm | null = null;
    let long: RdfTerm | null = null;

    // Priority 1: Try geo:lat and geo:long
    if (binding['lat'] && binding['long']) {
      lat = binding['lat'];
      long = binding['long'];
      return { lat, long };
    }

    // Priority 2: Try georss:point
    if (binding['point']?.value) {
      const parsed = this.parsePoint(binding['point'].value);
      if (parsed) {
        lat = { type: 'literal', value: parsed.lat };
        long = { type: 'literal', value: parsed.long };
        return { lat, long };
      }
    }

    // Priority 3: Try geo:geometry (WKT)
    if (binding['wkt']?.value) {
      const parsed = this.parseWkt(binding['wkt'].value);
      if (parsed) {
        lat = { type: 'literal', value: parsed.lat };
        long = { type: 'literal', value: parsed.long };
        return { lat, long };
      }
    }

    return { lat: null, long: null };
  }

  public buildQuery(id: string, languages?: string[]): string {
    return `PREFIX dbo: <http://dbpedia.org/ontology/>
PREFIX dbp: <http://dbpedia.org/property/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
PREFIX georss: <http://www.georss.org/georss/>
SELECT DISTINCT
  <${id}> as ?place ?label
  ?topic ?depiction ?abstract ?description
  ?lat ?long ?wkt ?point
WHERE {
  <${id}> rdfs:label ?label.
  ${LodService.buildLangFilter('?label', languages)}
  OPTIONAL {
    <${id}> geo:lat ?lat;
    geo:long ?long.
  }
  OPTIONAL {
    <${id}> geo:geometry ?wkt.
  }
  OPTIONAL {
    <${id}> georss:point ?point.
  }
  OPTIONAL {
    <${id}> foaf:isPrimaryTopicOf ?topic.
  }
  OPTIONAL {
    SELECT ?depiction WHERE {
      <${id}> foaf:depiction ?depiction.
    } LIMIT 1
  }
  OPTIONAL {
    <${id}> dbo:abstract ?abstract.
    ${LodService.buildLangFilter('?abstract', languages)}
  }
  OPTIONAL {
    <${id}> dbo:description ?description.
    ${LodService.buildLangFilter('?description', languages)}
  }
}`;
  }

  public buildPosQuery(id: string): string {
    return `PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
PREFIX georss: <http://www.georss.org/georss/>
SELECT DISTINCT <${id}> as ?place ?lat ?long ?wkt ?point
WHERE {
  OPTIONAL {
    <${id}> geo:lat ?lat;
      geo:long ?long.
  }
  OPTIONAL {
    <${id}> geo:geometry ?wkt.
  }
  OPTIONAL {
    <${id}> georss:point ?point.
  }
}`;
  }

  public buildInfo(result: SparqlResult): PlaceInfo | null {
    if (!result) {
      return null;
    }
    const bindings = result.results.bindings;
    if (!bindings?.length) {
      return null;
    }
    const info: PlaceInfo = {
      uri: '',
      labels: [],
    };
    for (const binding of bindings) {
      // place (just once)
      if (!info.uri) {
        info.uri = binding['place']?.value || '';
      }

      // labels
      info.labels = this._lodService.addTerm(binding, 'label', info.labels);

      // abstract
      info.abstracts = this._lodService.addTerm(
        binding,
        'abstract',
        info.abstracts,
      );

      // description (fallback for abstract)
      info.description = this._lodService.replaceTerm(
        binding,
        'description',
        null,
        info.description || null,
      );

      // depiction
      info.depiction = this._lodService.replaceTerm(
        binding,
        'depiction',
        null,
        info.depiction || null,
      );

      // topic
      info.topic = this._lodService.replaceTerm(
        binding,
        'topic',
        null,
        info.topic || null,
      );

      // Extract coordinates from multiple possible sources
      if (!info.lat || !info.long) {
        const coords = this.extractCoordinates(binding);
        if (coords.lat && coords.long) {
          info.lat = coords.lat;
          info.long = coords.long;
        }
      }
    }
    return info;
  }

  public getInfo(id: string): Observable<PlaceInfo | null> {
    const cached = this._cacheService.get<SparqlResult>(CACHE_ID, id);
    if (cached) {
      return of(this.buildInfo(cached));
    }

    const query = this.buildQuery(id, ['en', 'it']);
    console.log('query', query);
    return this._dbpService.get(query).pipe(
      catchError(this._errorService.handleError),
      map((r: SparqlResult) => {
        this._cacheService.add(CACHE_ID, id, r);
        return this.buildInfo(r);
      }),
    );
  }

  public buildPosInfo(result: SparqlResult): PlaceInfo | null {
    if (!result) {
      return null;
    }
    const bindings = result.results.bindings;
    if (!bindings?.length) {
      return null;
    }
    const info: PlaceInfo = {
      uri: '',
      labels: [],
    };
    for (const binding of bindings) {
      // place (just once)
      if (!info.uri) {
        info.uri = binding['place']?.value || '';
      }

      // Extract coordinates from multiple possible sources
      if (!info.lat || !info.long) {
        const coords = this.extractCoordinates(binding);
        if (coords.lat && coords.long) {
          info.lat = coords.lat;
          info.long = coords.long;
          break;
        }
      }
    }
    return info;
  }

  public getPosition(id: string): Observable<PlaceInfo | null> {
    const cached = this._cacheService.get<SparqlResult>(
      CACHE_ID,
      POS_PREFIX + id,
    );
    if (cached) {
      console.log(`Cache hit for place ${id}`, cached);
      return of(this.buildPosInfo(cached));
    }

    const query = this.buildPosQuery(id);
    console.log('query', query);
    return this._dbpService.get(query).pipe(
      catchError(this._errorService.handleError),
      map((r: SparqlResult) => {
        this._cacheService.add(CACHE_ID, POS_PREFIX + id, r);
        return this.buildPosInfo(r);
      }),
    );
  }
}
