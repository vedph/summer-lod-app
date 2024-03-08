import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Subscription } from 'rxjs';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';

import { PlaceInfo } from '../../../services/dbpedia-place.service';
import { AssetService } from '../../../services/asset.service';
import { LodService, RdfTerm } from '../../../services/lod.service';

@Component({
  selector: 'app-place-info',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
  ],
  templateUrl: './place-info.component.html',
  styleUrl: './place-info.component.scss',
})
export class PlaceInfoComponent {
  private _info: PlaceInfo | null = null;
  private _subs?: Subscription[];
  private _langMap?: Map<string, string>;

  @Input()
  public get info(): PlaceInfo | null {
    return this._info;
  }

  public set info(value: PlaceInfo | null | undefined) {
    if (this._info === value) {
      return;
    }
    this._info = value || null;
    this.updateLanguages(value?.abstracts);
  }

  public languages?: string[];
  public language: FormControl<string | null>;
  public selectedAbstract?: string;

  public busy: boolean | undefined;

  constructor(
    private _lodService: LodService,
    assetService: AssetService,
    formBuilder: FormBuilder
  ) {
    assetService.loadIsoCodes().subscribe((map) => {
      this._langMap = map;
    });
    this.language = formBuilder.control<string | null>(null);
  }

  public ngOnInit(): void {
    this._subs = [
      this.language.valueChanges.subscribe((_) => {
        if (this.languages && this.info?.abstracts) {
          const i = this.languages.findIndex((l) => {
            return this.language.value === l;
          });
          this.selectedAbstract = this.info.abstracts[i]?.value;
        }
      }),
    ];
  }

  public ngOnDestroy(): void {
    this._subs?.forEach((s) => s.unsubscribe());
  }

  private updateLanguages(abstracts: RdfTerm[] | undefined): void {
    if (abstracts) {
      this.languages = this._lodService.getLanguages(abstracts);
      // select the browser's language if available, else english if available
      const lang = navigator.language.split('-')[0];
      if (this.languages.includes(lang)) {
        this.language.setValue(lang);
      } else if (this.languages.includes('en')) {
        this.language.setValue('en');
      } else {
        this.language.setValue(null);
      }
    } else {
      this.languages = [];
    }
  }

  public getLangName(code: string): string {
    const name = this._langMap?.get(code);
    return name ? name : code;
  }
}
