import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { MatDialog } from '@angular/material/dialog';

import {
  CadmusTextEdPlugin,
  CadmusTextEdQuery,
  CadmusTextEdPluginResult,
} from '@myrmidon/cadmus-text-ed';

import { LodLinkEditorComponent } from '../components/lod-link-editor/lod-link-editor.component';
import { RefLookupSetEvent } from '@myrmidon/cadmus-refs-lookup';

@Injectable()
export class LodLinkCtePlugin implements CadmusTextEdPlugin {
  public readonly id = 'lod.link';
  public readonly name = 'LOD Link';
  public readonly description = 'Insert LOD Link code as plain text.';
  public readonly version = '1.0.0';
  public enabled = true;

  constructor(private _dialog: MatDialog) {}

  public matches(query: CadmusTextEdQuery): boolean {
    return query.selector !== 'id' || query.text === this.id;
  }

  private async editLink(
    text?: string
  ): Promise<RefLookupSetEvent | undefined> {
    const dialogRef = this._dialog.open(LodLinkEditorComponent, {
      data: {
        text,
      },
    });
    const result: any = await firstValueFrom(dialogRef.afterClosed());
    return result;
  }

  public async edit(
    query: CadmusTextEdQuery
  ): Promise<CadmusTextEdPluginResult> {
    const result = await this.editLink(query.text);
    if (!result) {
      return {
        id: this.id,
        text: query.text,
        query,
      };
    }
    return {
      id: this.id,
      text: `${result.itemLabel} ${result.itemId}`,
      query,
    };
  }
}
