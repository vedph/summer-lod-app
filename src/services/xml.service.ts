import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError } from 'rxjs';

import { EnvService, ErrorService } from '@myrmidon/ng-tools';

import { GeoPoint } from './geo.service';

export interface ParsedEntity {
  ids: string[];
  type: string;
  names: string[];
  links?: string[];
  description?: string;
  // supplied by entity list
  point?: GeoPoint;
}

export interface XmlResult {
  xml?: string;
  error?: string;
}

export interface XmlRendition {
  result?: string;
  error?: string;
}

export interface ParsedEntityList {
  entities: ParsedEntity[];
  error?: string;
}

/**
 * Service to handle XML transform and parsing via backend.
 */
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

  public parseTeiEntities(xml: string): Observable<ParsedEntityList> {
    return this._http
      .post<ParsedEntityList>(`${this._env.get('apiUrl')}xml/entities`, {
        xml: xml,
      })
      .pipe(catchError(this._error.handleError));
  }

  public prettifyXml(xml: string): Observable<XmlResult> {
    return this._http
      .post<XmlResult>(`${this._env.get('apiUrl')}xml/prettify`, {
        xml: xml,
      })
      .pipe(catchError(this._error.handleError));
  }
}
