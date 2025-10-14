import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AddCetteSemaineService } from './create-cetteSemaine.service';
import { DeleteCetteSemaineService } from './delete-cetteSemaine.service';
import { ListCetteSemaineService } from './list-cetteSermaine.service';
import { ModifiyCetteSemaineService } from './modify-cetteSemaine.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

type CetteSemaineItem = {
  _id: string
  userId: string
  contenu: string
  title?: string
  createdAt?: string
}

type UpdateCetteSemainePayload = {
  title?: string
  contenu?: string
}

@Component({
  selector: 'app-cette-semaine',
  imports: [CommonModule, FormsModule],
  templateUrl: './cette-semaine.html',
  styleUrl: './cette-semaine.css'
})
export class CetteSemaine implements OnInit, OnChanges {
  @Input() selectedUserId: string | null = null
  @Input() myUserId: string | null = null

  @ViewChild("editor", { static: false }) editorRef: ElementRef<HTMLDivElement> | undefined = undefined
  cetteSemaineContenu = ""
  cetteSemaineId: string | null = null

  cetteSemaineLoading = false
  cetteSemaineError: string | null = null
  cetteSemaineSucces: string | null = null
  mode: "create" | "manage" = "create"
  deleteConfirmOpen = false
  deleteTargetId: string | null = null
  deleteTargetTitle = ""
  deleteError: string | null = null

  listLoading = false
  listError: String | null = null
  items: CetteSemaineItem[] = []
  showCreate = true

  showCreateAttachMenu = false
  showAttachMenuFor: string | null = null

  cetteSemaineTitre = ""
  private targetCetteSemaineForUpload: string | null = null

  constructor(
    private addCetteSemaineService: AddCetteSemaineService,
    private deleteCetteSemaineService: DeleteCetteSemaineService,
    private listCetteSemaineService: ListCetteSemaineService,
    private modifyCetteSemaineService: ModifiyCetteSemaineService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void {
    this.reload()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (Object.prototype.hasOwnProperty.call(changes, "selectedUserId")) {
      this.reload()
    }
  }

  switchToCreate(): void {
    this.mode = "create"
    this.cetteSemaineSucces = null
    this.cetteSemaineError = null
    this.cancelDeleteCetteSemaine()
    this.items = []
    this.closeAttachMenus()
  }

  switchToManage(): void {
    this.mode = "manage"
    this.cetteSemaineSucces = null
    this.cetteSemaineError = null
    this.cancelDeleteCetteSemaine()
    this.showCreate = false
    this.items = []
    this.closeAttachMenus()
    this.loadList()
  }

  private reload(): void {
    this.cetteSemaineSucces = null
    this.cetteSemaineError = null
    this.cancelDeleteCetteSemaine()
    this.closeAttachMenus()
    if (this.mode === "manage") {
      this.loadList()
    }
    else {
      this.items = []
      this.showCreate = true
    }
  }

  private normalize(item: any): CetteSemaineItem {
    const result: CetteSemaineItem = { _id: "", userId: "", contenu: "", }

    if (item && item._id) {
      result._id = String(item._id)
    }
    else if (item && item.id) {
      result._id = String(item.id)
    }
    else {
      result._id = ""
    }

    if (item && item.userId) {
      result.userId = String(item.userId)
    }
    else if (item && item.sharedWithClientId) {
      result.userId = String(item.sharedWithClientId)
    }
    else {
      result.userId = ""
    }

    if (item && item.contenu) {
      result.contenu = String(item.contenu)
    }
    else {
      result.contenu = ""
    }

    if (item && item.title) {
      result.title = String(item.title)
    }
    else {
      result.title = ""
    }

    if (item && item.createdAt) {
      try {
        result.createdAt = new Date(item.createdAt).toISOString()
      }
      catch {
        result.createdAt = ""
      }
    }
    else {
      result.createdAt = ""
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
      const res: any = await this.listCetteSemaineService.listCetteSemaineForUser(userId)

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

      this.items = raw.map(x => this.normalize(x))
      this.showCreate = this.items.length === 0
      this.listLoading = false
    }
    catch {
      this.items = []
      this.listLoading = false
      this.listError = "Impossible de charger les \"cette semaine\""
    }
  }

  getCreateButtonLabel(): string {
    if (this.cetteSemaineLoading) {
      return "création..."
    }
    else {
      return "Créer la rubrique \"cette semaine\""
    }
  }

  private focusEditor(): void {
    if (this.editorRef && this.editorRef.nativeElement) {
      this.editorRef.nativeElement.focus()
    }
  }

  exec(cmd: string): void {
    document.execCommand(cmd, false)
    this.focusEditor()
  }

  formatBlock(tag: "p" | "h1" | "h2" | "blockquote"): void {
    document.execCommand("formatBlock", false, tag)
    this.focusEditor()
  }

  insertLink(): void {
    const url = prompt("URL du lien (https://...)")
    if (url) {
      document.execCommand("createLink", false, url)
      this.focusEditor()
    }
  }

  clearFormatting(): void {
    document.execCommand("removeFormat", false)
    document.execCommand("unlink", false)
    this.focusEditor()
  }

  onEditorInput(): void {
    this.cetteSemaineContenu = this.getEditorHtml()
  }

  private getEditorHtml(): string {
    if (this.editorRef && this.editorRef.nativeElement) {
      return this.editorRef.nativeElement.innerHTML
    }
    return ""
  }

  private isEditorEmpty(html: string): boolean {
    const div = document.createElement("div")
    div.innerHTML = html || ""
    const txt = (div.textContent || "").trim()
    if (txt.length === 0) {
      return true
    }
    else {
      return false
    }
  }

  sanitize(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html || "")
  }

  private resetEditor(): void {
    this.cetteSemaineContenu = ""
    if (this.editorRef && this.editorRef.nativeElement) {
      this.editorRef.nativeElement.innerHTML = ""
    }
  }

  async handleCetteSemaine(): Promise<void> {
    this.cetteSemaineSucces = null
    this.cetteSemaineError = null

    const userId = this.selectedUserId
    if (!userId) {
      return
    }

    const html = this.getEditorHtml()
    if (this.isEditorEmpty(html)) {
      this.cetteSemaineError = "Le contenu ne peut pas être vide"
      return
    }

    this.cetteSemaineLoading = true
    try {
      const res = await this.addCetteSemaineService.addCetteSemaine({
        sharedWithClientId: userId,
        contenu: html,
        title: this.cetteSemaineTitre || ""
      })

      const createdPlanId = this.extractCreatedId(res)
      this.cetteSemaineSucces = "\"cette semaine\" créé avec succès"


      this.cetteSemaineLoading = false
      this.resetEditor()
      this.cetteSemaineTitre = ""
      this.showCreateAttachMenu = false

      await this.loadList()
    }
    catch (err) {
      this.cetteSemaineLoading = false
      if (err) {
        this.cetteSemaineError = "Client manquant / invalide"
      }
      else if (err) {
        this.cetteSemaineError = "Contenu invalide"
      }
      else {
        this.cetteSemaineError = "Impossible de créer le plan client"
      }
    }
  }

  private extractCreatedId(res: any): string {
    if (res?.item?._id) {
      return String(res.item._id)
    }
    else if (res?.item?.id) {
      return String(res.item.id)
    }
    else if (res?._id) {
      return String(res._id)
    }
    else if (res?.id) {
      return String(res.id)
    }
    else if (res?.data?._id) {
      return String(res.data._id)
    }
    else if (res?.data?.id) {
      return String(res.data.id)
    }
    else {
      return ""
    }
  }

  openDeleteCetteSemaine(item: CetteSemaineItem): void {
    if (!item || !item._id) {
      return
    }
    this.deleteTargetId = item._id
    const rawTitle = item.title
    let cleanTitle = ""
    if (rawTitle && typeof rawTitle === "string") {
      cleanTitle = rawTitle.trim()
    }
    if (cleanTitle.length > 0) {
      this.deleteTargetTitle = cleanTitle
    }
    else {
      this.deleteTargetTitle = ""
    }
    this.deleteError = null
    this.deleteConfirmOpen = true
  }

  cancelDeleteCetteSemaine(): void {
    this.deleteConfirmOpen = false
    this.deleteError = null
    this.deleteTargetId = null
    this.deleteTargetTitle = ""
  }

  async confirmDeleteCetteSemaine(): Promise<void> {
    const targetId = this.deleteTargetId
    if (!targetId) {
      return
    }
    this.deleteError = null
    try {
      await this.deleteCetteSemaineService.DeleteCetteSemaine(targetId)
      this.items = this.items.filter(i => i._id !== targetId)
      if (this.items.length === 0) {
        this.showCreate = true
      }
      this.cancelDeleteCetteSemaine()
    }
    catch (err: any) {
      if (err && err.error && err.error.message) {
        this.deleteError = err.error.message
      }
      else if (typeof err === "string") {
        this.deleteError = err
      }
      else {
        this.deleteError = "Suppression impossible"
      }
    }
  }

  getDeleteCetteSemaineLabel(): string {
    if (this.deleteTargetTitle && this.deleteTargetTitle.length > 0) {
      return "Etes vous sur de vouloir supprimer le \"cette semaine\"" + this.deleteTargetTitle + "\" ?"
    }
    else {
      return "Etes vous sur de vouloir supprimer ce plan ?"
    }
  }

  hasAny(): boolean {
    if (this.items.length > 0) {
      return true
    }
    else {
      return false
    }
  }

  toggleCreateAttachMenu(): void {
    this.showCreateAttachMenu = !this.showCreateAttachMenu
  }

  toggleAttachMenu(planId: string): void {
    if (this.showAttachMenuFor === planId) {
      this.showAttachMenuFor = null
    }
    else {
      this.showAttachMenuFor = planId
    }
  }

  closeAttachMenus(): void {
    this.showCreateAttachMenu = false
    this.showAttachMenuFor = null
  }

  async updateCetteSemaine(patch?: UpdateCetteSemainePayload): Promise<void> {
    const cetteSemaineId = this.cetteSemaineId
    if (!cetteSemaineId || cetteSemaineId.trim().length === 0) {
      this.cetteSemaineError = "Impossible de modifier : identifiant manquant."
      return
    }

    let toSend: UpdateCetteSemainePayload
    if (patch && typeof patch === "object") {
      toSend = patch
    }
    else {
      toSend = {
        title: this.cetteSemaineTitre,
        contenu: this.getEditorHtml()
      }
    }

    const rienFourni = !Object.prototype.hasOwnProperty.call(toSend, "title") && !Object.prototype.hasOwnProperty.call(toSend, "contenu")
    if (rienFourni) {
      this.cetteSemaineError = "Aucun modification fournie"
      return
    }

    this.cetteSemaineError = null
    this.cetteSemaineSucces = null

    try {
      const res: any = await this.modifyCetteSemaineService.updateCetteSemaine(cetteSemaineId, toSend)
      let updated: CetteSemaineItem | null = null
      if (res && res.item) {
        updated = this.normalize(res.item)
      }

      if (updated && updated._id) {
        this.items = this.items.map(x => {
          if (x._id === updated._id) {
            return updated
          }
          else {
            return x
          }
        })
      }
      this.cetteSemaineSucces = "Modifications enregistrées."
    }
    catch (err: any) {
      let errorMessage: string | undefined = err?.error?.error?.message || err?.error?.message
      if (!errorMessage) {
        if (typeof err === "string") {
          errorMessage = err
        }
        else {
          errorMessage = "Erreur lors de la modification."
        }
      }
      this.cetteSemaineError = errorMessage
      console.error("\"updateCetteSemaine\" erreur :", err)
    }
  }
}