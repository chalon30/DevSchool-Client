import { Component } from '@angular/core';
import { Hero } from '../../components/hero/hero'; 

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Hero], 
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}
