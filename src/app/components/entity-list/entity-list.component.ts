import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import {
  debounceTime,
  distinctUntilChanged,
  firstValueFrom,
  merge,
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
  standalone: true,
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
export class EntityListComponent implements OnInit {
  private _entities: ParsedEntity[] = [];

  /**
   * List of entities to display.
   */
  @Input()
  public get entities(): ParsedEntity[] {
    return this._entities;
  }
  public set entities(value: ParsedEntity[]) {
    if (this._entities === value) return;
    this.setEntities(value);
  }

  /**
   * Emits when an entity is selected.
   */
  @Output()
  public entityPick: EventEmitter<ParsedEntity> =
    new EventEmitter<ParsedEntity>();

  public busy?: boolean;
  public typeFilter: FormControl<string | null>;
  public nameOrIdFilter: FormControl<string | null>;
  public filteredEntities: ParsedEntity[] = [];
  public filteredPlaces: ParsedEntity[] = [];
  public selectedEntity?: ParsedEntity;
  public personInfo?: PersonInfo;
  public placeInfo?: PlaceInfo;
  public flyToPoint?: GeoPoint;

  constructor(
    private _geoService: GeoService,
    private _dbpPersonService: DbpediaPersonService,
    private _dbpPlaceService: DbpediaPlaceService,
    formBuilder: FormBuilder
  ) {
    this.typeFilter = formBuilder.control(null);
    this.nameOrIdFilter = formBuilder.control(null);
  }

  public ngOnInit(): void {
    merge(this.typeFilter.valueChanges, this.nameOrIdFilter.valueChanges)
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.filterEntities());
  }

  private resetFilters(): void {
    this.typeFilter.reset(null);
    this.nameOrIdFilter.reset(null);
  }

  private async setEntities(entities: ParsedEntity[]): Promise<void> {
    this._entities = entities;

    this.busy = true;
    setTimeout(async () => {
      for (const entity of entities) {
        // only places have coordinates
        if (entity.type === 'place') {
          // find the first id having coordinates
          for (const id of entity.ids) {
            if (id.startsWith('http://dbpedia.org/resource/')) {
              // DBpedia
              try {
                const point = await firstValueFrom(
                  this._geoService.getPointFromDBpedia(id)
                );
                if (point) {
                  entity.point = point;
                  break;
                }
              } catch (error) {
                console.error(error);
              }
            } else if (id.startsWith('Q')) {
              // Wikidata
              try {
                const point = await firstValueFrom(
                  this._geoService.getPointFromWikidata(id)
                );
                if (point) {
                  entity.point = point;
                  break;
                }
              } catch (error) {
                console.error(error);
              }
            }
          }
        }
      }
    });
    this.busy = false;
    this.resetFilters();
    this.filterEntities();
  }

  private filterEntities(): void {
    this.filteredEntities = this._entities.filter((entity) => {
      if (this.typeFilter.value && entity.type !== this.typeFilter.value) {
        return false;
      }
      if (
        this.nameOrIdFilter.value &&
        !entity.names.some((n) =>
          n.toLowerCase().includes(this.nameOrIdFilter.value!.toLowerCase())
        ) &&
        !entity.ids.some((id) => id.includes(this.nameOrIdFilter.value!))
      ) {
        return false;
      }
      return true;
    });
    this.filteredPlaces = this.filteredEntities.filter(
      (e) => e.type === 'place'
    );
  }

  private getDbpediaId(ids: string[]): string | undefined {
    return ids.find((id) => id.startsWith('http://dbpedia.org/resource/'));
  }

  public selectEntity(entity: ParsedEntity): void {
    if (this.busy) return;
    this.selectedEntity = entity;
    const id = this.getDbpediaId(entity.ids);
    if (!id) {
      return;
    }

    if (entity.type === 'person') {
      this.busy = true;
      this._dbpPersonService.getInfo(id).subscribe({
        next: (info) => {
          this.personInfo = info || undefined;
          this.entityPick.emit(entity);
        },
        complete: () => {
          this.busy = false;
        },
      });
    } else if (entity.type === 'place') {
      this.busy = true;
      this._dbpPlaceService.getInfo(id).subscribe({
        next: (info) => {
          this.placeInfo = info || undefined;
          this.entityPick.emit(entity);
        },
        complete: () => {
          this.busy = false;
        },
      });
    } else {
      this.entityPick.emit(entity);
    }
  }
}
