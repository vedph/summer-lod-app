import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { debounceTime, distinctUntilChanged, merge, race, take } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';

import { NgToolsModule } from '@myrmidon/ng-tools';

import { ParsedEntity } from '../../../services/xml.service';
import { GeoService } from '../../../services/geo.service';
import {
  DbpediaPersonService,
  PersonInfo,
} from '../../../services/dbpedia-person.service';
import {
  DbpediaPlaceService,
  PlaceInfo,
} from '../../../services/dbpedia-place.service';
import { PersonInfoComponent } from '../person-info/person-info.component';
import { PlaceInfoComponent } from '../place-info/place-info.component';

@Component({
  selector: 'app-entity-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatSelectModule,
    MatTabsModule,
    MatTooltipModule,
    NgToolsModule,
    PersonInfoComponent,
    PlaceInfoComponent,
  ],
  templateUrl: './entity-list.component.html',
  styleUrl: './entity-list.component.scss',
})
export class EntityListComponent implements OnInit {
  private _entities: ParsedEntity[] = [];

  @Input()
  public get entities(): ParsedEntity[] {
    return this._entities;
  }
  public set entities(value: ParsedEntity[]) {
    if (this._entities === value) return;
    this._entities = value;
    this.supplyCoordinates(value);
  }

  @Output()
  public entityPick: EventEmitter<ParsedEntity> =
    new EventEmitter<ParsedEntity>();

  public typeFilter: FormControl<string | null>;
  public nameOrIdFilter: FormControl<string | null>;
  public filteredEntities: ParsedEntity[] = [];
  public selectedEntity?: ParsedEntity;
  public personInfo?: PersonInfo;
  public placeInfo?: PlaceInfo;

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

  private supplyCoordinates(entities: ParsedEntity[]): void {
    for (const entity of entities) {
      if (entity.type === 'place') {
        for (const id of entity.ids) {
          if (id.startsWith('Q')) {
            race(
              this._geoService.getCoordsFromWikidata(id),
              this._geoService.getCoordsFromDBpedia(id)
            )
              .pipe(take(1))
              .subscribe((coords) => {
                entity.coords = coords;
                return;
              });
          } else if (id.startsWith('http://dbpedia.org/resource/')) {
            race(
              this._geoService.getCoordsFromWikidata(id),
              this._geoService.getCoordsFromDBpedia(id)
            )
              .pipe(take(1))
              .subscribe((coords) => {
                entity.coords = coords;
                return;
              });
          }
        }
      }
    }
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
  }

  public selectEntity(entity: ParsedEntity): void {
    this.selectedEntity = entity;
    if (entity.type === 'person') {
      this._dbpPersonService.getInfo(entity.ids[0]).subscribe((info) => {
        this.personInfo = info || undefined;
      });
    } else if (entity.type === 'place') {
      this._dbpPlaceService.getInfo(entity.ids[0]).subscribe((info) => {
        this.placeInfo = info || undefined;
      });
    }
    this.entityPick.emit(entity);
  }
}
