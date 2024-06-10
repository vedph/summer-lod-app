import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

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

  /**
   * Load the list of ISO639-1 (2-letters) codes from assets.
   * @returns A map with key=code and value=name.
   */
  public loadIsoCodes(): Observable<Map<string, string>> {
    return this.loadText('iso639.csv').pipe(
      map((csv) => {
        const map = new Map<string, string>();
        let j: number,
          i = 0;
        while ((j = csv.indexOf('\n', i)) !== -1) {
          const line = csv.substring(i, j);
          const cols = line.split(',');
          map.set(cols[0], cols[1]);
          i = j + 1;
        }
        return map;
      })
    );
  }
}
