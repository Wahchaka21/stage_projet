import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanAlimentaire } from './plan-alimentaire';

describe('PlanAlimentaire', () => {
  let component: PlanAlimentaire;
  let fixture: ComponentFixture<PlanAlimentaire>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanAlimentaire]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanAlimentaire);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
