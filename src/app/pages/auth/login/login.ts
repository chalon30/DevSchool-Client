import { Component } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../../core/services/auth.service';
import { LoginResponse } from '../../../core/model/LoginResponse';
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
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
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
export class Login {
  correo = '';
  clave = '';
  error = '';

  cargando = false;
  exito = false;

  hidePassword = true;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  login() {
    if (!this.correo || !this.clave) {
      this.error = 'Ingresa tu correo y contraseña';
      this.mostrarSnackBar(this.error, 'snackbar-error', 'bottom');
      return;
    }

    this.cargando = true;
    this.error = '';

    this.authService.login(this.correo, this.clave).subscribe({
      next: (respuesta: LoginResponse) => {
        // ⬅ Directamente usamos lo que devuelve el backend
        const usuarioSesion: any = {
          id: respuesta.id,
          nombre: respuesta.nombre,
          apellidos: respuesta.apellidos,
          correo: respuesta.correo,
          rol: respuesta.rol,
          esAdmin: respuesta.esAdmin,
        };

        // Guardar usuario + token en LocalStorage
        this.authService.guardarUsuarioConToken(usuarioSesion, respuesta.token);

        this.cargando = false;
        this.exito = true;

        // Feedback al usuario
        setTimeout(() => {
          this.mostrarSnackBar(
            'Sesión iniciada correctamente',
            'snackbar-success',
            'bottom'
          );
        }, 1300);

        // Redirigir a returnUrl o /home
        setTimeout(() => {
          const returnUrl =
            this.route.snapshot.queryParamMap.get('returnUrl') || '/home';

          this.router.navigate([returnUrl]).then(() => {
            window.location.reload();
          });
        }, 2500);
      },
      error: (err) => {
        this.cargando = false;

        if (err?.error?.error?.includes('no activada')) {
          this.error = 'Tu cuenta aún no está activada. Revisa tu correo.';
        } else {
          this.error = 'Correo o contraseña incorrectos';
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
