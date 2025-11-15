import { Component } from '@angular/core';
import { Hero } from '../../components/hero/hero'; 
import { TechCarousel } from '../../components/tech-carousel/tech-carousel';
import { About } from '../../components/about/about';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Hero, TechCarousel, About], 
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}
