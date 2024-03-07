import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, retry } from 'rxjs';

import { EnvService, ErrorService } from '@myrmidon/ng-tools';

export interface Entity {
  ids: string[];
  type: string;
  names: string[];
  links?: string[];
  description?: string;
}

export interface XmlRendition {
  result?: string;
  error?: string;
}

export interface EntityList {
  entities: Entity[];
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class XmlService {
  constructor(
    private _http: HttpClient,
    private _error: ErrorService,
    private _env: EnvService
  ) {}

  public renderXml(xml: string, xslt: string): Observable<XmlRendition> {
    return this._http
      .post<XmlRendition>(`${this._env.get('apiUrl')}xml/rendition`, {
        xml: xml,
        xslt: xslt,
      })
      .pipe(catchError(this._error.handleError));
  }

  public parseTeiEntities(xml: string): Observable<EntityList> {
    return this._http
      .post<EntityList>(`${this._env.get('apiUrl')}xml/entities`, {
        xml: xml,
      })
      .pipe(catchError(this._error.handleError));
  }
}
