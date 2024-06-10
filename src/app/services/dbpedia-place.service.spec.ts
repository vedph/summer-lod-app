import { TestBed } from '@angular/core/testing';

import { DbpediaPlaceService } from './dbpedia-place.service';

describe('DbPediaPlaceService', () => {
  let service: DbpediaPlaceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DbpediaPlaceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
