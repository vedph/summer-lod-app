import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { ErrorService } from '@myrmidon/ng-tools';

import { CACHE_ID } from '../app.config';
import { DbpediaSparqlService } from './dbpedia-sparql.service';
import { LocalCacheService } from './local-cache.service';
import { LodService, RdfTerm, SparqlResult } from './lod.service';

export interface PersonInfo {
  uri: string | null;
  names: RdfTerm[];
  abstracts?: RdfTerm[];
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
    private _dbpService: DbpediaSparqlService,
    private _cacheService: LocalCacheService,
    private _errorService: ErrorService,
    private _lodService: LodService
  ) {}

  public buildQuery(id: string, languages?: string[]): string {
    return `PREFIX dbp: <http://dbpedia.org/property/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX owl: <http://www.w3.org/2002/07/owl#>

    SELECT DISTINCT <${id}> as ?person ?name
      ?birth_date ?birth_place ?birth_place_label
      ?death_date ?death_place ?death_place_label
      ?topic ?depiction ?abstract
    WHERE {
      <${id}> a owl:Thing.
      OPTIONAL {
        <${id}> dbp:title ?name.
        ${LodService.buildLangFilter('?name', languages)}
      }
      OPTIONAL {
        <${id}> foaf:name ?name.
        ${LodService.buildLangFilter('?name', languages)}
      }
      OPTIONAL {
        <${id}> dbo:birthDate ?birth_date.
       }
      OPTIONAL {
        <${id}> dbo:deathDate ?death_date.
      }
      OPTIONAL {
        <${id}> foaf:isPrimaryTopicOf ?topic.
      }
      OPTIONAL {
        <${id}> foaf:depiction ?depiction.
      }
      OPTIONAL {
        <${id}> dbo:abstract ?abstract.
        ${LodService.buildLangFilter('?abstract', languages)}
      }
      OPTIONAL {
        <${id}> dbo:birthPlace ?birth_place.
        ?birth_place rdfs:label ?birth_place_label.
        ${LodService.buildLangFilter('?birth_place_label', languages)}
      }
      OPTIONAL {
        <${id}> dbo:deathPlace ?death_place.
        ?death_place rdfs:label ?death_place_label.
        ${LodService.buildLangFilter('?death_place_label', languages)}
      }
    }`;
  }

  public buildInfo(result: SparqlResult): PersonInfo | null {
    if (!result) {
      return null;
    }
    const bindings = result.results.bindings;
    const info: PersonInfo = {
      uri: null,
      names: [],
    };
    for (const binding of bindings) {
      // person (just once)
      if (!info.uri) {
        info.uri = binding['person'].value;
      }

      // name
      info.names = this._lodService.addTerm(binding, 'name', info.names);

      // abstract
      info.abstracts = this._lodService.addTerm(
        binding,
        'abstract',
        info.abstracts
      );

      // birth_date
      info.birthDate = this._lodService.replaceTerm(
        binding,
        'birth_date',
        null,
        info.birthDate || null
      );

      // birth_place
      info.birthPlace = this._lodService.replaceTerm(
        binding,
        'birth_place',
        null,
        info.birthPlace || null
      );

      // birth_place_label
      info.birthPlaceLabel = this._lodService.replaceTerm(
        binding,
        'birth_place_label',
        null,
        info.birthPlaceLabel || null
      );

      // death_date
      info.deathDate = this._lodService.replaceTerm(
        binding,
        'death_date',
        null,
        info.deathDate || null
      );

      // death_place
      info.deathPlace = this._lodService.replaceTerm(
        binding,
        'death_place',
        null,
        info.deathPlace || null
      );

      // death_place_label
      info.deathPlaceLabel = this._lodService.replaceTerm(
        binding,
        'death_place_label',
        null,
        info.deathPlaceLabel || null
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
    }
    return info;
  }

  public getInfo(id: string): Observable<PersonInfo | null> {
    const cached = this._cacheService.get<SparqlResult>(CACHE_ID, id);
    if (cached) {
      console.log(`Cache hit for person ${id}`, cached);
      return of(this.buildInfo(cached));
    }

    const query = this.buildQuery(id, ['en', 'it']);
    console.log('query', query);
    return this._dbpService.get(query).pipe(
      catchError(this._errorService.handleError),
      map((r: SparqlResult) => {
        this._cacheService.add(CACHE_ID, id, r);
        return this.buildInfo(r);
      })
    );
  }
}
