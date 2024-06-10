import { TestBed } from '@angular/core/testing';

import { LodService } from './lod.service';

describe('LodService', () => {
  let service: LodService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LodService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
