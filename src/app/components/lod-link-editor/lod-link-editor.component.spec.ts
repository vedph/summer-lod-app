import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LodLinkEditorComponent } from './lod-link-editor.component';

describe('LodLinkEditorComponent', () => {
  let component: LodLinkEditorComponent;
  let fixture: ComponentFixture<LodLinkEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LodLinkEditorComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(LodLinkEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
