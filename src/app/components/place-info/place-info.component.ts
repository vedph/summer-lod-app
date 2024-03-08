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
import { LodService } from '../../../services/lod.service';

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
  private _subs?: Subscription[];
  private _langMap: Map<string, string> | undefined;

  @Input() info?: PlaceInfo;

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
}
