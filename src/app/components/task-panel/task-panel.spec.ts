import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TaskPanel } from './task-panel';
import { By } from '@angular/platform-browser';
import { Task } from '../../models/models';

describe('TaskPanel', () => {
    let component: TaskPanel;
    let fixture: ComponentFixture<TaskPanel>;

    const mockTask: Task = {
        _id: '1',
        title: 'Test Task',
        description: 'Test Description',
        phase_id: 'p1',
        project_id: 'proj1',
        priority: 'medium',
        assignees: [],
        is_done: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TaskPanel]
        }).compileComponents();

        fixture = TestBed.createComponent(TaskPanel);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should not show panel when isOpen is false', () => {
        component.isOpen = false;
        fixture.detectChanges();
        const panel = fixture.debugElement.query(By.css('.task-panel'));
        expect(panel.classes['open']).toBeFalsy();
    });

    it('should show panel when isOpen is true', () => {
        component.isOpen = true;
        fixture.detectChanges();
        const panel = fixture.debugElement.query(By.css('.task-panel'));
        expect(panel.classes['open']).toBeTruthy();
    });

    it('should display task title and description', () => {
        component.task = mockTask;
        component.isOpen = true;
        fixture.detectChanges();

        const title = fixture.debugElement.query(By.css('.panel-section h3')).nativeElement;
        const desc = fixture.debugElement.query(By.css('.panel-section p')).nativeElement;

        expect(title.textContent).toContain('Test Task');
        expect(desc.textContent).toContain('Test Description');
    });

    it('should emit close event when close button clicked', () => {
        spyOn(component.close, 'emit');
        component.isOpen = true;
        fixture.detectChanges();

        const closeBtn = fixture.debugElement.query(By.css('.btn-icon[title="Chiudi"]'));
        closeBtn.triggerEventHandler('click', null);

        expect(component.close.emit).toHaveBeenCalled();
    });

    it('should emit markCompleted when complete button clicked', () => {
        spyOn(component.markCompleted, 'emit');
        component.task = { ...mockTask, is_done: false };
        component.isOpen = true;
        fixture.detectChanges();

        const completeBtn = fixture.debugElement.query(By.css('.panel-footer .btn.primary'));
        completeBtn.triggerEventHandler('click', null);

        expect(component.markCompleted.emit).toHaveBeenCalledWith(component.task!);
    });

    it('should emit markIncomplete when incomplete button clicked', () => {
        spyOn(component.markIncomplete, 'emit');
        component.task = { ...mockTask, is_done: true };
        component.isOpen = true;
        fixture.detectChanges();

        const incompleteBtn = fixture.debugElement.query(By.css('.panel-footer .btn.primary'));
        incompleteBtn.triggerEventHandler('click', null);

        expect(component.markIncomplete.emit).toHaveBeenCalledWith(component.task!);
    });
});
