import { Component, computed, input } from '@angular/core';
import {
  IonBadge, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonProgressBar, IonText,
} from '@ionic/angular';

import { EstadisticasReto } from '../core/modelos';
import { describirRitmo, nivelRitmo } from '../core/ritmo';

/** Panel de ritmo y racha: resume el desempeño de un reto y qué falta esta semana. */
@Component({
  selector: 'app-panel-ritmo',
  imports: [IonBadge, IonCard, IonCardContent, IonCardHeader, IonCardTitle, IonProgressBar, IonText],
  styles: `
    .cifras { display: flex; justify-content: space-between; text-align: center; margin-bottom: 12px; }
    .cifras strong { display: block; font-size: 1.6rem; }
    .colores ion-badge { margin-right: 6px; }
    .ritmo { margin-top: 12px; }
  `,
  template: `
    @if (datos(); as d) {
      <ion-card>
        <ion-card-header>
          <ion-card-title>Panel de ritmo</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <div class="cifras">
            <div><strong>{{ d.racha_actual }}</strong>Racha actual</div>
            <div><strong>{{ d.mejor_racha }}</strong>Mejor racha</div>
            <div>
              <strong>{{ d.cumplimiento_promedio === null ? '—' : d.cumplimiento_promedio + ' %' }}</strong>
              Promedio
            </div>
          </div>

          <div class="colores">
            <ion-badge color="success">{{ d.verdes }} cumplidas</ion-badge>
            <ion-badge color="warning">{{ d.amarillas }} incompletas</ion-badge>
            <ion-badge color="danger">{{ d.rojas }} no cumplidas</ion-badge>
          </div>

          @if (ritmo(); as r) {
            <div class="ritmo">
              <p>
                <strong>Semana {{ r.semana }}</strong>
                <ion-badge [color]="r.nivel.color">{{ r.nivel.etiqueta }}</ion-badge>
              </p>
              <ion-progress-bar [value]="r.porcentaje / 100" [color]="r.nivel.color"></ion-progress-bar>
              <p>{{ r.mensaje }}</p>
            </div>
          } @else {
            <ion-text color="medium"><p>No hay una semana en curso.</p></ion-text>
          }
        </ion-card-content>
      </ion-card>
    }
  `,
})
export class PanelRitmoComponent {
  readonly datos = input<EstadisticasReto | null>(null);

  protected readonly ritmo = computed(() => {
    const semana = this.datos()?.semana_actual;
    if (!semana) {
      return null;
    }
    return {
      semana: semana.semana,
      porcentaje: semana.porcentaje,
      nivel: nivelRitmo(semana.ritmo_diario),
      mensaje: describirRitmo(semana),
    };
  });
}
