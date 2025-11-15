import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Material Angular
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { AuthService } from '../../core/services/auth.service';
import { Usuario } from '../../core/model/Usuario';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
  ],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  mobileOpen = false;
  usuario: Usuario | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.usuario = this.authService.getUsuarioActual() as Usuario | null;
  }

  toggleMobile() {
    this.mobileOpen = !this.mobileOpen;
  }

  logout() {
    this.authService.logout();
    window.location.reload();
  }
}
