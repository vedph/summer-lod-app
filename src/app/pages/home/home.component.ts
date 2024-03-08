import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { forkJoin, take } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { MonacoEditorModule } from 'ngx-monaco-editor-v2';

import { NgToolsModule } from '@myrmidon/ng-tools';

import { ParsedEntity, XmlService } from '../../../services/xml.service';
import { AssetService } from '../../../services/asset.service';
import { GeoService } from '../../../services/geo.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatTooltipModule,
    MonacoEditorModule,
    NgToolsModule,
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  public editorOptions = { theme: 'vs-dark', language: 'xml' };
  public rendition?: string;
  public entities: ParsedEntity[] = [];

  public xml: FormControl<string>;
  public xslt: FormControl<string>;
  public error?: string;
  public busy?: boolean;

  constructor(
    private _xmlService: XmlService,
    private _assetService: AssetService,
    private _lodService: GeoService,
    formBuilder: FormBuilder
  ) {
    this.xml = formBuilder.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50000)],
    });
    this.xslt = formBuilder.control<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50000)],
    });
  }

  private loadDefault(): void {
    this.busy = true;

    forkJoin([
      this._assetService.loadText('sample.xslt'),
      this._assetService.loadText('sample.xml'),
    ])
      .pipe(take(1))
      .subscribe({
        next: ([xslt, xml]) => {
          this.xslt.setValue(xslt);
          this.xml.setValue(xml);
        },
        error: (error) => {
          this.error = error.message;
        },
        complete: () => {
          this.busy = false;
        },
      });
  }

  public ngOnInit(): void {
    this.loadDefault();
  }

  public transform(): void {
    if (this.busy) {
      return;
    }
    this.error = undefined;
    this.busy = true;

    this._xmlService.renderXml(this.xml.value, this.xslt.value).subscribe({
      next: (rendition) => {
        if (rendition.error) {
          this.error = rendition.error;
          return;
        }
        this.rendition = rendition.result;
      },
      error: (error) => {
        this.error = error.message;
        console.error(JSON.stringify(error));
      },
      complete: () => {
        this.busy = false;
      },
    });
  }

  public parseEntities(): void {
    if (this.busy) {
      return;
    }
    this.error = undefined;
    this.busy = true;

    this._xmlService.parseTeiEntities(this.xml.value).subscribe({
      next: (result) => {
        if (result.error) {
          this.error = result.error;
          return;
        }
        this.entities = result.entities;
      },
      error: (error) => {
        this.error = error.message;
        console.error(JSON.stringify(error));
      },
      complete: () => {
        this.busy = false;
      },
    });
  }

  public resetCode(): void {
    this.loadDefault();
    this.rendition = undefined;
  }

  public test(): void {
    this._lodService
      .getCoordsFromDBpedia('http://dbpedia.org/resource/Rome')
      .subscribe({
        next: (coords) => {
          console.log(coords);
        },
        error: (error) => {
          console.error(error);
        },
      });
  }
}
