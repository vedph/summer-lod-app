import { TestBed } from '@angular/core/testing';

import { DbPediaPlaceService } from './dbpedia-place.service';

describe('DbPediaPlaceService', () => {
  let service: DbPediaPlaceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DbPediaPlaceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
