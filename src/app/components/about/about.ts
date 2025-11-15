import { Component } from '@angular/core';
import { InViewDirective } from '../../shared/in-view.directive'; // ajusta la ruta si es otra

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [InViewDirective],
  templateUrl: './about.html',
  styleUrl: './about.css',
})
export class About {}
