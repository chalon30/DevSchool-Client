import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

import { NgApexchartsModule } from 'ng-apexcharts';

@Component({
  selector: 'app-dashboard-lenguajes',
  standalone: true,
  templateUrl: './dashboard-lenguajes.html',
  styleUrls: ['./dashboard-lenguajes.css'],
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    NgApexchartsModule,
  ],
})
export class DashboardLenguajes {
  // Datos base (ejemplo)
  lenguajes = ['JavaScript', 'Python', 'Java', 'C#', 'C++', 'TypeScript', 'Go'];
  popularidad = [95, 92, 88, 80, 75, 78, 70];
  demanda = [90, 94, 85, 82, 70, 83, 68];

  // opciones de los gráficos (any para evitar peleas de tipos)
  chartOptionsBar: any;
  chartOptionsRadial: any;

  // insights rápidos
  topPopular: { nombre: string; valor: number };
  topDemanda: { nombre: string; valor: number };

  constructor() {
    // calcular insights
    const idxPop = this.popularidad.indexOf(Math.max(...this.popularidad));
    const idxDem = this.demanda.indexOf(Math.max(...this.demanda));

    this.topPopular = {
      nombre: this.lenguajes[idxPop],
      valor: this.popularidad[idxPop],
    };

    this.topDemanda = {
      nombre: this.lenguajes[idxDem],
      valor: this.demanda[idxDem],
    };

    this.initBarChart();
    this.initRadialChart();
  }

  private initBarChart() {
    this.chartOptionsBar = {
      series: [
        {
          name: 'Popularidad',
          data: this.popularidad,
        },
        {
          name: 'Demanda laboral',
          data: this.demanda,
        },
      ],
      chart: {
        type: 'bar',
        height: 350,
        toolbar: {
          show: true,
        },
        background: 'transparent',
      },
      plotOptions: {
        bar: {
          horizontal: false,
          columnWidth: '45%',
          borderRadius: 4,
        },
      },
      dataLabels: {
        enabled: false,
      },
      stroke: {
        show: true,
        width: 2,
        colors: ['transparent'],
      },
      xaxis: {
        categories: this.lenguajes,
        labels: {
          style: {
            colors: Array(this.lenguajes.length).fill('rgb(78,52,46)'),
          },
        },
      },
      yaxis: {
        title: {
          text: 'Puntaje (0 - 100)',
          style: { color: 'rgb(109,76,65)' },
        },
        labels: {
          style: { colors: ['rgb(78,52,46)'] },
        },
        min: 0,
        max: 100,
      },
      fill: {
        opacity: 1,
        colors: ['#ffb17a', '#ff6a00'],
      },
      legend: {
        labels: {
          colors: 'rgb(78,52,46)',
        },
      },
      tooltip: {
        theme: 'light',
      },
      title: {
        text: 'Popularidad vs demanda por lenguaje',
        align: 'left',
        style: {
          color: 'rgb(78,52,46)',
          fontWeight: 600,
          fontSize: '14px',
        },
      },
    };
  }

  private initRadialChart() {
    // Top 3 por popularidad
    const pares = this.lenguajes.map((lang, i) => ({
      lang,
      val: this.popularidad[i],
    }));
    const top3 = pares.sort((a, b) => b.val - a.val).slice(0, 3);

    this.chartOptionsRadial = {
      series: top3.map((x) => x.val),
      labels: top3.map((x) => x.lang),
      chart: {
        type: 'radialBar',
        height: 350,
        background: 'transparent',
      },
      plotOptions: {
        radialBar: {
          hollow: {
            size: '40%',
          },
          dataLabels: {
            name: {
              fontSize: '13px',
              color: 'rgb(78,52,46)',
            },
            value: {
              fontSize: '14px',
              color: 'rgb(78,52,46)',
              formatter: (val: any) => `${val}%`,
            },
            total: {
              show: true,
              label: 'Promedio',
              color: 'rgb(78,52,46)',
              formatter: () => {
                const avg =
                  top3.reduce((acc, x) => acc + x.val, 0) / top3.length;
                return `${Math.round(avg)}%`;
              },
            },
          },
        },
      },
      colors: ['#ff6a00', '#ff9a54', '#ffd4a4'],
      legend: {
        show: true,
        position: 'bottom',
        labels: {
          colors: 'rgb(78,52,46)',
        },
      },
      title: {
        text: 'Top 3 por popularidad',
        align: 'left',
        style: {
          color: 'rgb(78,52,46)',
          fontWeight: 600,
          fontSize: '14px',
        },
      },
    };
  }
}
