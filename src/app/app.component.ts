import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EnvService } from '@myrmidon/ng-tools';
import { CommonModule } from '@angular/common';

import { NgxMapboxGLModule } from 'ngx-mapbox-gl';
import { MonacoWrapperModule } from './monaco-wrapper.module';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, MonacoWrapperModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  public version?: string;

  constructor(env: EnvService) {
    this.version = env.get('version') || '';
    NgxMapboxGLModule.withConfig({
      accessToken: env.get('mapbox_token')!,
    });
  }
}
