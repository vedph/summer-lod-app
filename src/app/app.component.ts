import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EnvService } from '@myrmidon/ng-tools';
import { CommonModule } from '@angular/common';

import { LeafletModule } from '@asymmetrik/ngx-leaflet';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, LeafletModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  public version?: string;

  constructor(env: EnvService) {
    this.version = env.get('version') || '';
  }
}
