import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NgToastComponent } from "ng-angular-popup";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, NgToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('projello-frontend');
}
