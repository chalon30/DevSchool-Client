import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Material
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {}
