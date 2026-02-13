import { ChangeDetectionStrategy, Component, Inject, Optional } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

import {
  RefLookupConfig,
  RefLookupSetComponent,
  RefLookupSetEvent,
} from '@myrmidon/cadmus-refs-lookup';
import { DbpediaRefLookupService } from '@myrmidon/cadmus-refs-dbpedia-lookup';
import { GeoNamesRefLookupService } from '@myrmidon/cadmus-refs-geonames-lookup';
import { ViafRefLookupService } from '@myrmidon/cadmus-refs-viaf-lookup';
import {
  GeoJsonFeature,
  WhgRefLookupService,
} from '@myrmidon/cadmus-refs-whg-lookup';

/**
 * Link editor dialog component.
 */
@Component({
    selector: 'app-lod-link-editor',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RefLookupSetComponent],
    templateUrl: './lod-link-editor.component.html',
    styleUrl: './lod-link-editor.component.scss'
})
export class LodLinkEditorComponent {
  public readonly configs: RefLookupConfig[];

  constructor(
    dbpediaService: DbpediaRefLookupService,
    geonamesService: GeoNamesRefLookupService,
    viafService: ViafRefLookupService,
    whgService: WhgRefLookupService,
    @Optional()
    public dialogRef?: MatDialogRef<LodLinkEditorComponent>,
    @Optional()
    @Inject(MAT_DIALOG_DATA)
    public data?: any
  ) {
    this.configs = [
      // dbpedia
      {
        name: 'DBpedia',
        iconUrl: '/assets/img/dbpedia128.png',
        description: 'DBpedia',
        label: 'ID',
        service: dbpediaService,
        itemIdGetter: (item: any) => item?.uri,
        itemLabelGetter: (item: any) => item?.label,
      },
      // geonames
      {
        name: 'GeoNames',
        iconUrl: '/assets/img/geonames128.png',
        description: 'GeoNames',
        label: 'ID',
        service: geonamesService,
        itemIdGetter: (item: any) => item?.geonameId,
        itemLabelGetter: (item: any) => item?.toponymName,
      },
      // WHG
      {
        name: 'whg',
        iconUrl: '/assets/img/whg128.png',
        description: 'World Historical Gazetteer',
        label: 'ID',
        service: whgService,
        itemIdGetter: (item: GeoJsonFeature) =>
          item?.properties.place_id ? `${item.properties.place_id}` : '',
        itemLabelGetter: (item: GeoJsonFeature) => item?.properties.title,
      },
      // viaf
      {
        name: 'VIAF',
        iconUrl: '/assets/img/viaf128.png',
        description: 'Virtual International Authority File',
        label: 'ID',
        service: viafService,
        itemIdGetter: (item: any) => item?.viafid,
        itemLabelGetter: (item: any) => item?.displayForm,
      },
    ];
  }

  public close(): void {
    this.dialogRef?.close();
  }

  public onItemChange(event: RefLookupSetEvent): void {
    console.info(event);
    if (event?.itemId) {
      this.dialogRef?.close(event);
    }
  }
}
