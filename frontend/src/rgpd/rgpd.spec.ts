import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Rgpd } from './rgpd';

describe('Rgpd', () => {
  let component: Rgpd;
  let fixture: ComponentFixture<Rgpd>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Rgpd]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Rgpd);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
