import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

/**
 * Componente per la visualizzazione della pagina di "Accesso Negato".
 * Viene mostrato quando un utente tenta di accedere a una rotta protetta senza i permessi necessari.
 * Reindirizza automaticamente alla home page dopo un breve ritardo.
 */
@Component({
  selector: 'app-access-denied',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './access-denied.component.html',
  styleUrls: ['./access-denied.component.scss'],
})
export class AccessDeniedComponent implements OnInit {

  constructor(private router: Router) {}

  /**
   * Inizializza il componente.
   * Imposta un timer per reindirizzare l'utente alla home page dopo 3.25 secondi.
   */
  ngOnInit(): void {
    setTimeout(() => {
      this.router.navigate(['/']);
    }, 3250);
  }
}
