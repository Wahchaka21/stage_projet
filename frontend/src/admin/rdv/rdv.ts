import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AddRdvService } from './create-rdv.service';
import { DeleteRdvService } from './delete-rdv.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-rdv',
  imports: [FormsModule, CommonModule],
  templateUrl: './rdv.html',
  styleUrl: './rdv.css'
})
export class Rdv {
  rdvLocal = ""
  rdvDescription = ""
  rdvLoading = false
  rdvError: string | null = null
  rdvSucces: string | null = null

  @Input() selectedUserId: string | null = null
  @Input() myUserId: string | null = null

  @Output() created = new EventEmitter<any>()

  constructor(
    private addRdvService: AddRdvService,
    private deleteRdvService: DeleteRdvService
  ) { }

  async handleCreateRdv(): Promise<void> {
    this.rdvError = null
    this.rdvSucces = null

    if (!this.myUserId) {
      this.rdvError = "Utilisateur non authentifié"
      return
    }
    if (!this.selectedUserId) {
      this.rdvError = "Aucun client selectionné"
      return
    }
    if (!this.rdvLocal) {
      this.rdvError = "Choisis une date"
      return
    }

    const d = new Date(this.rdvLocal)
    if (isNaN(d.getTime())) {
      this.rdvError = "Date invalide"
      return
    }

    const payload = {
      userId: this.myUserId,
      sharedWithClientId: this.selectedUserId,
      date: d.toISOString(),
      description: this.rdvDescription?.trim() || undefined
    }

    this.rdvLoading = true
    try {
      const result = await this.addRdvService.addRdv(payload)
      this.rdvSucces = "Rendez-vous créé"
      this.created.emit(result?.data || result)

      this.rdvLocal = ""
      this.rdvDescription = ""
    }
    catch (err) {
      this.rdvError = String(err || "Erreur lors de la création du rendez-vous")
    }
    finally {
      this.rdvLoading = false
    }
  }

  async handleDeleteRdv(rdvId: string): Promise<void> {
    if (!rdvId) {
      return
    }
    try {
      const result = await this.deleteRdvService.deleteRdv(rdvId)
      if (!result) {
        console.log("aucun rendez-vous trouvez")
      }
    }
    catch (err: any) {
      console.error("erreur lors de la suppression du rendez-vous :", err)
    }
  }
}