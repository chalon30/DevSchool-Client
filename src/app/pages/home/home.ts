import { Component } from '@angular/core';
import { Hero } from '../../components/hero/hero'; 
import { TechCarousel } from '../../components/tech-carousel/tech-carousel';
import { About } from '../../components/about/about';
import { DashboardLenguajes } from "../../components/dashboard-lenguajes/dashboard-lenguajes";
import { MiniCourses } from "../../components/mini-courses/mini-courses";


@Component({
  selector: 'app-home',
  standalone: true,
  imports: [Hero, TechCarousel, About, DashboardLenguajes, MiniCourses], 
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {}
