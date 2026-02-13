import {
  ChangeDetectionStrategy,
  Component,
  computed,
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

import { PersonInfo } from '../../services/dbpedia-person.service';
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
export class PersonInfoComponent implements OnInit, OnDestroy {
  private readonly _lodService = inject(LodService);
  private _langMap?: Map<string, string>;
  private _sub?: Subscription;

  // Signal input
  readonly info = input<PersonInfo | null | undefined>(null);

  // Derived: available languages from abstracts
  readonly languages = computed(() => {
    const abstracts = this.info()?.abstracts;
    return abstracts ? this._lodService.getLanguages(abstracts) : [];
  });

  // Language selector FormControl
  readonly language = new FormControl<string | null>(null);

  // Selected abstract text
  readonly selectedAbstract = signal<string | undefined>(undefined);

  constructor() {
    const assetService = inject(AssetService);
    assetService.loadIsoCodes().subscribe((map) => {
      this._langMap = map;
    });

    // Auto-select language when languages change
    effect(() => {
      const langs = this.languages();
      if (langs.length > 0) {
        const browserLang = navigator.language.split('-')[0];
        if (langs.includes(browserLang)) {
          this.language.setValue(browserLang);
        } else if (langs.includes('en')) {
          this.language.setValue('en');
        } else {
          this.language.setValue(null);
        }
      }
    });
  }

  ngOnInit(): void {
    this._sub = this.language.valueChanges.subscribe(() => {
      const langs = this.languages();
      const abstracts = this.info()?.abstracts;
      if (langs && abstracts) {
        const i = langs.findIndex((l) => this.language.value === l);
        this.selectedAbstract.set(abstracts[i]?.value);
      }
    });
  }

  ngOnDestroy(): void {
    this._sub?.unsubscribe();
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
