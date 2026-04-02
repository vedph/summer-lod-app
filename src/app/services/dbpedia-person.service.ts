import { Injectable } from '@angular/core';
import { Observable, catchError, map, of, switchMap } from 'rxjs';
import { HttpClient } from '@angular/common/http';

import { ErrorService } from '@myrmidon/ngx-tools';

import { CACHE_ID } from '../app.config';
import { DbpediaSparqlService } from './dbpedia-sparql.service';
import { LocalCacheService } from './local-cache.service';
import { RdfTerm, SparqlResult } from './lod.service';

export interface PersonInfo {
  uri: string;
  name?: RdfTerm;
  abstract?: RdfTerm;
  description?: RdfTerm;
  birthDate?: RdfTerm;
  birthPlace?: RdfTerm;
  birthPlaceLabel?: RdfTerm;
  deathDate?: RdfTerm;
  deathPlace?: RdfTerm;
  deathPlaceLabel?: RdfTerm;
  depiction?: RdfTerm;
  topic?: RdfTerm;
}

/**
 * Service to get data from DBPedia about people.
 */
@Injectable({
  providedIn: 'root',
})
export class DbpediaPersonService {
  constructor(
    private _http: HttpClient,
    private _dbpService: DbpediaSparqlService,
    private _cacheService: LocalCacheService,
    private _errorService: ErrorService,
  ) {}

  public buildQuery(id: string, language: string = 'en'): string {
    return `PREFIX dbo: <http://dbpedia.org/ontology/>
PREFIX dbp: <http://dbpedia.org/property/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>

SELECT ?name ?abstract ?description
  ?birth_date ?birth_place ?birth_place_label
  ?death_date ?death_place ?death_place_label
  ?topic ?depiction
WHERE {
  BIND(<${id}> AS ?person)

  # Canonical label as name
  OPTIONAL {
    ?person rdfs:label ?name.
    FILTER(langMatches(lang(?name), "${language}"))
  }

  # Abstract (dbo:abstract; may be absent from current DBpedia endpoint)
  OPTIONAL {
    ?person dbo:abstract ?abstract.
    FILTER(langMatches(lang(?abstract), "${language}"))
  }

  # Short description
  OPTIONAL {
    ?person rdfs:comment ?description.
    FILTER(langMatches(lang(?description), "${language}"))
  }

  # Birth date (dbo:birthDate for modern; dbp:born as fallback for ancient)
  OPTIONAL { ?person dbo:birthDate ?birth_date. }
  OPTIONAL { ?person dbp:born ?birth_date_raw. }

  OPTIONAL {
    ?person dbo:birthPlace ?birth_place.
    OPTIONAL {
      ?birth_place rdfs:label ?birth_place_label.
      FILTER(langMatches(lang(?birth_place_label), "${language}"))
    }
  }

  # Death date (dbo:deathDate for modern; dbp:died as fallback for ancient)
  OPTIONAL { ?person dbo:deathDate ?death_date. }
  OPTIONAL { ?person dbp:died ?death_date_raw. }

  OPTIONAL {
    ?person dbo:deathPlace ?death_place.
    OPTIONAL {
      ?death_place rdfs:label ?death_place_label.
      FILTER(langMatches(lang(?death_place_label), "${language}"))
    }
  }

  # Depiction
  OPTIONAL { ?person foaf:depiction ?depiction. }

  # Wikipedia topic
  OPTIONAL { ?person foaf:isPrimaryTopicOf ?topic. }
}
LIMIT 20`;
  }

  public buildInfo(result: SparqlResult, uri: string): PersonInfo | null {
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
    const info: PersonInfo = { uri };

    for (const b of bindings) {
      if (!info.name && b['name']) info.name = b['name'];
      if (!info.abstract && b['abstract']) info.abstract = b['abstract'];
      if (!info.description && b['description']) info.description = b['description'];
      // prefer typed dbo:birthDate; fall back to raw dbp:born string
      if (!info.birthDate && b['birth_date']) info.birthDate = b['birth_date'];
      if (!info.birthDate && b['birth_date_raw']) info.birthDate = b['birth_date_raw'];
      if (!info.birthPlace && b['birth_place']) info.birthPlace = b['birth_place'];
      if (!info.birthPlaceLabel && b['birth_place_label']) info.birthPlaceLabel = b['birth_place_label'];
      // prefer typed dbo:deathDate; fall back to raw dbp:died string
      if (!info.deathDate && b['death_date']) info.deathDate = b['death_date'];
      if (!info.deathDate && b['death_date_raw']) info.deathDate = b['death_date_raw'];
      if (!info.deathPlace && b['death_place']) info.deathPlace = b['death_place'];
      if (!info.deathPlaceLabel && b['death_place_label']) info.deathPlaceLabel = b['death_place_label'];
      if (!info.depiction && b['depiction']) info.depiction = b['depiction'];
      if (!info.topic && b['topic']) info.topic = b['topic'];
    }

    return info;
  }

  /**
   * Fetch extract + short description from the Wikipedia REST API for the
   * requested language. The topic URL (foaf:isPrimaryTopicOf) always points
   * to the English Wikipedia article. For non-English requests we first try
   * the target-language edition with the same title (Wikipedia redirects often
   * handle this), and fall back to a langlinks lookup when it doesn't.
   * The `description` field in the API response is the Wikidata short
   * description and provides a reliable multilingual fallback.
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

    // Non-English: try direct call first (works when Wikipedia has a redirect,
    // e.g. "Plato" → "Platone" on it.wikipedia.org)
    return this._http.get<any>(summaryUrl(language, title)).pipe(
      switchMap(r => {
        if (r?.extract) return of(parse(r));
        // No extract: look up the correct title via the langlinks API
        const linksUrl =
          `https://en.wikipedia.org/w/api.php?action=query` +
          `&titles=${encodeURIComponent(title)}` +
          `&prop=langlinks&lllang=${language}&format=json&origin=*`;
        return this._http.get<any>(linksUrl).pipe(
          switchMap(linksData => {
            const pages = linksData?.query?.pages;
            const page = pages ? (Object.values(pages)[0] as any) : null;
            const langTitle: string | undefined = page?.langlinks?.[0]?.['*'];
            if (!langTitle) return of(parse(r)); // use whatever came from the direct call
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
  ): Observable<PersonInfo | null> {
    const cacheKey = `${id}:${language}`;
    const cached = this._cacheService.get<SparqlResult>(CACHE_ID, cacheKey);

    const sparql$: Observable<PersonInfo | null> = cached
      ? of(this.buildInfo(cached, id))
      : this._dbpService.get(this.buildQuery(id, language)).pipe(
          catchError(this._errorService.handleError),
          map((r: SparqlResult) => {
            this._cacheService.add(CACHE_ID, cacheKey, r);
            return this.buildInfo(r, id);
          }),
        );

    return sparql$.pipe(
      switchMap((info: PersonInfo | null) => {
        if (!info || !info.topic?.value) return of(info);
        // Skip Wikipedia call only if SPARQL already returned both fields
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
}
