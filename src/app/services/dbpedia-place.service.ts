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
  label?: RdfTerm;
  description?: RdfTerm;
  abstract?: RdfTerm;
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

  public buildQuery(id: string, language: string = 'en'): string {
    return `PREFIX dbo: <http://dbpedia.org/ontology/>
PREFIX dbp: <http://dbpedia.org/property/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
PREFIX georss: <http://www.georss.org/georss/>
SELECT ?label ?abstract ?description ?lat ?long ?wkt ?point ?depiction ?topic
WHERE {
  BIND(<${id}> AS ?place)

  # Primary label for the specified language
  ?place rdfs:label ?label .
  FILTER(lang(?label) = "${language}")

  # Abstract
  OPTIONAL {
    ?place dbo:abstract ?abstract .
    FILTER(lang(?abstract) = "${language}")
  }

  # Description (using rdfs:comment)
  OPTIONAL {
    ?place rdfs:comment ?description .
    FILTER(lang(?description) = "${language}")
  }

  # Spatial data with multiple format support
  OPTIONAL { ?place geo:lat ?lat ; geo:long ?long . }
  OPTIONAL { ?place geo:geometry ?wkt . }
  OPTIONAL { ?place georss:point ?point . }

  # Depiction
  OPTIONAL { ?place foaf:depiction ?depiction . }

  # Wikipedia topic
  OPTIONAL { ?place foaf:isPrimaryTopicOf ?topic . }
}
LIMIT 1`;
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

  public buildInfo(result: SparqlResult, uri: string): PlaceInfo | null {
    if (!result) {
      return null;
    }
    const bindings = result.results.bindings;
    if (!bindings?.length) {
      return null;
    }

    const binding = bindings[0]; // LIMIT 1 ensures single result
    const info: PlaceInfo = {
      uri: uri,
      label: binding['label'] || undefined,
      abstract: binding['abstract'] || undefined,
      description: binding['description'] || undefined,
      depiction: binding['depiction'] || undefined,
      topic: binding['topic'] || undefined,
    };

    // Extract coordinates from multiple possible sources
    const coords = this.extractCoordinates(binding);
    if (coords.lat && coords.long) {
      info.lat = coords.lat;
      info.long = coords.long;
    }

    return info;
  }

  public getInfo(
    id: string,
    language: string = 'en',
  ): Observable<PlaceInfo | null> {
    const cacheKey = `${id}:${language}`;
    const cached = this._cacheService.get<SparqlResult>(CACHE_ID, cacheKey);
    if (cached) {
      return of(this.buildInfo(cached, id));
    }

    const query = this.buildQuery(id, language);
    console.log('query', query);
    return this._dbpService.get(query).pipe(
      catchError(this._errorService.handleError),
      map((r: SparqlResult) => {
        this._cacheService.add(CACHE_ID, cacheKey, r);
        return this.buildInfo(r, id);
      }),
    );
  }

  public buildPosInfo(result: SparqlResult, uri: string): PlaceInfo | null {
    if (!result) {
      return null;
    }
    const bindings = result.results.bindings;
    if (!bindings?.length) {
      return null;
    }
    const info: PlaceInfo = {
      uri: uri,
    };
    for (const binding of bindings) {
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
      return of(this.buildPosInfo(cached, id));
    }

    const query = this.buildPosQuery(id);
    console.log('query', query);
    return this._dbpService.get(query).pipe(
      catchError(this._errorService.handleError),
      map((r: SparqlResult) => {
        this._cacheService.add(CACHE_ID, POS_PREFIX + id, r);
        return this.buildPosInfo(r, id);
      }),
    );
  }
}
