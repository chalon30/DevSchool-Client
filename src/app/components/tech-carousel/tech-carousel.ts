import { Component } from '@angular/core';

type Tech = {
  name: string;
  icon: string;
};

@Component({
  selector: 'app-tech-carousel',
  standalone: true,
  imports: [],
  templateUrl: './tech-carousel.html',
  styleUrl: './tech-carousel.css',
})
export class TechCarousel {
  techs: Tech[] = [
    { name: 'TypeScript',icon: '/tech/typescript.svg' },
    { name: 'JavaScript',icon: '/tech/javascript.svg' },
    { name: 'Java',      icon: '/tech/java.svg' },
    { name: 'Python',    icon: '/tech/python.svg' },
    { name: 'HTML5',     icon: '/tech/html5.svg' },
    { name: 'CSS3',      icon: '/tech/css3.svg' },
    { name: 'React',   icon: '/tech/react.svg' },
    { name: 'Node.js',   icon: '/tech/nodejs.svg' },
    { name: 'Angular',   icon: '/tech/angular.svg' },
    { name: 'Spring Boot',   icon: '/tech/springboot.svg' },
    { name: 'MySQL',   icon: '/tech/mysql.svg' },
  ];
}
