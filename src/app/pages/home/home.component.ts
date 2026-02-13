import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import {
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
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NgeMonacoModule } from '@cisstech/nge/monaco';

import { NgToolsModule } from '@myrmidon/ng-tools';
import { CadmusTextEdService } from '@myrmidon/cadmus-text-ed';

import { ParsedEntity, XmlService } from '../../services/xml.service';
import { AssetService } from '../../services/asset.service';
import { EntityListComponent } from '../../components/entity-list/entity-list.component';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatExpansionModule,
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
  private readonly _xmlService = inject(XmlService);
  private readonly _assetService = inject(AssetService);
  private readonly _editService = inject(CadmusTextEdService);
  private readonly _snackbar = inject(MatSnackBar);
  private readonly _cdr = inject(ChangeDetectorRef);

  private _subs?: Subscription[];
  private _xmlEditor?: monaco.editor.IStandaloneCodeEditor;
  private _xsltEditor?: monaco.editor.IStandaloneCodeEditor;
  private _xmlModel?: monaco.editor.ITextModel;
  private _xsltModel?: monaco.editor.ITextModel;

  // Signal state
  readonly rendition = signal<string | undefined>(undefined);
  readonly entities = signal<ParsedEntity[]>([]);
  readonly error = signal<string | undefined>(undefined);
  readonly busy = signal(false);

  // FormControls (kept for Monaco integration)
  readonly xml: FormControl<string>;
  readonly xslt: FormControl<string>;

  constructor() {
    this.xml = new FormControl<string>('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(50000)],
    });
    this.xslt = new FormControl<string>('', {
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

  onXmlEditorInit(editor: monaco.editor.IEditor) {
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

  onXsltEditorInit(editor: monaco.editor.IEditor) {
    editor.updateOptions({
      minimap: {
        side: 'right',
      },
      wordWrap: 'on',
      automaticLayout: true,
    });
    this._xsltModel =
      this._xsltModel || monaco.editor.createModel('', 'xml');
    editor.setModel(this._xsltModel);
    this._xsltEditor = editor as monaco.editor.IStandaloneCodeEditor;
    this.loadDefaultXslt();
  }

  private loadDefaultXml(): void {
    this.busy.set(true);
    this._assetService.loadText('sample.xml').subscribe({
      next: (xml) => this.xml.setValue(xml),
      error: (err) => this.error.set(err.message),
      complete: () => this.busy.set(false),
    });
  }

  private loadDefaultXslt(): void {
    this.busy.set(true);
    this._assetService.loadText('sample.xslt').subscribe({
      next: (xslt) => this.xslt.setValue(xslt),
      error: (err) => this.error.set(err.message),
      complete: () => this.busy.set(false),
    });
  }

  private loadDefault(): void {
    this.busy.set(true);

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
        error: (err) => this.error.set(err.message),
        complete: () => this.busy.set(false),
      });
  }

  ngOnInit(): void {
    this._subs = [];
    // Sync FormControl -> Monaco model
    this._subs.push(
      this.xml.valueChanges
        .pipe(distinctUntilChanged(), debounceTime(200))
        .subscribe(() => {
          this._xmlModel?.setValue(this.xml.value);
        })
    );
    this._subs.push(
      this.xslt.valueChanges
        .pipe(distinctUntilChanged(), debounceTime(200))
        .subscribe(() => this._xsltModel?.setValue(this.xslt.value))
    );
  }

  ngOnDestroy(): void {
    this._subs?.forEach((sub) => sub.unsubscribe());
  }

  transform(): void {
    if (this.busy()) return;
    this.error.set(undefined);
    this.busy.set(true);

    this._xmlService.renderXml(this.xml.value, this.xslt.value).subscribe({
      next: (result) => {
        if (result.error) {
          this.error.set(result.error);
          return;
        }
        this.rendition.set(result.result);
      },
      error: (err) => {
        this.error.set(err.message);
        console.error(JSON.stringify(err));
      },
      complete: () => this.busy.set(false),
    });
  }

  parseEntities(): void {
    if (this.busy()) return;
    this.error.set(undefined);
    this.busy.set(true);

    this._xmlService.parseTeiEntities(this.xml.value).subscribe({
      next: (result) => {
        if (result.error) {
          this.error.set(result.error);
          return;
        }
        this.entities.set(result.entities);
      },
      error: (err) => {
        this.error.set(err.message);
        console.error(JSON.stringify(err));
        this._snackbar.open('Error parsing entities', 'OK');
      },
      complete: () => this.busy.set(false),
    });
  }

  resetCode(): void {
    this.loadDefault();
    this.rendition.set(undefined);
  }

  private saveXmlCode(xml: string, extension = '.xml'): void {
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().split(' ')[0].replace(':', '-');
    a.download = `vessdph${date}_${time}${extension}`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  saveXml(): void {
    if (!this.xml.value) return;
    this.saveXmlCode(this.xml.value);
  }

  saveXslt(): void {
    if (!this.xslt.value) return;
    this.saveXmlCode(this.xslt.value, '.xslt');
  }

  loadXml(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xml';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.xml.setValue(e.target?.result as string);
          this._cdr.markForCheck();
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  prettifyXml(): void {
    if (this.busy()) return;
    this.error.set(undefined);
    this.busy.set(true);

    this._xmlService.prettifyXml(this.xml.value).subscribe({
      next: (result) => {
        if (result.error) {
          this.error.set(result.error);
          return;
        }
        this.xml.setValue(result.xml!);
      },
      error: (err) => {
        this.error.set(err.message);
        console.error(JSON.stringify(err));
      },
      complete: () => this.busy.set(false),
    });
  }

  loadXslt(): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xslt';
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          this.xslt.setValue(e.target?.result as string);
          this._cdr.markForCheck();
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }

  prettifyXslt(): void {
    if (this.busy()) return;
    this.error.set(undefined);
    this.busy.set(true);

    this._xmlService.prettifyXml(this.xslt.value).subscribe({
      next: (result) => {
        if (result.error) {
          this.error.set(result.error);
          return;
        }
        this.xslt.setValue(result.xml!);
      },
      error: (err) => {
        this.error.set(err.message);
        console.error(JSON.stringify(err));
      },
      complete: () => this.busy.set(false),
    });
  }

  pickEntity(entity: ParsedEntity): void {
    // TODO
  }
}
