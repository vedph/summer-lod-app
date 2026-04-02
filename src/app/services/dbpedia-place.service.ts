import { Injectable } from '@angular/core';
import { Observable, of, catchError, map, switchMap } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { ErrorService } from '@myrmidon/ngx-tools';

import { CACHE_ID } from '../app.config';
import { DbpediaSparqlService } from './dbpedia-sparql.service';
import { LocalCacheService } from './local-cache.service';
import { RdfTerm, SparqlResult } from './lod.service';

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
    private _http: HttpClient,
    private _dbpService: DbpediaSparqlService,
    private _cacheService: LocalCacheService,
    private _errorService: ErrorService,
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
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
PREFIX geo: <http://www.w3.org/2003/01/geo/wgs84_pos#>
PREFIX georss: <http://www.georss.org/georss/>
SELECT ?label ?abstract ?description ?lat ?long ?wkt ?point ?depiction ?topic
WHERE {
  BIND(<${id}> AS ?place)

  # Label in the requested language (OPTIONAL so coordinates still return
  # even when no label exists in this language)
  OPTIONAL {
    ?place rdfs:label ?label .
    FILTER(langMatches(lang(?label), "${language}"))
  }

  # Abstract (dbo:abstract; English coverage is best, other languages limited)
  OPTIONAL {
    ?place dbo:abstract ?abstract .
    FILTER(langMatches(lang(?abstract), "${language}"))
  }

  # Short description — rdfs:comment has broader multilingual coverage
  OPTIONAL {
    ?place rdfs:comment ?description .
    FILTER(langMatches(lang(?description), "${language}"))
  }

  # Spatial data: try direct lat/long, then WKT, then georss:point
  OPTIONAL { ?place geo:lat ?lat ; geo:long ?long . }
  OPTIONAL { ?place geo:geometry ?wkt . }
  OPTIONAL { ?place georss:point ?point . }

  # Depiction
  OPTIONAL { ?place foaf:depiction ?depiction . }

  # Wikipedia topic
  OPTIONAL { ?place foaf:isPrimaryTopicOf ?topic . }
}
LIMIT 20`;
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

    // Merge all bindings: each row may carry a different subset of data
    // (e.g. one row has abstract, another has coordinates) — take the first
    // non-null value encountered for each field.
    const info: PlaceInfo = { uri };

    for (const b of bindings) {
      if (!info.label && b['label']) info.label = b['label'];
      if (!info.abstract && b['abstract']) info.abstract = b['abstract'];
      if (!info.description && b['description']) info.description = b['description'];
      if (!info.depiction && b['depiction']) info.depiction = b['depiction'];
      if (!info.topic && b['topic']) info.topic = b['topic'];

      if (!info.lat || !info.long) {
        const coords = this.extractCoordinates(b);
        if (coords.lat && coords.long) {
          info.lat = coords.lat;
          info.long = coords.long;
        }
      }
    }

    return info;
  }

  /**
   * Fetch extract + short description from the Wikipedia REST API for the
   * requested language. See DbpediaPersonService.getWikipediaData for the
   * full strategy (direct call → langlinks fallback → Wikidata description).
   */
  private getWikipediaData(
    topicUrl: string,
    language: string,
  ): Observable<{ extract: string | null; description: string | null }> {
    const m = /\/wiki\/([^#?]+)/.exec(topicUrl);
    if (!m) return of({ extract: null, description: null });
    const title = decodeURIComponent(m[1]);

    const parse = (r: any) => ({
      extract: (r?.extract as string) || null,
      description: (r?.description as string) || null,
    });
    const empty = of({ extract: null, description: null });

    const summaryUrl = (lang: string, t: string) =>
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}`;

    if (language === 'en') {
      return this._http.get<any>(summaryUrl('en', title)).pipe(
        map(parse),
        catchError(() => empty),
      );
    }

    return this._http.get<any>(summaryUrl(language, title)).pipe(
      switchMap(r => {
        if (r?.extract) return of(parse(r));
        const linksUrl =
          `https://en.wikipedia.org/w/api.php?action=query` +
          `&titles=${encodeURIComponent(title)}` +
          `&prop=langlinks&lllang=${language}&format=json&origin=*`;
        return this._http.get<any>(linksUrl).pipe(
          switchMap(linksData => {
            const pages = linksData?.query?.pages;
            const page = pages ? (Object.values(pages)[0] as any) : null;
            const langTitle: string | undefined = page?.langlinks?.[0]?.['*'];
            if (!langTitle) return of(parse(r));
            return this._http.get<any>(summaryUrl(language, langTitle)).pipe(
              map(parse),
              catchError(() => of(parse(r))),
            );
          }),
          catchError(() => of(parse(r))),
        );
      }),
      catchError(() => empty),
    );
  }

  public getInfo(
    id: string,
    language: string = 'en',
  ): Observable<PlaceInfo | null> {
    const cacheKey = `${id}:${language}`;
    const cached = this._cacheService.get<SparqlResult>(CACHE_ID, cacheKey);

    const sparql$: Observable<PlaceInfo | null> = cached
      ? of(this.buildInfo(cached, id))
      : this._dbpService.get(this.buildQuery(id, language)).pipe(
          catchError(this._errorService.handleError),
          map((r: SparqlResult) => {
            this._cacheService.add(CACHE_ID, cacheKey, r);
            return this.buildInfo(r, id);
          }),
        );

    return sparql$.pipe(
      switchMap((info: PlaceInfo | null) => {
        if (!info || !info.topic?.value) return of(info);
        if (info.abstract?.value && info.description?.value) return of(info);
        return this.getWikipediaData(info.topic.value, language).pipe(
          map(data => {
            if (!info.abstract?.value && data.extract) {
              info.abstract = { type: 'literal', value: data.extract, 'xml:lang': language };
            }
            if (!info.description?.value && data.description) {
              info.description = { type: 'literal', value: data.description, 'xml:lang': language };
            }
            return info;
          }),
        );
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
