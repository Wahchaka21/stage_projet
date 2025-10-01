import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ListPlanClientService, PlanClientItem } from './list-planClient.service';
import { AddPlanClientService } from './create-planClient.service';
import { DeletePlanClientService } from './delete-planClient.service';

@Component({
  selector: 'app-plan-client',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './plan-client.html',
  styleUrls: ['./plan-client.css']
})
export class PlanClient implements OnInit, OnChanges {

  @Input() selectedUserId: string | null = null
  @Input() myUserId: string | null = null

  planClientContenu = ""
  planClientLoading = false
  planClientError: string | null = null
  planClientSucces: string | null = null

  listLoading = false
  listError: string | null = null
  items: PlanClientItem[] = []

  showCreate = true

  constructor(
    private addPlanClientService: AddPlanClientService,
    private deletePlanClientService: DeletePlanClientService,
    private listPlanClientService: ListPlanClientService
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
    this.planClientSucces = null
    this.planClientError = null
    this.loadList()
  }

  private normalize(item: any): PlanClientItem {
    const result: PlanClientItem = { _id: "", userId: "", contenu: "" }

    if (item && item._id) {
      result._id = String(item._id)
    }
    else if (item && item.id) {
      result._id = String(item.id)
    }

    if (item && item.userId) {
      result.userId = String(item.userId)
    }
    else if (item && item.sharedWithClientId) {
      result.userId = String(item.sharedWithClientId)
    }

    if (item && item.contenu) {
      result.contenu = String(item.contenu)
    }

    return result
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
      const res: any = await this.listPlanClientService.listPlanClientForUser(userId)

      let raw: any[] = []
      if (res && Array.isArray(res.items)) {
        raw = res.items
      }
      else if (res && Array.isArray(res.data)) {
        raw = res.data
      }
      else if (Array.isArray(res)) {
        raw = res
      }

      const arr: PlanClientItem[] = []
      for (let i = 0; i < raw.length; i++) {
        arr.push(this.normalize(raw[i]))
      }

      this.items = arr
      this.listLoading = false

      if (this.items.length === 0) {
        this.showCreate = true
      }
      else {
        this.showCreate = false
      }
    }
    catch {
      this.items = []
      this.listLoading = false
      this.listError = "Impossible de charger les plans clients"
    }
  }

  getCreateButtonLabel(): string {
    if (this.planClientLoading) {
      return "Création..."
    }
    else {
      return "Créer le plan client"
    }
  }

  async handleCreatePlanClient(): Promise<void> {
    this.planClientSucces = null
    this.planClientError = null

    const userId = this.selectedUserId
    if (!userId) {
      return
    }

    if (!this.planClientContenu || this.planClientContenu.trim().length === 0) {
      this.planClientError = "Le contenu ne peut pas être vide"
      return
    }

    this.planClientLoading = true
    try {
      await this.addPlanClientService.addPlanClient({
        sharedWithClientId: userId,
        contenu: this.planClientContenu
      })

      this.planClientLoading = false
      this.planClientSucces = "Plan client créé avec succès"
      this.planClientContenu = ""
      this.loadList()
    }
    catch (err: any) {
      this.planClientLoading = false
      if (err && err.fields && err.fields.sharedWithClientId) {
        this.planClientError = "Client manquant / invalide"
      }
      else if (err && err.fields && err.fields.contenu) {
        this.planClientError = "Contenu invalide"
      }
      else {
        this.planClientError = "Impossible de créer le plan client"
      }
    }
  }

  async deletePlantClient(item: PlanClientItem): Promise<void> {
    if (!item) {
      return
    }
    if (!item._id) {
      return
    }

    const ok = confirm("Supprimer ce plan client ?")
    if (!ok) {
      return
    }

    try {
      await this.deletePlanClientService.DeletePlanClient(item._id)

      const next: PlanClientItem[] = []
      for (let i = 0; i < this.items.length; i++) {
        if (this.items[i]._id !== item._id) {
          next.push(this.items[i])
        }
      }
      this.items = next

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
