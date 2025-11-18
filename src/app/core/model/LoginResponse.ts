export interface LoginResponse {
  token: string;
  id: number;
  nombre: string;
  apellidos: string;
  correo: string;
  rol: string;
  esAdmin: boolean;
}
