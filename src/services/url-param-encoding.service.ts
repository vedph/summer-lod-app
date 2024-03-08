import { Injectable } from '@angular/core';
import { HttpUrlEncodingCodec } from '@angular/common/http';

/**
 * Service to encode URL parameters.
 */
@Injectable({
  providedIn: 'root',
})
export class UrlParamEncodingService extends HttpUrlEncodingCodec {
  public override encodeKey(key: string): string {
    return encodeURIComponent(key);
  }

  public override encodeValue(value: string): string {
    return encodeURIComponent(value);
  }
}
