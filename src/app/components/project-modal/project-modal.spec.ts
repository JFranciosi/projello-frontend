import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectModal } from './project-modal';

describe('ProjectModal', () => {
  let component: ProjectModal;
  let fixture: ComponentFixture<ProjectModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectModal]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
