import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ListPlanClientService } from './list-planClient.service';
import { AddPlanClientService } from './create-planClient.service';
import { DeletePlanClientService } from './delete-planClient.service';
import { UploadVideoToPlanService } from './upload-video-to-plan.service';
import { AttachVideoToPlanService } from './attach-video-to-plan.service';

type PlanVideo = {
  videoId: string
  url: string
  name: string
  duration: number
}

type PlanClientItem = {
  _id: string
  userId: string
  contenu: string
  videos: PlanVideo[]
  title?: string
  createdAt?: string
}

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

  @ViewChild("editor", { static: false }) editorRef: ElementRef<HTMLDivElement> | undefined = undefined
  planClientContenu = ""

  planClientLoading = false
  planClientError: string | null = null
  planClientSucces: string | null = null
  mode: "create" | "manage" = "create"
  deleteConfirmOpen = false
  deleteTargetId: string | null = null
  deleteTargetTitle = ""
  deleteError: string | null = null

  listLoading = false
  listError: string | null = null
  items: PlanClientItem[] = []
  showCreate = true

  showCreateAttachMenu = false
  showAttachMenuFor: string | null = null

  planClientTitre = ""

  queuedVideos: File[] = []
  @ViewChild("newPlanVideoInput") newPlanVideoInput: ElementRef<HTMLInputElement> | undefined = undefined

  @ViewChild("planVideoInput") planVideoInput: ElementRef<HTMLInputElement> | undefined = undefined
  private targetPlanForUpload: string | null = null

  videoUploadLoading = false
  videoUploadError: string | null = null
  videoUploadSuccess: string | null = null

  constructor(
    private addPlanClientService: AddPlanClientService,
    private deletePlanClientService: DeletePlanClientService,
    private listPlanClientService: ListPlanClientService,
    private uploadVideoService: UploadVideoToPlanService,
    private attachVideoService: AttachVideoToPlanService,
    private sanitizer: DomSanitizer
  ) { }

  ngOnInit(): void { this.reload() }

  ngOnChanges(changes: SimpleChanges): void {
    if (Object.prototype.hasOwnProperty.call(changes, "selectedUserId")) {
      this.reload()
    }
  }

  switchToCreate(): void {
    this.mode = "create"
    this.planClientSucces = null
    this.planClientError = null
    this.cancelDeletePlan()
    this.items = []
    this.showCreate = true
    this.closeAttachMenus()
    this.videoUploadError = null
    this.videoUploadSuccess = null
    this.videoUploadLoading = false
  }

  switchToManage(): void {
    this.mode = "manage"
    this.planClientSucces = null
    this.planClientError = null
    this.cancelDeletePlan()
    this.showCreate = false
    this.items = []
    this.closeAttachMenus()
    this.videoUploadError = null
    this.videoUploadSuccess = null
    this.videoUploadLoading = false
    this.queuedVideos = []
    this.loadList()
  }

  private reload(): void {
    this.planClientSucces = null
    this.planClientError = null
    this.cancelDeletePlan()
    this.closeAttachMenus()
    if (this.mode === "manage") {
      this.loadList()
    }
    else {
      this.items = []
      this.showCreate = true
    }
  }

  private normalize(item: any): PlanClientItem {
    const result: PlanClientItem = { _id: "", userId: "", contenu: "", videos: [] }

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
      } catch {
        result.createdAt = ""
      }
    }
    else {
      result.createdAt = ""
    }

    if (item && Array.isArray(item.videos)) {
      const vids: PlanVideo[] = []
      for (const v of item.videos) {
        const it: PlanVideo = { videoId: "", url: "", name: "", duration: 0 }
        if (v && v.videoId) {
          it.videoId = String(v.videoId)
        }
        if (v && v.url) {
          it.url = String(v.url)
        }
        if (v && v.name) {
          it.name = String(v.name)
        }
        if (v && typeof v.duration === "number") {
          it.duration = v.duration
        }
        vids.push(it)
      }
      result.videos = vids
    }
    else {
      result.videos = []
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

      this.items = raw.map(x => this.normalize(x))
      this.showCreate = this.items.length === 0
      this.listLoading = false
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
    document.execCommand('formatBlock', false, tag)
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
    this.planClientContenu = this.getEditorHtml()
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
    this.planClientContenu = ""
    if (this.editorRef && this.editorRef.nativeElement) {
      this.editorRef.nativeElement.innerHTML = ""
    }
  }

  async handleCreatePlanClient(): Promise<void> {
    this.planClientSucces = null
    this.planClientError = null

    const userId = this.selectedUserId
    if (!userId) {
      return
    }

    const html = this.getEditorHtml()
    if (this.isEditorEmpty(html)) {
      this.planClientError = "Le contenu ne peut pas être vide"
      return
    }

    this.planClientLoading = true
    try {
      const res = await this.addPlanClientService.addPlanClient({
        sharedWithClientId: userId,
        contenu: html,
        title: this.planClientTitre || ""
      })

      const createdPlanId = this.extractCreatedId(res)
      this.planClientSucces = "Plan client créé avec succès"

      if (createdPlanId && this.queuedVideos.length > 0) {
        for (const file of this.queuedVideos) {
          try {
            await this.uploadVideoService.upload(createdPlanId, file)
          }
          catch (err) {
            console.error(err)
          }
        }
        if (this.queuedVideos.length > 0) {
          this.planClientSucces = "Plan client créé + vidéos ajoutées"
        }
      }

      this.planClientLoading = false
      this.resetEditor()
      this.planClientTitre = ""
      this.queuedVideos = []
      this.showCreateAttachMenu = false

      await this.loadList()
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

  openDeletePlan(item: PlanClientItem): void {
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

  cancelDeletePlan(): void {
    this.deleteConfirmOpen = false
    this.deleteError = null
    this.deleteTargetId = null
    this.deleteTargetTitle = ""
  }

  async confirmDeletePlan(): Promise<void> {
    const targetId = this.deleteTargetId
    if (!targetId) {
      return
    }
    this.deleteError = null
    try {
      await this.deletePlanClientService.DeletePlanClient(targetId)
      this.items = this.items.filter(i => i._id !== targetId)
      if (this.items.length === 0) {
        this.showCreate = true
      }
      this.cancelDeletePlan()
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
  getDeletePlanLabel(): string {
    if (this.deleteTargetTitle && this.deleteTargetTitle.length > 0) {
      return "Etes vous sur de vouloir supprimer le plan \"" + this.deleteTargetTitle + "\" ?"
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

  openNewPlanVideoPicker(): void {
    this.closeAttachMenus()
    if (this.newPlanVideoInput && this.newPlanVideoInput.nativeElement) {
      this.newPlanVideoInput.nativeElement.value = ""
      this.newPlanVideoInput.nativeElement.click()
    }
  }

  handleNewPlanVideoPicked(event: Event): void {
    const input = event.target as HTMLInputElement
    if (!input || !input.files || input.files.length === 0) {
      return
    }
    for (const f of Array.from(input.files)) {
      this.queuedVideos.push(f)
    }
  }

  removeQueuedVideo(index: number): void {
    if (index >= 0 && index < this.queuedVideos.length) {
      this.queuedVideos.splice(index, 1)
    }
  }

  openVideoPicker(planId: string): void {
    this.videoUploadError = null
    this.videoUploadSuccess = null
    this.targetPlanForUpload = planId
    this.closeAttachMenus()

    if (this.planVideoInput && this.planVideoInput.nativeElement) {
      this.planVideoInput.nativeElement.value = ""
      this.planVideoInput.nativeElement.click()
    }
  }

  async handleVideoPicked(event: Event): Promise<void> {
    this.videoUploadError = null
    this.videoUploadSuccess = null

    const input = event.target as HTMLInputElement
    if (!input || !input.files || input.files.length === 0) {
      return
    }

    const planId = this.targetPlanForUpload
    if (!planId) {
      this.videoUploadError = "Plan client inconnu"
      return
    }

    this.videoUploadLoading = true
    try {
      for (const file of Array.from(input.files)) {
        await this.uploadVideoService.upload(planId, file)
      }

      await this.loadList()
      this.videoUploadSuccess = "Vidéo(s) ajoutée(s) au plan"
      this.targetPlanForUpload = null
      this.videoUploadLoading = false
    }
    catch {
      this.videoUploadLoading = false
      this.videoUploadError = "Upload refusé ou échoué"
    }
  }

  async detachVideo(planId: string, videoId: string): Promise<void> {
    if (!planId || !videoId) {
      return
    }
    const ok = confirm("Retirer cette vidéo du plan ?")
    if (!ok) {
      return
    }

    try {
      const res = await this.attachVideoService.detach(planId, videoId)
      if (res && res.item) {
        const updated = this.normalize(res.item)
        this.items = this.items.map(i => {
          if (i._id === updated._id) {
            return updated
          }
          else {
            return i
          }
        })
      }
    }
    catch {
      alert("Impossible de retirer la vidéo")
    }
  }
}
