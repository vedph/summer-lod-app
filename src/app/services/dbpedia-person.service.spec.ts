import { TestBed } from '@angular/core/testing';

import { DbpediaPersonService } from './dbpedia-person.service';

describe('PersonService', () => {
  let service: DbpediaPersonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DbpediaPersonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
