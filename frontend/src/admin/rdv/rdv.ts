import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AddRdvService } from './create-rdv.service';
import { DeleteRdvService } from './delete-rdv.service';
import { ListRdvService, RdvItem } from './list-rdv.service';

@Component({
  selector: 'app-rdv',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rdv.html'
})
export class Rdv implements OnInit, OnChanges {

  @Input() selectedUserId: string | null = null
  @Input() myUserId: string | null = null

  rdvLocal = ""
  rdvDescription = ""
  rdvLoading = false
  rdvError: string | null = null
  rdvSucces: string | null = null

  listLoading = false
  listError: string | null = null
  items: RdvItem[] = []

  showCreate = true

  constructor(
    private addRdv: AddRdvService,
    private delRdv: DeleteRdvService,
    private listRdvService: ListRdvService,
  ) { }

  ngOnInit(): void {
    this.reload()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (Object.prototype.hasOwnProperty.call(changes, "selectedUserId")) {
      this.reload()
    }
  }

  private reload(): void {
    this.rdvSucces = null
    this.rdvError = null
    this.loadList()
  }

  private async loadList(): Promise<void> {
    const userId = this.selectedUserId

    if (!userId) {
      this.items = []
      this.listLoading = false
      this.listError = null
      return
    }

    this.listLoading = true
    this.listError = null

    try {
      const res = await this.listRdvService.listForUser(userId)
      let arr: RdvItem[] = []

      if (res && Array.isArray(res.items)) {
        arr = res.items.slice()
      }

      arr.sort((a, b) => {
        const ta = new Date(a.at).getTime()
        const tb = new Date(b.at).getTime()
        return tb - ta
      })

      this.items = arr
      this.listLoading = false

      if (this.items.length === 0) {
        this.showCreate = true
      }
      else {
        this.showCreate = false
      }
    }
    catch (_err) {
      this.items = []
      this.listLoading = false
      this.listError = "Impossible de charger les rendez-vous"
    }
  }

  getCreateButtonLabel(): string {
    if (this.rdvLoading) {
      return "Création..."
    }
    else {
      return "Créer le RDV"
    }
  }

  async handleCreateRdv(): Promise<void> {
    this.rdvSucces = null
    this.rdvError = null

    const userId = this.selectedUserId
    if (!userId) {
      return
    }

    const base = this.rdvLocal
    let trimmed = ""
    if (typeof base === "string") {
      trimmed = base.trim()
    }

    if (!trimmed) {
      this.rdvError = "Choisis une date et une heure"
      return
    }

    const atIso = new Date(trimmed).toISOString()

    this.rdvLoading = true

    try {
      await this.addRdv.addRdv({
        userId: userId,
        at: atIso,
        description: this.rdvDescription ? this.rdvDescription : ""
      })

      this.rdvLoading = false
      this.rdvSucces = "RDV créé avec succès"
      this.rdvLocal = ""
      this.rdvDescription = ""
      this.loadList()
    }
    catch (_err) {
      this.rdvLoading = false
      this.rdvError = "Impossible de créer le RDV"
    }
  }

  async delete(item: RdvItem): Promise<void> {
    if (!item) {
      return
    }
    if (!item._id) {
      return
    }

    const ok = confirm("Supprimer ce RDV ?")
    if (!ok) {
      return
    }

    try {
      await this.delRdv.deleteRdv(item._id)

      const next: RdvItem[] = []
      for (let i = 0; i < this.items.length; i++) {
        const it = this.items[i]
        if (it && it._id !== item._id) {
          next.push(it)
        }
      }
      this.items = next

      if (this.items.length === 0) {
        this.showCreate = true
      }
    }
    catch (_err) {
      alert('Suppression impossible')
    }
  }

  hasAny(): boolean {
    return this.items.length > 0
  }
}