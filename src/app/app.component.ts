import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { EnvService } from '@myrmidon/ngx-tools';
import { ThemeToggleComponent } from '@myrmidon/ngx-mat-tools';

@Component({
    selector: 'app-root',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [RouterOutlet, ThemeToggleComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.scss'
})
export class AppComponent {
  public version?: string;

  constructor(env: EnvService) {
    this.version = env.get('version') || '';
  }
}
