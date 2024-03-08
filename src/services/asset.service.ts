import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

/**
 * Service to load assets from the assets folder.
 */
@Injectable({
  providedIn: 'root',
})
export class AssetService {
  constructor(private _http: HttpClient) {}

  /**
   * Load a text from the specified path.
   *
   * @param path The file path (relative to the assets folder).
   */
  public loadText(path: string): Observable<string> {
    return this._http.get('./assets/' + path, {
      responseType: 'text',
    });
  }

  /**
   * Load an object from a JSON resource.
   *
   * @param path The file path (relative to the assets folder).
   * @returns The object parsed from the loaded JSON code.
   */
  public loadObject<T>(path: string): Observable<T> {
    return this._http.get<T>('./assets/' + path + '.json');
  }
}
