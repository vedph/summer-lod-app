import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  Subscription,
  debounceTime,
  distinctUntilChanged,
  forkJoin,
  take,
} from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NgeMonacoModule } from '@cisstech/nge/monaco';

import { NgToolsModule } from '@myrmidon/ng-tools';
import { CadmusTextEdService } from '@myrmidon/cadmus-text-ed';

import { ParsedEntity, XmlService } from '../../../services/xml.service';
import { AssetService } from '../../../services/asset.service';
import { EntityListComponent } from '../../components/entity-list/entity-list.component';

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
    NgeMonacoModule,
    NgToolsModule,
    EntityListComponent,
  ],
  providers: [CadmusTextEdService],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  private _subs?: Subscription[];
  private _xmlEditor?: monaco.editor.IStandaloneCodeEditor;
  private _xsltEditor?: monaco.editor.IStandaloneCodeEditor;
  private _xmlModel?: monaco.editor.ITextModel;
  private _xsltModel?: monaco.editor.ITextModel;

  public rendition?: string;
  public entities: ParsedEntity[] = [];

  public xml: FormControl<string>;
  public xslt: FormControl<string>;
  public error?: string;
  public busy?: boolean;

  constructor(
    private _xmlService: XmlService,
    private _assetService: AssetService,
    private _editService: CadmusTextEdService,
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

  private async applyEdit(selector: string) {
    if (!this._xmlEditor) {
      return;
    }
    const selection = this._xmlEditor.getSelection();
    const text = selection
      ? this._xmlEditor.getModel()!.getValueInRange(selection)
      : '';

    const result = await this._editService.edit({
      selector,
      text: text,
    });

    this._xmlEditor.executeEdits('my-source', [
      {
        range: selection!,
        text: result.text,
        forceMoveMarkers: true,
      },
    ]);
  }

  public onXmlEditorInit(editor: monaco.editor.IEditor) {
    editor.updateOptions({
      minimap: {
        side: 'right',
      },
      wordWrap: 'on',
      automaticLayout: true,
    });
    this._xmlModel = this._xmlModel || monaco.editor.createModel('', 'xml');
    editor.setModel(this._xmlModel);
    this._xmlEditor = editor as monaco.editor.IStandaloneCodeEditor;

    this._xmlEditor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE,
      () => {
        this.applyEdit('txt.emoji');
      }
    );
    this._xmlEditor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL,
      () => {
        this.applyEdit('lod.link');
      }
    );

    this.loadDefaultXml();
    editor.focus();
  }

  public onXsltEditorInit(editor: monaco.editor.IEditor) {
    editor.updateOptions({
      minimap: {
        side: 'right',
      },
      wordWrap: 'on',
      automaticLayout: true,
    });
    this._xsltModel = this._xsltModel || monaco.editor.createModel('', 'xml');
    editor.setModel(this._xsltModel);
    this._xsltEditor = editor as monaco.editor.IStandaloneCodeEditor;
    this.loadDefaultXslt();
  }

  private loadDefaultXml(): void {
    this.busy = true;
    this._assetService.loadText('sample.xml').subscribe({
      next: (xml) => {
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

  private loadDefaultXslt(): void {
    this.busy = true;
    this._assetService.loadText('sample.xslt').subscribe({
      next: (xslt) => {
        this.xslt.setValue(xslt);
      },
      error: (error) => {
        this.error = error.message;
      },
      complete: () => {
        this.busy = false;
      },
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
          this.xml.setValue(xml);
          this.xslt.setValue(xslt);
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
    this._subs = [];
    // xml
    this._subs.push(
      this.xml.valueChanges
        .pipe(distinctUntilChanged(), debounceTime(200))
        .subscribe(() => {
          this._xmlModel?.setValue(this.xml.value);
        })
    );
    // xslt
    this._subs.push(
      this.xslt.valueChanges
        .pipe(distinctUntilChanged(), debounceTime(200))
        .subscribe(() => this._xsltModel?.setValue(this.xslt.value))
    );
  }

  public ngOnDestroy(): void {
    this._subs?.forEach((sub) => sub.unsubscribe());
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

  private saveXmlCode(xml: string, extension = '.xml'): void {
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // create filename from date and time
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(':', '-');
    a.download = `vessdph${date}_${time}${extension}`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  public saveXml(): void {
    if (!this.xml.value) {
      return;
    }
    this.saveXmlCode(this.xml.value);
  }

  public saveXslt(): void {
    if (!this.xslt.value) {
      return;
    }
    this.saveXmlCode(this.xslt.value, '.xslt');
  }

  public loadXml(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.xml.setValue(e.target?.result as string);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  public prettifyXml(): void {
    if (this.busy) {
      return;
    }
    this.error = undefined;
    this.busy = true;

    this._xmlService.prettifyXml(this.xml.value).subscribe({
      next: (result) => {
        if (result.error) {
          this.error = result.error;
          return;
        }
        this.xml.setValue(result.xml!);
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

  public loadXslt(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xslt';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.xslt.setValue(e.target?.result as string);
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  public prettifyXslt(): void {
    if (this.busy) {
      return;
    }
    this.error = undefined;
    this.busy = true;

    this._xmlService.prettifyXml(this.xslt.value).subscribe({
      next: (result) => {
        if (result.error) {
          this.error = result.error;
          return;
        }
        this.xslt.setValue(result.xml!);
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

  public pickEntity(entity: ParsedEntity): void {
    // TODO
  }
}
