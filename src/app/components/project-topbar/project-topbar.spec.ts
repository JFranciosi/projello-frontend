import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProjectTopbar } from './project-topbar';

describe('ProjectTopbar', () => {
  let component: ProjectTopbar;
  let fixture: ComponentFixture<ProjectTopbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectTopbar]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProjectTopbar);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
