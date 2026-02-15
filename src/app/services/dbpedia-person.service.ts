import { Injectable } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';

import { ErrorService } from '@myrmidon/ng-tools';

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

  # Name (try multiple properties)
  OPTIONAL {
    ?person foaf:name ?name.
    FILTER(lang(?name) = "${language}")
  }
  OPTIONAL {
    ?person dbp:name ?name.
    FILTER(lang(?name) = "${language}")
  }
  OPTIONAL {
    ?person rdfs:label ?name.
    FILTER(lang(?name) = "${language}")
  }

  # Abstract - try without strict language filter to see if it exists
  OPTIONAL {
    ?person dbo:abstract ?abstract.
    FILTER(lang(?abstract) = "${language}" || lang(?abstract) = "")
  }

  # Description (using rdfs:comment)
  OPTIONAL {
    ?person rdfs:comment ?description.
    FILTER(lang(?description) = "${language}" || lang(?description) = "")
  }

  # Birth information
  OPTIONAL {
    ?person dbo:birthDate ?birth_date.
  }
  OPTIONAL {
    ?person dbo:birthPlace ?birth_place.
    OPTIONAL {
      ?birth_place rdfs:label ?birth_place_label.
      FILTER(lang(?birth_place_label) = "${language}")
    }
  }

  # Death information
  OPTIONAL {
    ?person dbo:deathDate ?death_date.
  }
  OPTIONAL {
    ?person dbo:deathPlace ?death_place.
    OPTIONAL {
      ?death_place rdfs:label ?death_place_label.
      FILTER(lang(?death_place_label) = "${language}")
    }
  }

  # Depiction
  OPTIONAL {
    ?person foaf:depiction ?depiction.
  }

  # Wikipedia topic
  OPTIONAL {
    ?person foaf:isPrimaryTopicOf ?topic.
  }
}
LIMIT 10`;
  }

  public buildInfo(result: SparqlResult, uri: string): PersonInfo | null {
    if (!result) {
      return null;
    }
    const bindings = result.results.bindings;
    if (!bindings?.length) {
      return null;
    }

    console.log('Person bindings received (all rows):', bindings);

    // Find the first binding with abstract or description
    let bestBinding = bindings[0];
    for (const binding of bindings) {
      if (binding['abstract'] || binding['description']) {
        bestBinding = binding;
        break;
      }
    }

    console.log('Person best binding selected:', bestBinding);

    const info: PersonInfo = {
      uri: uri,
      name: bestBinding['name'] || undefined,
      abstract: bestBinding['abstract'] || undefined,
      description: bestBinding['description'] || undefined,
      birthDate: bestBinding['birth_date'] || undefined,
      birthPlace: bestBinding['birth_place'] || undefined,
      birthPlaceLabel: bestBinding['birth_place_label'] || undefined,
      deathDate: bestBinding['death_date'] || undefined,
      deathPlace: bestBinding['death_place'] || undefined,
      deathPlaceLabel: bestBinding['death_place_label'] || undefined,
      depiction: bestBinding['depiction'] || undefined,
      topic: bestBinding['topic'] || undefined,
    };

    console.log('Person info built:', info);

    return info;
  }

  public getInfo(
    id: string,
    language: string = 'en',
  ): Observable<PersonInfo | null> {
    const cacheKey = `${id}:${language}`;
    const cached = this._cacheService.get<SparqlResult>(CACHE_ID, cacheKey);
    if (cached) {
      console.log(`Cache hit for person ${id}`, cached);
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
}
