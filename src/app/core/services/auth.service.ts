import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { appsettings } from '../../Settings/appsettings';
import { HttpClient } from '@angular/common/http';
import { Usuario } from '../model/Usuario';
import { Observable } from 'rxjs';
import { LoginResponse } from '../model/LoginResponse';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // ahora apunta a /api/auth
  private apiUrl: string = `${appsettings.apiUrl}auth`;
  private http = inject(HttpClient);
  private platformId = inject(PLATFORM_ID);
  private storageKey = 'usuario'; // aquí guardamos usuario + token

  constructor() {}

  /** ✅ Login */
  login(correo: string, clave: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, {
      correo,
      password: clave, // el backend usa getPassword()
    });
  }

  /** ✅ Registro (el backend NO devuelve token ni usuario) */
  register(
    usuario: Usuario
  ): Observable<{ message: string; correo: string }> {
    return this.http.post<{ message: string; correo: string }>(
      `${this.apiUrl}/register`,
      usuario
    );
  }

  /** ✅ Guardar usuario + token juntos en LocalStorage */
  guardarUsuarioConToken(usuario: Usuario, token: string): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(
        this.storageKey,
        JSON.stringify({
          ...usuario,
          token,
        })
      );
    }
  }

  /** ✅ Obtener token desde LocalStorage si no está expirado */
  getToken(): string | null {
    if (isPlatformBrowser(this.platformId)) {
      const data = localStorage.getItem(this.storageKey);
      console.log('[AuthService] Raw data del storage:', data);
      if (data) {
        const usuario = JSON.parse(data);
        const token = usuario.token;
        console.log('[AuthService] Token extraído:', token);
        if (token && !this.isTokenExpired(token)) {
          return token;
        } else {
          this.logout();
          return null;
        }
      }
    }
    return null;
  }

  /** ✅ Obtener usuario actual si el token sigue válido */
  getUsuarioActual(): Usuario | null {
    if (isPlatformBrowser(this.platformId)) {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const usuario = JSON.parse(data);
        if (usuario.token && !this.isTokenExpired(usuario.token)) {
          return usuario;
        }
      }
    }
    return null;
  }

  /** ✅ Verificar si hay sesión activa */
  isLoggedIn(): boolean {
    return this.getToken() !== null;
  }

  /** ✅ Logout: limpiar sesión */
  logout(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(this.storageKey);
    }
  }

  /** ✅ Verificar si un token expiró */
  isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return Date.now() >= payload.exp * 1000;
    } catch {
      return true; // Token inválido => lo tratamos como expirado
    }
  }

  /** ✅ Verificar y limpiar sesión si el token expiró */
  checkAndHandleExpiredSession(): boolean {
    if (isPlatformBrowser(this.platformId)) {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const usuario = JSON.parse(data);
        if (usuario.token && this.isTokenExpired(usuario.token)) {
          this.logout();
          return true;
        }
      }
    }
    return false;
  }
}
