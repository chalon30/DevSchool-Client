import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { Header } from './shared/header/header';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    Header
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly title = signal('devschool-client');
}
