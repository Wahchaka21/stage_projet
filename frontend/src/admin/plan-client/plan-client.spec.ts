import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanClient } from './plan-client';

describe('PlanClient', () => {
  let component: PlanClient;
  let fixture: ComponentFixture<PlanClient>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanClient]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanClient);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
