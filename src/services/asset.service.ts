import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AssetService {
  constructor(private _http: HttpClient) {}

  /**
   * Load a text from the specified path in the shop.
   *
   * @param name The file name.
   */
  public loadText(name: string): Observable<string> {
    return this._http.get('./assets/' + name, {
      responseType: 'text',
    });
  }

  /**
   * Load an object from a JSON resource.
   *
   * @param name The file name.
   * @returns The object parsed from the loaded JSON code.
   */
  public loadObject<T>(name: string): Observable<T> {
    return this._http.get<T>('./assets/' + name + '.json');
  }
}
