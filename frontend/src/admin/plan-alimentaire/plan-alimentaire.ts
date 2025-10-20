import { CommonModule } from '@angular/common';
import { Component, ElementRef, Input, OnChanges, OnInit, QueryList, SimpleChanges, ViewChild, ViewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AddPlanAlimentaireService } from './create-planAlimentaire.service';
import { DeletePlanAlimentaireService } from './delete-planAlimentaire.service';
import { ListPlanAlimentaireService } from './list-planAlimentaire.service';
import { ModifiyPlanAlimentaireService } from './modify-planAlimentaire.service';

type PlanAlimentaireItem = {
  _id: string
  userId: string
  contenu: string
  title?: string
  createdAt?: string
}

type UpdatePlanAlimentairePayload = {
  title?: string
  contenu?: string
}

@Component({
  selector: 'app-plan-alimentaire',
  imports: [CommonModule, FormsModule],
  templateUrl: './plan-alimentaire.html',
  styleUrls: ['./plan-alimentaire.css'],
  standalone: true
})
export class PlanAlimentaire implements OnInit, OnChanges {
  @Input() selectedUserId: string | null = null
  @Input() myUserId: string | null = null

  @ViewChild("editor", { static: false }) editorRef: ElementRef<HTMLDivElement> | undefined = undefined
  @ViewChildren("planAlimentaireContentHost") contentRefs: QueryList<ElementRef<HTMLDivElement>> | undefined = undefined
  planAlimentaireContenu = ""
  planAlimentaireId: string | null = null

  planAlimentaireLoading = false
  planAlimentaireError: string | null = null
  planAlimentaireSucces: string | null = null
  mode: "create" | "manage" = "create"
  deleteConfirmOpen = false
  deleteTargetId: string | null = null
  deleteTargetTitle = ""
  deleteError: string | null = null

  listLoading = false
  listError: String | null = null
  items: PlanAlimentaireItem[] = []
  showCreate = true

  showCreateAttachMenu = false
  showAttachMenuFor: string | null = null

  planAlimentaireTitre = ""
  private targetplanAlimentaireForUpload: string | null = null
  private listRenderScheduled = false

  constructor(
    private addPlanAlimentaireService: AddPlanAlimentaireService,
    private deletePlanAlimentaireService: DeletePlanAlimentaireService,
    private listPlanAlimentaireService: ListPlanAlimentaireService,
    private modifiyPlanAlimentaireService: ModifiyPlanAlimentaireService
  ) { }

  ngOnInit(): void {
    this.reload()
  }

  ngAfterViewInit(): void {
    if (this.contentRefs) {
      this.contentRefs.changes.subscribe(() => {
        this.renderListContent()
      })
    }
    this.renderListContent()
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (Object.prototype.hasOwnProperty.call(changes, "selectedUserId")) {
      this.reload()
    }
  }

  switchToCreate(): void {
    this.mode = "create"
    this.planAlimentaireSucces = null
    this.planAlimentaireError = null
    this.cancelDeletePlanAlimentaire()
    this.items = []
    this.closeAttachMenus()
    this.scheduleListRender()
  }

  switchToManage(): void {
    this.mode = "manage"
    this.planAlimentaireSucces = null
    this.planAlimentaireError = null
    this.cancelDeletePlanAlimentaire()
    this.showCreate = false
    this.items = []
    this.closeAttachMenus()
    this.scheduleListRender()
    this.loadList()
  }

  private reload(): void {
    this.planAlimentaireSucces = null
    this.planAlimentaireError = null
    this.cancelDeletePlanAlimentaire()
    this.closeAttachMenus()
    if (this.mode === "manage") {
      this.loadList()
    }
    else {
      this.items = []
      this.showCreate = true
      this.scheduleListRender()
    }
  }

  private normalize(item: any): PlanAlimentaireItem {
    const result: PlanAlimentaireItem = { _id: "", userId: "", contenu: "" }

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

    let rawContenu = ""
    if (item && item.contenu) {
      rawContenu = String(item.contenu)
    }
    result.contenu = this.sanitizeHtml(rawContenu)

    return result
  }

  private async loadList(): Promise<void> {
    const userId = this.selectedUserId
    if (!userId) {
      this.items = []
      this.listLoading = false
      this.listError = null
      this.scheduleListRender()
      return
    }

    this.listLoading = true
    this.listError = null
    try {
      const res: any = await this.listPlanAlimentaireService.listPlanAlimentaireForUser(userId)

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
      this.scheduleListRender()
    }
    catch {
      this.items = []
      this.listLoading = false
      this.listError = "Impossible de charger les \"plans alimentaires\""
      this.scheduleListRender()
    }
  }

  getCreateButtonLabel(): string {
    if (this.planAlimentaireLoading) {
      return "création..."
    }
    else {
      return "Créer la rubrique \"plan alimentaire\""
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

  onEditorInput(): void {
    this.planAlimentaireContenu = this.getEditorHtml()
  }

  private getEditorHtml(): string {
    if (this.editorRef && this.editorRef.nativeElement) {
      return this.serializeNodes(Array.from(this.editorRef.nativeElement.childNodes))
    }
    return ""
  }

  private isEditorEmpty(html: string): boolean {
    return this.isHtmlEmpty(html)
  }

  private resetEditor(): void {
    this.planAlimentaireContenu = ""
    if (this.editorRef && this.editorRef.nativeElement) {
      this.renderHtmlInto(this.editorRef.nativeElement, "")
    }
  }

  async handlePlanAlimentaire(): Promise<void> {
    this.planAlimentaireSucces = null
    this.planAlimentaireError = null

    const userId = this.selectedUserId
    if (!userId) {
      return
    }

    const html = this.getEditorHtml()
    if (this.isEditorEmpty(html)) {
      this.planAlimentaireError = "Le contenu ne peut pas être vide"
      return
    }

    this.planAlimentaireLoading = true
    try {
      const res = await this.addPlanAlimentaireService.addPlanAlimentaire({
        sharedWithClientId: userId,
        contenu: html,
        title: this.planAlimentaireTitre || ""
      })

      const createdPlanId = this.extractCreatedId(res)
      this.planAlimentaireSucces = "\"plan alimentaire\" créé avec succès"


      this.planAlimentaireLoading = false
      this.resetEditor()
      this.planAlimentaireTitre = ""
      this.showCreateAttachMenu = false

      await this.loadList()
    }
    catch (err) {
      this.planAlimentaireLoading = false
      if (err) {
        this.planAlimentaireError = "Client manquant / invalide"
      }
      else if (err) {
        this.planAlimentaireError = "Contenu invalide"
      }
      else {
        this.planAlimentaireError = "Impossible de créer le \"plan alimentaire\""
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

  openDeletePlanAlimentaire(item: PlanAlimentaireItem): void {
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

  cancelDeletePlanAlimentaire(): void {
    this.deleteConfirmOpen = false
    this.deleteError = null
    this.deleteTargetId = null
    this.deleteTargetTitle = ""
  }

  async confirmDeletePlanAlimentaire(): Promise<void> {
    const targetId = this.deleteTargetId
    if (!targetId) {
      return
    }
    this.deleteError = null
    try {
      await this.deletePlanAlimentaireService.DeletePlanAlimentaire(targetId)
      this.items = this.items.filter(i => i._id !== targetId)
      if (this.items.length === 0) {
        this.showCreate = true
      }
      this.cancelDeletePlanAlimentaire()
      this.scheduleListRender()
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

  getDeletePlanAlimentaireLabel(): string {
    if (this.deleteTargetTitle && this.deleteTargetTitle.length > 0) {
      return "Etes vous sur de vouloir supprimer le \"plan alimentaire\"" + this.deleteTargetTitle + "\" ?"
    }
    else {
      return "Etes vous sur de vouloir supprimer ce plan alimentaire ?"
    }
  }

  getPlanAlimentaireFormTitle(): string {
    const identifier = this.planAlimentaireId
    if (identifier && identifier.trim().length > 0) {
      return "Modifier \"plan alimentaire\""
    }
    else {
      return "Créer \"plan alimentaire\""
    }
  }

  getPlanAlimentaireItemTitle(item: PlanAlimentaireItem): string {
    if (item && item.title) {
      const trimmed = item.title.trim()
      if (trimmed.length > 0) {
        return trimmed
      }
    }
    if (item && item._id) {
      return "#" + item._id
    }
    return "\"plan alimentaire\""
  }

  private scheduleListRender(): void {
    if (this.listRenderScheduled) {
      return
    }
    this.listRenderScheduled = true
    setTimeout(() => {
      this.listRenderScheduled = false
      this.renderListContent()
    })
  }

  private renderListContent(): void {
    if (!this.contentRefs) {
      return
    }
    const hosts = this.contentRefs.toArray()
    for (let i = 0; i < hosts.length; i += 1) {
      const ref = hosts[i]
      const item = this.items[i]
      if (ref && ref.nativeElement) {
        let html = ""
        if (item) {
          html = item.contenu
        }
        this.renderHtmlInto(ref.nativeElement, html)
      }
    }
  }

  private renderHtmlInto(element: HTMLElement, html: string): void {
    if (!element) {
      return
    }
    while (element.firstChild) {
      element.removeChild(element.firstChild)
    }
    if (!html || html.trim().length === 0) {
      return
    }
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")
    const fragment = document.createDocumentFragment()
    for (const node of Array.from(doc.body.childNodes)) {
      fragment.appendChild(node.cloneNode(true))
    }
    element.appendChild(fragment)
  }

  private sanitizeHtml(html: string): string {
    if (!html) {
      return ""
    }
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")
    return this.serializeNodes(Array.from(doc.body.childNodes))
  }

  private serializeNodes(nodes: ChildNode[]): string {
    const parts: string[] = []
    for (const node of nodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        parts.push(this.escapeHtml(node.textContent || ""))
        continue
      }
      if (node.nodeType !== Node.ELEMENT_NODE) {
        continue
      }
      const element = node as HTMLElement
      const tagName = (element.tagName || "").toLowerCase()
      if (tagName === "script" || tagName === "style") {
        continue
      }
      if (tagName === "span") {
        parts.push(this.serializeNodes(Array.from(element.childNodes)))
        continue
      }
      if (tagName === "div") {
        const innerDiv = this.serializeNodes(Array.from(element.childNodes))
        if (innerDiv.trim().length > 0) {
          parts.push("<p>" + innerDiv + "</p>")
        }
        continue
      }
      const mapped = this.mapTag(tagName)
      if (!mapped) {
        parts.push(this.serializeNodes(Array.from(element.childNodes)))
        continue
      }
      if (mapped === "br") {
        parts.push("<br>")
        continue
      }
      const inner = this.serializeNodes(Array.from(element.childNodes))
      if (inner.trim().length === 0 && mapped !== "br") {
        continue
      }
      if (mapped === "a") {
        const href = this.sanitizeHref(element.getAttribute("href") || "")
        if (href) {
          parts.push("<a href=\"" + this.escapeAttribute(href) + "\" rel=\"noopener noreferrer\">" + inner + "</a>")
        }
        else {
          parts.push(inner)
        }
        continue
      }
      parts.push("<" + mapped + ">" + inner + "</" + mapped + ">")
    }
    return parts.join("")
  }

  private mapTag(tagName: string): string | null {
    if (tagName === "b" || tagName === "strong") {
      return "strong"
    }
    if (tagName === "i" || tagName === "em") {
      return "em"
    }
    if (tagName === "u") {
      return "u"
    }
    if (tagName === "p") {
      return "p"
    }
    if (tagName === "h1") {
      return "h1"
    }
    if (tagName === "h2") {
      return "h2"
    }
    if (tagName === "blockquote") {
      return "blockquote"
    }
    if (tagName === "ul") {
      return "ul"
    }
    if (tagName === "ol") {
      return "ol"
    }
    if (tagName === "li") {
      return "li"
    }
    if (tagName === "a") {
      return "a"
    }
    if (tagName === "br") {
      return "br"
    }
    return null
  }

  private sanitizeHref(href: string): string | null {
    const trimmed = (href || "").trim()
    if (trimmed.length === 0) {
      return null
    }
    const lower = trimmed.toLowerCase()
    if (lower.startsWith("javascript:") || lower.startsWith("data:")) {
      return null
    }
    if (lower.startsWith("http://") || lower.startsWith("https://") || lower.startsWith("mailto:") || lower.startsWith("tel:")) {
      return trimmed
    }
    if (lower.startsWith("/")) {
      return trimmed
    }
    return null
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;")
  }

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value)
  }

  private isHtmlEmpty(html: string): boolean {
    if (!html) {
      return true
    }
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, "text/html")
    const text = (doc.body.textContent || "").trim()
    if (text.length > 0) {
      return false
    }
    const hasBreak = doc.body.querySelector("br")
    return !hasBreak
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

  async updatePlanAlimentaire(patch?: UpdatePlanAlimentairePayload): Promise<void> {
    const planAlimentaireId = this.planAlimentaireId
    if (!planAlimentaireId || planAlimentaireId.trim().length === 0) {
      this.planAlimentaireError = "Impossible de modifier : identifiant manquant."
      return
    }

    let toSend: UpdatePlanAlimentairePayload
    if (patch && typeof patch === "object") {
      toSend = patch
    }
    else {
      toSend = {
        title: this.planAlimentaireTitre,
        contenu: this.getEditorHtml()
      }
    }

    const rienFourni = !Object.prototype.hasOwnProperty.call(toSend, "title") && !Object.prototype.hasOwnProperty.call(toSend, "contenu")
    if (rienFourni) {
      this.planAlimentaireError = "Aucun modification fournie"
      return
    }

    this.planAlimentaireError = null
    this.planAlimentaireSucces = null

    try {
      const res: any = await this.modifiyPlanAlimentaireService.updatePlanAlimentaire(planAlimentaireId, toSend)
      let updated: PlanAlimentaireItem | null = null
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
        this.scheduleListRender()
      }
      this.planAlimentaireSucces = "Modifications enregistrées."
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
      this.planAlimentaireError = errorMessage
      console.error("\"updatePlanAlimentaire\" erreur :", err)
    }
  }

  startEdit(item: PlanAlimentaireItem): void {
    this.mode = "create"
    this.planAlimentaireSucces = null
    this.planAlimentaireError = null

    this.planAlimentaireId = item._id || null
    this.planAlimentaireTitre = item.title || ""

    let html = ""
    if (item && item.contenu) {
      html = item.contenu
    }
    if (this.editorRef && this.editorRef.nativeElement) {
      this.renderHtmlInto(this.editorRef.nativeElement, html)
    }
    this.planAlimentaireContenu = html
  }

  cancelEdit(): void {
    this.planAlimentaireId = null
    this.planAlimentaireTitre = ""
    this.resetEditor()
    this.planAlimentaireSucces = null
    this.planAlimentaireError = null
  }
}