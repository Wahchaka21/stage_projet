import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CetteSemaine } from './cette-semaine';

describe('CetteSemaine', () => {
  let component: CetteSemaine;
  let fixture: ComponentFixture<CetteSemaine>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CetteSemaine]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CetteSemaine);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
