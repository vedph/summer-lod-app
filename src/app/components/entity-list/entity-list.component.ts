import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import {
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  merge,
  Subscription,
} from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

import { NgToolsModule } from '@myrmidon/ng-tools';

import { ParsedEntity } from '../../services/xml.service';
import { GeoPoint, GeoService } from '../../services/geo.service';
import {
  DbpediaPersonService,
  PersonInfo,
} from '../../services/dbpedia-person.service';
import {
  DbpediaPlaceService,
  PlaceInfo,
} from '../../services/dbpedia-place.service';
import { PersonInfoComponent } from '../person-info/person-info.component';
import { PlaceInfoComponent } from '../place-info/place-info.component';
import { PlaceMapComponent } from '../place-map/place-map.component';

@Component({
  selector: 'app-entity-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    NgToolsModule,
    PersonInfoComponent,
    PlaceInfoComponent,
    PlaceMapComponent,
  ],
  templateUrl: './entity-list.component.html',
  styleUrl: './entity-list.component.scss',
})
export class EntityListComponent implements OnInit, OnDestroy {
  private readonly _geoService = inject(GeoService);
  private readonly _dbpPersonService = inject(DbpediaPersonService);
  private readonly _dbpPlaceService = inject(DbpediaPlaceService);
  private _filterSub?: Subscription;

  // Signal input
  readonly entities = input<ParsedEntity[]>([]);

  // Signal output
  readonly entityPick = output<ParsedEntity>();

  // Internal state signals
  readonly busy = signal(false);
  readonly selectedEntity = signal<ParsedEntity | undefined>(undefined);
  readonly personInfo = signal<PersonInfo | undefined>(undefined);
  readonly placeInfo = signal<PlaceInfo | undefined>(undefined);
  readonly flyToPoint = signal<GeoPoint | undefined>(undefined);

  // Entities after geo-enrichment
  private readonly _enrichedEntities = signal<ParsedEntity[]>([]);

  // FormControls for filters
  readonly typeFilter = new FormControl<string | null>(null);
  readonly nameOrIdFilter = new FormControl<string | null>(null);

  // Bridge FormControl values to signals for computed derivations
  private readonly _typeFilterValue = signal<string | null>(null);
  private readonly _nameOrIdFilterValue = signal<string | null>(null);

  // Computed: filtered entities
  readonly filteredEntities = computed(() => {
    const entities = this._enrichedEntities();
    const type = this._typeFilterValue();
    const nameOrId = this._nameOrIdFilterValue();

    return entities.filter((entity) => {
      if (type && entity.type !== type) return false;
      if (nameOrId) {
        const lower = nameOrId.toLowerCase();
        const matchesName = entity.names.some((n) =>
          n.toLowerCase().includes(lower)
        );
        const matchesId = entity.ids.some((id) => id.includes(nameOrId));
        if (!matchesName && !matchesId) return false;
      }
      return true;
    });
  });

  // Computed: filtered places
  readonly filteredPlaces = computed(() =>
    this.filteredEntities().filter((e) => e.type === 'place')
  );

  constructor() {
    // When input entities change, enrich with geo data
    effect(() => {
      const entities = this.entities();
      this.typeFilter.reset(null);
      this.nameOrIdFilter.reset(null);
      this._typeFilterValue.set(null);
      this._nameOrIdFilterValue.set(null);
      this.enrichEntities(entities);
    });
  }

  ngOnInit(): void {
    // Bridge FormControl changes to signals (debounced)
    this._filterSub = merge(
      this.typeFilter.valueChanges,
      this.nameOrIdFilter.valueChanges
    )
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this._typeFilterValue.set(this.typeFilter.value);
        this._nameOrIdFilterValue.set(this.nameOrIdFilter.value);
      });
  }

  ngOnDestroy(): void {
    this._filterSub?.unsubscribe();
  }

  private async enrichEntities(entities: ParsedEntity[]): Promise<void> {
    this.busy.set(true);

    for (const entity of entities) {
      if (entity.type === 'place') {
        for (const id of entity.ids) {
          if (id.startsWith('http://dbpedia.org/resource/')) {
            const point = await firstValueFrom(
              this._geoService.getPointFromDBpedia(id)
            );
            if (point) {
              entity.point = point;
              break;
            }
          } else if (id.startsWith('Q')) {
            const point = await firstValueFrom(
              this._geoService.getPointFromWikidata(id)
            );
            if (point) {
              entity.point = point;
              break;
            }
          }
        }
      }
    }

    // Spread to create new array reference for signal change detection
    this._enrichedEntities.set([...entities]);
    this.busy.set(false);
  }

  selectEntity(entity: ParsedEntity): void {
    if (this.busy()) return;
    this.selectedEntity.set(entity);

    const id = entity.ids.find((id) =>
      id.startsWith('http://dbpedia.org/resource/')
    );
    if (!id) {
      this.entityPick.emit(entity);
      return;
    }

    if (entity.type === 'person') {
      this.busy.set(true);
      this._dbpPersonService.getInfo(id).subscribe({
        next: (info) => {
          this.personInfo.set(info || undefined);
          this.entityPick.emit(entity);
        },
        complete: () => this.busy.set(false),
      });
    } else if (entity.type === 'place') {
      this.busy.set(true);
      this._dbpPlaceService.getInfo(id).subscribe({
        next: (info) => {
          this.placeInfo.set(info || undefined);
          this.entityPick.emit(entity);
        },
        complete: () => this.busy.set(false),
      });
    } else {
      this.entityPick.emit(entity);
    }
  }

  onFlyTo(point: GeoPoint): void {
    this.flyToPoint.set(point);
  }
}
