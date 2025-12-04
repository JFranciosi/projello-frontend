import { Component, EventEmitter, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'app-project-searchbar',
  standalone: true,
  imports: [CommonModule, FormsModule, LucideAngularModule],
  templateUrl: './project-searchbar.html',
  styleUrls: ['./project-searchbar.css']
})
export class ProjectSearchbar {
  searchQuery = signal('');

  @Output() searchChange = new EventEmitter<string>();

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.trim();
    this.searchQuery.set(value);
    this.searchChange.emit(value);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.searchChange.emit('');
  }
}

