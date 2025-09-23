import { Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { ChatService, ChatMessage } from './chat.service';
import { DeleteMessageService } from './delete-message.service';
import { modifyMessageService } from './modify-message.service';
import { AddPhotoService } from './add-photo.service';
import { DeletePhotoService } from './delete-photo.service';

type UiMessage = {
  id: string
  me: boolean
  text: string
  at: string
  photoUrl?: string | null
  photoId?: string | null
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './chat.html',
})
export class Chat implements OnInit, OnDestroy {

  showActionModal: boolean = false
  modalMessageIndex: number | null = null
  selectedMessageId: string | null = null
  showEditModal: boolean = false
  brouillonEdition: string = ""
  editMessageId: string | null = null
  selectedIsMine: boolean = false
  photoPreviewUrl: string | null = null
  showAttachmentMenu: boolean = false
  @ViewChild('photoInput') photoInput?: ElementRef<HTMLInputElement>
  selectedMessageHasPhoto: boolean = false
  selectedPhotoUrl: string | null = null
  selectedPhotoId: string | null = null
  previewPhotoId: string | null = null
  previewPhotoMessageId: string | null = null
  previewPhotoIsMine: boolean = false
  private photoIdByUrl: Record<string, string> = {}
  private readonly photoPrefix: string = '[[photo]]'

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private chat: ChatService,
    private deleteMessageService: DeleteMessageService,
    private modifyMessageService: modifyMessageService,
    private addPhotoService: AddPhotoService,
    private deletePhotoService: DeletePhotoService
  ) { }

  //l'id de la personne a qui on parle
  peerId: string = ""
  //ce que tu tapes dans lâ€™input
  input = signal("")
  //messages affiches
  messages: UiMessage[] = []
  //ton propre id utilisateur
  myUserId = signal<string | null>(null)
  //nom affiche du peer (ex: â€œCoachâ€)
  peerName = signal<string>("")
  //on garde la reference a lâ€™abonnement pour pouvoir unsubscribe
  private messageSub: any = null

  ngOnInit(): void {
    //Recuperer mon propre userId (pour tagger â€œmoiâ€ / â€œluiâ€)
    this.http.get<any>("http://localhost:3000/auth/me").subscribe({
      next: (u) => {
        if (u && u._id) {
          this.myUserId.set(String(u._id))
        } else {
          this.myUserId.set(null)
        }
      },
      error: () => {
        this.myUserId.set(null)
      }
    })

    //Lire lâ€™ID du peer dans lâ€™URL
    //si pas de peerId, on arrÃªte
    const fromUrl = this.route.snapshot.paramMap.get("peerId")
    if (typeof fromUrl === "string") {
      this.peerId = fromUrl
    }
    else {
      this.peerId = ""
    }

    if (!this.peerId) {
      console.warn("[chat] pas de peerId dans l'URL, j'arrÃªte ici")
      return
    }

    //Afficher un nom sympa pour le header (en option)
    this.http.get<any>(`http://localhost:3000/user/${this.peerId}`).subscribe({
      next: (u) => {
        if (u && (u.name || u.nickname || u.email)) {
          this.peerName.set(u.name || u.nickname || u.email)
        }
        else {
          this.peerName.set("Coach")
        }
      },
      error: () => {
        this.peerName.set("Coach")
      }
    })

    //Charger lâ€™historique AVANT dâ€™ouvrir la socket
    this.chat.getHistoryWithPeer(this.peerId, 50).subscribe({
      next: (res) => {
        // securiser
        if (res && Array.isArray(res.messages)) {
          const myId = this.myUserId()

          for (const msg of res.messages) {
            let isMe = false
            if (myId && msg && msg.userId) {
              if (String(msg.userId) === String(myId)) {
                isMe = true
              }
            }

            let when: Date
            if (msg && msg.at) {
              when = new Date(msg.at)
            }
            else {
              when = new Date()
            }

            const at = when.toLocaleTimeString()

            let id = ""
            if (msg && typeof (msg as any)._id === "string") {
              id = (msg as any)._id
            }
            else if (msg && typeof (msg as any).id === "string") {
              id = (msg as any).id
            }
            else {
              id = ""
            }

            const uiItem = this.buildUiMessage(msg, isMe, at, id)
            this.messages.push(uiItem)
          }

          //scroller aprÃ¨s rendu
          queueMicrotask(() => this.scrollToBottom())
        }

        //ensuite ouvrir la socket
        const opened = this.chat.connect(this.peerId)
        if (!opened) {
          console.warn("[chat] socket non ouverte (token manquant e)")
          return
        }

        //Sâ€™abonner aux messages temps reel
        this.messageSub = this.chat.stream().subscribe((msg: ChatMessage) => {
          const myId = this.myUserId()
          let isMe = false

          if (myId && msg && msg.userId) {
            if (String(msg.userId) === String(myId)) {
              isMe = true
            }
          }

          let when: Date
          if (msg && msg.at) {
            when = new Date(msg.at)
          }
          else {
            when = new Date()
          }

          const at = when.toLocaleTimeString()

          let id = ""
          if (msg && typeof (msg as any)._id === "string") {
            id = (msg as any)._id
          }
          else if (msg && typeof (msg as any).id === "string") {
            id = (msg as any).id
          }
          else {
            id = ""
          }

          const uiItem = this.buildUiMessage(msg, isMe, at, id)
          this.messages.push(uiItem)

          queueMicrotask(() => this.scrollToBottom())
        })
      },
      error: () => {
        console.warn("[chat] impossible de charger l'historique, j'ouvre quand mÃªme la socket")

        // mÃªme si lâ€™historique echoue, on ouvre la socket pour le temps reel
        const opened = this.chat.connect(this.peerId)
        if (!opened) {
          console.warn("[chat] socket non ouverte (token manquant e)")
          return
        }

        this.messageSub = this.chat.stream().subscribe((msg: ChatMessage) => {
          const myId = this.myUserId()
          let isMe = false

          if (myId && msg && msg.userId) {
            if (String(msg.userId) === String(myId)) {
              isMe = true
            }
          }

          let when: Date
          if (msg && msg.at) {
            when = new Date(msg.at)
          }
          else {
            when = new Date()
          }

          const at = when.toLocaleTimeString()

          let id = ""
          if (msg && typeof (msg as any)._id === "string") {
            id = (msg as any)._id
          }
          else if (msg && typeof (msg as any).id === "string") {
            id = (msg as any).id
          }
          else {
            id = ""
          }

          const uiItem = this.buildUiMessage(msg, isMe, at, id)
          this.messages.push(uiItem)

          queueMicrotask(() => this.scrollToBottom())
        })
      }
    })
  }

  send(): void {
    this.closeAttachmentMenu()
    //lire le texte, trim et valider
    const text = this.input().trim()
    if (!text) {
      return
    }

    //envoyer au back via socket
    const ok = this.chat.send(text)
    if (!ok) {
      return
    }

    //vider lâ€™input + scroll en bas
    this.input.set("")
    queueMicrotask(() => this.scrollToBottom())
  }



  toggleAttachmentMenu(): void {
    if (this.showAttachmentMenu) {
      this.showAttachmentMenu = false
    }
    else {
      this.showAttachmentMenu = true
    }
  }

  closeAttachmentMenu(): void {
    if (this.showAttachmentMenu) {
      this.showAttachmentMenu = false
    }
  }

  openPhotoPicker(): void {
    this.closeAttachmentMenu()
    if (this.photoInput) {
      const element = this.photoInput.nativeElement
      if (element) {
        element.value = ""
        element.click()
      }
    }
  }


  private scrollToBottom(): void {
    const el = document.getElementById("messages")
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }

  private buildUiMessage(msg: ChatMessage | null | undefined, isMe: boolean, at: string, id: string): UiMessage {
    let text = ""
    if (msg && typeof msg.text === "string") {
      text = msg.text
    }

    const photoInfo = this.extractPhotoData(text)
    if (photoInfo) {
      if (photoInfo.photoId) {
        this.photoIdByUrl[photoInfo.url] = photoInfo.photoId
      }

      let finalPhotoId: string | null = null
      if (photoInfo.photoId) {
        finalPhotoId = photoInfo.photoId
      }
      else {
        const known = this.photoIdByUrl[photoInfo.url]
        if (known) {
          finalPhotoId = known
        }
      }

      return {
        id: id,
        me: isMe,
        text: "",
        at: at,
        photoUrl: photoInfo.url,
        photoId: finalPhotoId
      }
    }

    return {
      id: id,
      me: isMe,
      text: text,
      at: at,
      photoUrl: null,
      photoId: null
    }
  }

  private isLikelyObjectId(value: string | null | undefined): boolean {
    if (!value) {
      return false
    }
    const trimmed = String(value).trim()
    if (trimmed.length !== 24) {
      return false
    }
    return /^[0-9a-fA-F]{24}$/.test(trimmed)
  }

  private resolvePhotoIdFromResponse(result: any): string | null {
    if (!result) {
      return null
    }

    const candidates: any[] = [result]

    if (result && typeof result === 'object') {
      if ('data' in result) {
        candidates.push((result as any).data)
      }
      if ('photo' in result) {
        candidates.push((result as any).photo)
      }
    }

    for (const item of candidates) {
      if (!item || typeof item !== 'object') {
        continue
      }

      const candidate: any = item as any
      if (typeof candidate._id === 'string') {
        const trimmed = candidate._id.trim()
        if (trimmed.length > 0) {
          return trimmed
        }
      }
      if (typeof candidate.id === 'string') {
        const trimmed = candidate.id.trim()
        if (trimmed.length > 0) {
          return trimmed
        }
      }

      const inner = candidate._id
      if (inner && typeof inner === 'object') {
        if (typeof (inner as any).$oid === 'string') {
          const trimmed = (inner as any).$oid.trim()
          if (trimmed.length > 0) {
            return trimmed
          }
        }

        if (typeof inner.toString === 'function') {
          const converted = String(inner.toString()).trim()
          if (converted.length > 0 && converted !== '[object Object]') {
            return converted
          }
        }
      }
    }

    return null
  }

  private extractPhotoData(text: string): { url: string, photoId: string | null } | null {
    if (!text) {
      return null
    }

    const markerIndex = text.indexOf(this.photoPrefix)
    if (markerIndex === -1) {
      return null
    }

    const payload = text.substring(markerIndex + this.photoPrefix.length).trim()
    if (!payload) {
      return null
    }

    const separatorIndex = payload.indexOf("::")
    if (separatorIndex >= 0) {
      const possibleId = payload.substring(0, separatorIndex)
      const rawUrl = payload.substring(separatorIndex + 2).trim()
      if (rawUrl.startsWith("http")) {
        let idValue: string | null = null
        if (possibleId) {
          idValue = possibleId
        }
        return { url: rawUrl, photoId: idValue }
      }
      return null
    }

    if (payload.startsWith("http")) {
      return { url: payload, photoId: null }
    }

    return null
  }

  trackByIdx(i: number, _m: UiMessage) { return i }

  ngOnDestroy(): void {
    if (this.messageSub && typeof this.messageSub.unsubscribe === "function") {
      this.messageSub.unsubscribe()
    }
    this.chat.disconnect()
  }

  openActionModal(i: number, messageId: string): void {
    this.closeAttachmentMenu()
    this.modalMessageIndex = i
    this.selectedMessageId = messageId
    this.showActionModal = true

    if (i < 0 || i >= this.messages.length) {
      this.selectedIsMine = false
      this.selectedMessageHasPhoto = false
      this.selectedPhotoUrl = null
      this.selectedPhotoId = null
      return
    }

    const m = this.messages[i]
    if (m && m.me === true) {
      this.selectedIsMine = true
    }
    else {
      this.selectedIsMine = false
    }

    if (m && m.photoUrl) {
      this.selectedMessageHasPhoto = true
      this.selectedPhotoUrl = m.photoUrl
      if (m.photoId) {
        this.selectedPhotoId = m.photoId
      }
      else {
        if (this.photoIdByUrl[m.photoUrl]) {
          this.selectedPhotoId = this.photoIdByUrl[m.photoUrl]
        }
        else {
          this.selectedPhotoId = null
        }
      }
    }
    else {
      this.selectedMessageHasPhoto = false
      this.selectedPhotoUrl = null
      this.selectedPhotoId = null
    }
  }

  closeActionModal(): void {
    this.showActionModal = false
    this.modalMessageIndex = null
    this.selectedMessageId = null
    this.selectedMessageHasPhoto = false
    this.selectedPhotoUrl = null
    this.selectedPhotoId = null
  }

  async handleDelete(messageId: string): Promise<void> {
    try {
      await this.deleteMessageService.deleteMessage(messageId)
      this.messages = this.messages.filter(m => m.id !== messageId)
      if (this.previewPhotoMessageId === messageId) {
        this.cancelPhotoPreview()
      }
      this.closeActionModal()
    }
    catch (err) {
      console.error("Erreur de suppresion du message :", err)
    }
  }

  async confirmDelete(): Promise<void> {
    const id = this.selectedMessageId
    if (!id) {
      return
    }
    await this.handleDelete(id)
  }

  async copierMessageSelectionne(): Promise<void> {
    if (this.selectedMessageHasPhoto) {
      return
    }
    const id = this.selectedMessageId
    if (!id) {
      return
    }

    let texte = ""
    for (let i = 0; i < this.messages.length; i++) {
      const item = this.messages[i]
      if (!item) {
        continue
      }
      if (item.id === id) {
        if (item.text) {
          texte = item.text
        }
        break
      }
    }

    try {
      await navigator.clipboard.writeText(texte)
    }
    catch (err) {
      console.error(err)
    }
    this.closeActionModal()
  }



  openSelectedPhoto(): void {
    if (!this.selectedMessageHasPhoto) {
      return
    }
    if (!this.selectedPhotoUrl) {
      return
    }

    let photoId: string | null = this.selectedPhotoId
    if (!photoId) {
      const known = this.photoIdByUrl[this.selectedPhotoUrl]
      if (known) {
        photoId = known
      }
    }

    const messageId = this.selectedMessageId
    const isMine = this.selectedIsMine
    this.openPhotoPreview(this.selectedPhotoUrl, photoId, messageId, isMine)
    this.closeActionModal()
  }

  async confirmDeletePhoto(): Promise<void> {
    const messageId = this.selectedMessageId
    const url = this.selectedPhotoUrl || null

    if (!messageId) {
      return
    }

    let photoId: string | null = this.selectedPhotoId || null
    if (!photoId && url) {
      const known = this.photoIdByUrl[url]
      if (known) {
        photoId = known
      }
    }

    const safePhotoId = this.isLikelyObjectId(photoId) ? String(photoId) : null

    if (safePhotoId && url) {
      await this.handleDeletePhoto(safePhotoId, url)
    }
    else if (safePhotoId) {
      await this.handleDeletePhoto(safePhotoId)
    }
    else {
      console.warn('[confirmDeletePhoto] identifiant de photo manquant pour', url)
    }

    await this.handleDelete(messageId)
  }
  ouvrirEditionMessage(): void {
    if (this.modalMessageIndex == null || !this.selectedMessageId) {
      return
    }
    if (this.modalMessageIndex < 0 || this.modalMessageIndex >= this.messages.length) {
      return
    }
    const msg = this.messages[this.modalMessageIndex]
    if (!msg) {
      return
    }
    if (msg.photoUrl) {
      return
    }
    if (msg.text) {
      this.brouillonEdition = msg.text
    }
    else {
      this.brouillonEdition = ""
    }
    this.editMessageId = this.selectedMessageId
    this.showActionModal = false
    this.showEditModal = true
  }

  fermerEdition(): void {
    this.showEditModal = false
    this.brouillonEdition = ""
    this.editMessageId = null
  }

  async confirmRename(): Promise<void> {
    // on lit depuis l'Ã©tat de la modale pour Ã©viter les erreurs dâ€™argument
    const id = this.editMessageId
    const nouveauTexte = this.brouillonEdition

    if (!id) {
      return
    }

    try {
      const res = await this.modifyMessageService.modifyMessage(id, nouveauTexte)

      // mettre Ã  jour le texte en place
      const idx = this.messages.findIndex(m => m.id === id)
      if (idx !== -1) {
        this.messages[idx] = {
          ...this.messages[idx],
          text: String(nouveauTexte)
        }
      }

      this.fermerEdition()
    }
    catch (err) {
      console.error("[confirmRename] erreur :", err)
    }
  }

  async handleUploadPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement
    if (!input) {
      return
    }

    this.closeAttachmentMenu()

    const fileList = input.files
    const file = fileList && fileList.length > 0 ? fileList[0] : null
    if (!file) {
      return
    }

    try {
      const result: any = await this.addPhotoService.addPhoto(file)

      let url = ''
      if (result && typeof result.url === 'string') {
        url = result.url
      } else if (result && result.data && typeof result.data.url === 'string') {
        url = result.data.url
      } else if (result && result.photo && typeof result.photo.url === 'string') {
        url = result.photo.url
      }
      url = url ? String(url).trim() : ''

      if (!url) {
        console.warn('[handleUploadPhoto] impossible de determiner l\'URL de la photo retournee')
        return
      }

      const photoId = this.resolvePhotoIdFromResponse(result)
      if (photoId) {
        this.photoIdByUrl[url] = photoId
      }

      let payload = this.photoPrefix + url
      if (photoId) {
        payload = this.photoPrefix + photoId + '::' + url
      }

      const ok = this.chat.send(payload)
      if (ok) {
        queueMicrotask(() => this.scrollToBottom())
      }
      else {
        console.warn('[handleUploadPhoto] envoi message photo echoue')
      }
    }
    catch (err) {
      console.error('Erreur :', err)
    }
    finally {
      input.value = ''
    }
  }

  async handleDeletePhoto(photoId: string, photoUrl?: string): Promise<void> {
    if (!this.isLikelyObjectId(photoId)) {
      console.warn('[handleDeletePhoto] identifiant photo invalide', photoId)
      return
    }

    try {
      await this.deletePhotoService.deletePhoto(photoId)
      if (photoUrl) {
        if (this.photoIdByUrl[photoUrl]) {
          delete this.photoIdByUrl[photoUrl]
        }
      }
      else {
        for (const key of Object.keys(this.photoIdByUrl)) {
          if (this.photoIdByUrl[key] === photoId) {
            delete this.photoIdByUrl[key]
          }
        }
      }
    }
    catch (err) {
      console.error('Erreur suppression photo :', err)
    }
  }



  async deletePhotoFromPreview(): Promise<void> {
    const messageId = this.previewPhotoMessageId
    const url = this.photoPreviewUrl || null

    if (!messageId) {
      return
    }

    let photoId: string | null = this.previewPhotoId || null
    if (!photoId && url) {
      const known = this.photoIdByUrl[url]
      if (known) {
        photoId = known
      }
    }

    const safePhotoId = this.isLikelyObjectId(photoId) ? String(photoId) : null

    if (safePhotoId && url) {
      await this.handleDeletePhoto(safePhotoId, url)
    }
    else if (safePhotoId) {
      await this.handleDeletePhoto(safePhotoId)
    }
    else {
      console.warn('[deletePhotoFromPreview] aucun identifiant photo associe au message, suppression seulement du message')
    }

    await this.handleDelete(messageId)
    this.cancelPhotoPreview()
  }
  openPhotoPreview(url: string, photoId?: string | null, messageId?: string | null, isMine?: boolean): void {
    this.photoPreviewUrl = url

    if (photoId) {
      this.previewPhotoId = photoId
    }
    else {
      this.previewPhotoId = null
    }

    if (messageId) {
      this.previewPhotoMessageId = messageId
    }
    else {
      this.previewPhotoMessageId = null
    }

    if (isMine === true) {
      this.previewPhotoIsMine = true
    }
    else {
      this.previewPhotoIsMine = false
    }
  }

  closePhotoPreview(event: MouseEvent): void {
    const target = event.target as HTMLElement
    if (!target) {
      return
    }
    if (target.classList.contains("photo-preview-overlay")) {
      this.cancelPhotoPreview()
    }
  }

  cancelPhotoPreview(): void {
    this.photoPreviewUrl = null
    this.previewPhotoId = null
    this.previewPhotoMessageId = null
    this.previewPhotoIsMine = false
  }
}