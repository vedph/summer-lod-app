import { Component, Input, OnDestroy, OnInit } from '@angular/core';

import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subscription } from 'rxjs';

import { PersonInfo } from '../../../services/dbpedia-person.service';
import { AssetService } from '../../../services/asset.service';
import { LodService, RdfTerm } from '../../../services/lod.service';

@Component({
  selector: 'app-person-info',
  standalone: true,
  imports: [
    CommonModule,
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
  private _subs?: Subscription[];
  private _langMap: Map<string, string> | undefined;

  @Input() info?: PersonInfo;

  public languages: string[] | undefined;
  public language: FormControl<string | null>;
  public selectedAbstract: string | undefined;

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
          this.selectedAbstract = this.info.abstracts[i].value;
        }
      }),
    ];
  }

  public ngOnDestroy(): void {
    this._subs?.forEach((s) => s.unsubscribe());
  }

  public getLangName(code: string): string {
    const name = this._langMap?.get(code);
    return name ? name : code;
  }

  public getYear(date: string): number {
    const m = /^([0-9]+)/.exec(date);
    return m ? parseInt(m[1], 10) : 0;
  }

  public getIdFromUri(uri: string): string {
    return this._lodService.getIdFromUri(uri);
  }

  public getAge(birthDate?: RdfTerm, deathDate?: RdfTerm) {
    if (!birthDate || !deathDate) {
      return 0;
    }
    return this.getYear(deathDate.value) - this.getYear(birthDate.value);
  }
}
