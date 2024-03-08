import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxMapboxGLModule } from 'ngx-mapbox-gl';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    NgxMapboxGLModule.withConfig({
      accessToken: (window as any).__env.mapboxToken,
    }),
  ],
})
export class MapglWrapperModule {}
