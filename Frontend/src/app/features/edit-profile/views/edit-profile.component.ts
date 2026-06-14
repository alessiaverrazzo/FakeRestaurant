import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { EditProfileViewModel } from '../viewmodels/edit-profile.viewmodel';

/**
 * Componente per la vista di Modifica Profilo.
 * Permette all'utente di modificare i propri dati (username, icona, password) o eliminare l'account.
 * Delega la logica di business al ViewModel.
 */
@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  templateUrl: './edit-profile.component.html',
  styleUrls: ['./edit-profile.component.scss']
})
export class EditProfileComponent implements OnInit {

  constructor(public vm: EditProfileViewModel) {}

  /**
   * Inizializza il componente.
   * Resetta lo stato del ViewModel e carica i dati aggiornati dell'utente.
   */
  ngOnInit(): void {
    this.vm.reset();
    this.vm.loadUser();
  }
}
