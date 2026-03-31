import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PersonInfo, DbpediaPersonService } from '../../services/dbpedia-person.service';
import { AssetService } from '../../services/asset.service';
import { LodService, RdfTerm } from '../../services/lod.service';

@Component({
  selector: 'app-person-info',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './person-info.component.html',
  styleUrl: './person-info.component.scss',
})
export class PersonInfoComponent {
  private readonly _personService = inject(DbpediaPersonService);
  private readonly _lodService = inject(LodService);
  private _langMap?: Map<string, string>;

  // Signal inputs
  readonly uri = input<string | null | undefined>(null);

  // Language selector FormControl
  readonly language = new FormControl<string>('en');
  private readonly _language = toSignal(this.language.valueChanges, {
    initialValue: 'en',
  });

  // Available languages
  readonly languages = ['en', 'it'];

  // Fetched person info
  readonly info = signal<PersonInfo | null>(null);
  readonly busy = signal<boolean>(false);

  constructor() {
    const assetService = inject(AssetService);
    assetService.loadIsoCodes().subscribe((map) => {
      this._langMap = map;
    });

    // Fetch person info when URI or language changes (both tracked reactively)
    effect(() => {
      const currentUri = this.uri();
      const currentLang = this._language();
      if (currentUri && currentLang) {
        this.fetchPersonInfo(currentUri, currentLang);
      }
    });
  }

  private fetchPersonInfo(uri: string, language: string): void {
    this.busy.set(true);
    this._personService.getInfo(uri, language).subscribe((info) => {
      this.info.set(info);
      this.busy.set(false);
    });
  }

  getLangName(code: string): string {
    return this._langMap?.get(code) ?? code;
  }

  getYear(date: string): number {
    const m = /^([0-9]+)/.exec(date);
    return m ? parseInt(m[1], 10) : 0;
  }

  getIdFromUri(uri: string): string {
    return this._lodService.getIdFromUri(uri);
  }

  getAge(birthDate?: RdfTerm, deathDate?: RdfTerm): number {
    if (!birthDate || !deathDate) return 0;
    return this.getYear(deathDate.value) - this.getYear(birthDate.value);
  }
}
