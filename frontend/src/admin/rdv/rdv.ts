import { CommonModule, registerLocaleData } from '@angular/common';
import { Component, Input, LOCALE_ID, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AddRdvService } from './create-rdv.service';
import { DeleteRdvService } from './delete-rdv.service';
import { ListRdvService, RdvItem } from './list-rdv.service';
import localeFr from '@angular/common/locales/fr';

registerLocaleData(localeFr);

@Component({
  selector: 'app-rdv',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [{ provide: LOCALE_ID, useValue: 'fr-FR' }],
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

  private normalize(item: any): RdvItem {
    const atRaw = item?.at ?? item?.date ?? ""
    return {
      _id: String(item?._id ?? item?.id ?? ""),
      at: String(atRaw ?? ""),
      description: String(item?.description ?? ""),
    } as RdvItem
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
      const res: any = await this.listRdvService.listForUser(userId)

      let raw: any[]

      if (Array.isArray(res?.items)) {
        raw = res.items
      }
      else if (Array.isArray(res?.data)) {
        raw = res.data
      }
      else if (Array.isArray(res)) {
        raw = res
      }
      else {
        raw = []
      }

      const arr: RdvItem[] = raw.map((x: any) => this.normalize(x))

      arr.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())

      this.items = arr
      this.listLoading = false

      this.showCreate = this.items.length === 0
    }
    catch {
      this.items = []
      this.listLoading = false
      this.listError = "Impossible de charger les rendez-vous"
    }
  }

  getCreateButtonLabel(): string {
    if (this.rdvLoading) {
      return "Création..."
    }

    return "Créer le RDV"
  }

  async handleCreateRdv(): Promise<void> {
    this.rdvSucces = null
    this.rdvError = null

    const userId = this.selectedUserId
    if (!userId) return

    const trimmed = String(this.rdvLocal || "").trim()
    if (!trimmed) {
      this.rdvError = "Choisis une date et une heure"
      return
    }

    const dateIso = new Date(trimmed).toISOString()

    this.rdvLoading = true
    try {
      await this.addRdv.addRdv({
        sharedWithClientId: userId,
        date: dateIso,
        description: this.rdvDescription || ""
      })

      this.rdvLoading = false
      this.rdvSucces = "RDV créé avec succès"
      this.rdvLocal = ""
      this.rdvDescription = ""
      this.loadList()
    }
    catch (err: any) {
      this.rdvLoading = false

      if (err?.fields?.sharedWithClientId || err?.fields?.date) {
        this.rdvError = "Client ou date manquants/invalides."
      }
      else {
        this.rdvError = "Impossible de créer le RDV"
      }
    }
  }

  async delete(item: RdvItem): Promise<void> {
    if (!item || !item._id) {
      return
    }
    const ok = confirm("Supprimer ce RDV ?")
    if (!ok) {
      return
    }

    try {
      await this.delRdv.deleteRdv(item._id)
      this.items = this.items.filter(x => x._id !== item._id)
      if (this.items.length === 0) {
        this.showCreate = true
      }
    }
    catch {
      alert("Suppression impossible")
    }
  }

  hasAny(): boolean {
    return this.items.length > 0
  }
}
