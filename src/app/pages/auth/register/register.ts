import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { Usuario } from '../../../core/model/Usuario';

// Material
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';

@Component({
  selector: 'app-register',
  standalone: true,
  templateUrl: './register.html',
  styleUrls: ['./register.css'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
  ],
})
export class Register {
  nombre = '';
  apellidos = '';
  correo = '';
  clave = '';
  confirmarClave = '';

  aceptaTerminos = false;

  error = '';
  cargando = false;
  exito = false;

  hidePassword = true;
  hidePassword2 = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  // Evita que el usuario escriba '@'
  bloquearArroba(event: KeyboardEvent) {
    if (event.key === '@') {
      event.preventDefault();
    }
  }

  registrar() {
    // Validaciones básicas
    if (!this.nombre || !this.correo || !this.clave || !this.confirmarClave) {
      this.error = 'Completa todos los campos';
      this.mostrarSnackBar(this.error, 'snackbar-error', 'bottom');
      return;
    }

    if (this.correo.includes('@')) {
      this.error = 'El usuario no debe incluir "@" en el correo';
      this.mostrarSnackBar(this.error, 'snackbar-error', 'bottom');
      return;
    }

    if (this.clave.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres';
      this.mostrarSnackBar(this.error, 'snackbar-error', 'bottom');
      return;
    }

    if (this.clave !== this.confirmarClave) {
      this.error = 'Las contraseñas no coinciden';
      this.mostrarSnackBar(this.error, 'snackbar-error', 'bottom');
      return;
    }

    if (!this.aceptaTerminos) {
      this.error = 'Debes aceptar los términos y condiciones';
      this.mostrarSnackBar(this.error, 'snackbar-error', 'bottom');
      return;
    }

    // Normalizar correo y agregar dominio fijo
    const correoFinal = this.correo.trim().toLowerCase() + '@devschool.com';

    this.cargando = true;
    this.exito = false;
    this.error = '';

    const nuevoUsuario: Usuario = {
      nombre: this.nombre,
      apellidos: this.apellidos,
      correo: correoFinal,
      password: this.clave,
    };

    this.authService.register(nuevoUsuario).subscribe({
      next: () => {
        this.cargando = false;
        this.exito = true;
        this.mostrarSnackBar('Registro exitoso.', 'snackbar-success', 'bottom');
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        this.cargando = false;
        if (err?.error?.error === 'El correo ya existe') {
          this.error = 'Este correo ya está registrado.';
        } else {
          this.error = err?.error?.error || 'Ocurrió un error al registrarte.';
        }
        this.mostrarSnackBar(this.error, 'snackbar-error', 'bottom');
      },
    });
  }

  private mostrarSnackBar(
    mensaje: string,
    panelClass: string,
    position: 'top' | 'bottom' = 'top'
  ) {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 4000,
      horizontalPosition: 'center',
      verticalPosition: position,
      panelClass: [panelClass],
    });
  }
}
