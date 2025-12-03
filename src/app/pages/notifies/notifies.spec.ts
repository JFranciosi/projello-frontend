import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Notifies } from './notifies';

describe('Notifies', () => {
  let component: Notifies;
  let fixture: ComponentFixture<Notifies>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Notifies]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Notifies);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
