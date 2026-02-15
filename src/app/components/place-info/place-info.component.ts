import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PlaceInfo, DbpediaPlaceService } from '../../services/dbpedia-place.service';
import { AssetService } from '../../services/asset.service';

@Component({
  selector: 'app-place-info',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './place-info.component.html',
  styleUrl: './place-info.component.scss',
})
export class PlaceInfoComponent implements OnInit, OnDestroy {
  private readonly _placeService = inject(DbpediaPlaceService);
  private _langMap?: Map<string, string>;
  private _sub?: Subscription;

  // Signal inputs
  readonly uri = input<string | null | undefined>(null);

  // Language selector FormControl
  readonly language = new FormControl<string>('en');

  // Available languages
  readonly languages = ['en', 'it'];

  // Fetched place info
  readonly info = signal<PlaceInfo | null>(null);
  readonly busy = signal<boolean>(false);

  constructor() {
    const assetService = inject(AssetService);
    assetService.loadIsoCodes().subscribe((map) => {
      this._langMap = map;
    });

    // Fetch place info when URI or language changes
    effect(() => {
      const currentUri = this.uri();
      const currentLang = this.language.value;
      if (currentUri && currentLang) {
        this.fetchPlaceInfo(currentUri, currentLang);
      }
    });
  }

  ngOnInit(): void {
    this._sub = this.language.valueChanges.subscribe((lang) => {
      const currentUri = this.uri();
      if (currentUri && lang) {
        this.fetchPlaceInfo(currentUri, lang);
      }
    });
  }

  ngOnDestroy(): void {
    this._sub?.unsubscribe();
  }

  private fetchPlaceInfo(uri: string, language: string): void {
    this.busy.set(true);
    this._placeService.getInfo(uri, language).subscribe((info) => {
      this.info.set(info);
      this.busy.set(false);
    });
  }

  getLangName(code: string): string {
    return this._langMap?.get(code) ?? code;
  }
}
