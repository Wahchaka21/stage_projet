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
import { AddVideoService } from './add-video.service';
import { DeleteVideoService } from './delete-video.service';

type UiMessage = {
  id: string
  me: boolean
  text: string
  at: string
  photoUrl: string | null
  photoId: string | null
  videoUrl: string | null
  videoId: string | null
  videoName: string | null
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
  @ViewChild('photoInput') photoInput: ElementRef<HTMLInputElement> | undefined = undefined
  @ViewChild('videoInput') videoInput: ElementRef<HTMLInputElement> | undefined = undefined
  selectedMessageHasPhoto: boolean = false
  selectedMessageHasVideo: boolean = false
  selectedPhotoUrl: string | null = null
  selectedPhotoId: string | null = null
  selectedVideoUrl: string | null = null
  selectedVideoId: string | null = null
  previewPhotoId: string | null = null
  previewPhotoMessageId: string | null = null
  previewPhotoIsMine: boolean = false
  private photoIdByUrl: Record<string, string> = {}
  private readonly photoPrefix: string = '[[photo]]'
  private videoIdByUrl: Record<string, string> = {}
  private readonly videoPrefix: string = '[[video]]'

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private chat: ChatService,
    private deleteMessageService: DeleteMessageService,
    private modifyMessageService: modifyMessageService,
    private addPhotoService: AddPhotoService,
    private deletePhotoService: DeletePhotoService,
    private addvideoService: AddVideoService,
    private deleteVideoService: DeleteVideoService
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


  openVideoPicker(): void {
    this.closeAttachmentMenu()
    if (this.videoInput) {
      const element = this.videoInput.nativeElement
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

    const videoInfo = this.extractVideoData(text)
    if (videoInfo) {
      if (videoInfo.videoId) {
        this.videoIdByUrl[videoInfo.url] = videoInfo.videoId
      }

      let finalVideoId: string | null = null
      if (videoInfo.videoId) {
        finalVideoId = videoInfo.videoId
      }
      else {
        const knownVideo = this.videoIdByUrl[videoInfo.url]
        if (knownVideo) {
          finalVideoId = knownVideo
        }
      }

      let finalVideoName: string | null = null
      if (videoInfo.name) {
        finalVideoName = videoInfo.name
      }
      else {
        try {
          const parsed = new URL(videoInfo.url)
          const base = parsed.pathname.split('/').pop()
          if (base) {
            finalVideoName = decodeURIComponent(base)
          }
        }
        catch (err) {
          const fallback = videoInfo.url.split('/').pop()
          if (fallback) {
            finalVideoName = fallback
          }
        }
      }

      return {
        id: id,
        me: isMe,
        text: "",
        at: at,
        photoUrl: null,
        photoId: null,
        videoUrl: videoInfo.url,
        videoId: finalVideoId,
        videoName: finalVideoName
      }
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
        photoId: finalPhotoId,
        videoUrl: null,
        videoId: null,
        videoName: null
      }
    }

    return {
      id: id,
      me: isMe,
      text: text,
      at: at,
      photoUrl: null,
      photoId: null,
      videoUrl: null,
      videoId: null,
      videoName: null
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

    this.selectedMessageHasPhoto = false
    this.selectedPhotoUrl = null
    this.selectedPhotoId = null
    this.selectedMessageHasVideo = false
    this.selectedVideoUrl = null
    this.selectedVideoId = null

    if (i < 0 || i >= this.messages.length) {
      this.selectedIsMine = false
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
      else if (this.photoIdByUrl[m.photoUrl]) {
        this.selectedPhotoId = this.photoIdByUrl[m.photoUrl]
      }
    }

    if (m && m.videoUrl) {
      this.selectedMessageHasVideo = true
      this.selectedVideoUrl = m.videoUrl
      if (m.videoId) {
        this.selectedVideoId = m.videoId
      }
      else if (this.videoIdByUrl[m.videoUrl]) {
        this.selectedVideoId = this.videoIdByUrl[m.videoUrl]
      }
    }
  }

  closeActionModal(): void {
    this.showActionModal = false
    this.modalMessageIndex = null
    this.selectedMessageId = null
    this.selectedMessageHasPhoto = false
    this.selectedPhotoUrl = null
    this.selectedPhotoId = null
    this.selectedMessageHasVideo = false
    this.selectedVideoUrl = null
    this.selectedVideoId = null
  }

  async handleDelete(messageId: string): Promise<void> {
    try {
      const existing = this.messages.find(m => m.id === messageId)
      await this.deleteMessageService.deleteMessage(messageId)
      if (existing?.photoUrl) {
        if (this.photoIdByUrl[existing.photoUrl]) {
          delete this.photoIdByUrl[existing.photoUrl]
        }
      }
      if (existing?.videoUrl) {
        if (this.videoIdByUrl[existing.videoUrl]) {
          delete this.videoIdByUrl[existing.videoUrl]
        }
      }
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
    if (this.selectedMessageHasPhoto || this.selectedMessageHasVideo) {
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

  downloadSelectedVideo(): void {
    if (!this.selectedMessageHasVideo) {
      return
    }
    if (!this.selectedVideoUrl) {
      return
    }

    try {
      window.open(this.selectedVideoUrl, '_blank', 'noopener')
    }
    catch (err) {
      console.error('[downloadSelectedVideo] impossible d\'ouvrir la video :', err)
    }
    this.closeActionModal()
  }

  handleVideoLinkClick(event: MouseEvent, index: number, messageId: string, isMine: boolean | null | undefined): void {
    event.stopPropagation()
    if (isMine) {
      event.preventDefault()
      this.openActionModal(index, messageId)
    }
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

    let safePhotoId: string | null = null
    if (this.isLikelyObjectId(photoId)) {
      safePhotoId = String(photoId)
    }

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

  async confirmDeleteVideo(): Promise<void> {
    const messageId = this.selectedMessageId
    const url = this.selectedVideoUrl || null

    if (!messageId) {
      return
    }

    let videoId: string | null = this.selectedVideoId || null
    if (!videoId && url) {
      const known = this.videoIdByUrl[url]
      if (known) {
        videoId = known
      }
    }

    let safeVideoId: string | null = null
    if (this.isLikelyObjectId(videoId)) {
      safeVideoId = String(videoId)
    }

    if (safeVideoId && url) {
      await this.handleDeleteVideo(safeVideoId, url)
    }
    else if (safeVideoId) {
      await this.handleDeleteVideo(safeVideoId)
    }
    else {
      console.warn('[confirmDeleteVideo] identifiant de video manquant pour', url)
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
    if (msg.videoUrl) {
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
    let file: File | null = null
    if (fileList && fileList.length > 0) {
      file = fileList[0]
    }
    if (!file) {
      return
    }

    try {
      const result: any = await this.addPhotoService.addPhoto(file)

      let url = ""
      if (result && typeof result.url === "string") {
        url = result.url
      }
      else if (result && result.data && typeof result.data.url === "string") {
        url = result.data.url
      }
      else if (result && result.photo && typeof result.photo.url === "string") {
        url = result.photo.url
      }
      if (url) {
        url = String(url).trim()
      }
      else {
        url = ""
      }

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

  async handleDeletePhoto(photoId: string, photoUrl: string | null = null): Promise<void> {
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

    let safePhotoId: string | null = null
    if (this.isLikelyObjectId(photoId)) {
      safePhotoId = String(photoId)
    }

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
  openPhotoPreview(url: string, photoId: string | null, messageId: string | null, isMine: boolean | null): void {
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

  private resolveVideoIdFromResponse(result: any): string | null {
    if (!result) {
      return null
    }

    const candidates: any[] = [result]

    if (result && typeof result === 'object') {
      if ('data' in result) {
        candidates.push((result as any).data)
      }
      if ('video' in result) {
        candidates.push((result as any).video)
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

  private extractVideoData(text: string): { url: string, videoId: string | null, name: string | null } | null {
    if (!text) {
      return null
    }

    const markerIndex = text.indexOf(this.videoPrefix)
    if (markerIndex === -1) {
      return null
    }

    const payload = text.substring(markerIndex + this.videoPrefix.length).trim()
    if (!payload) {
      return null
    }

    const parts = payload.split("::")

    let videoId: string | null = null
    let urlPart: string | null = null
    let namePart: string | null = null

    if (parts.length === 1) {
      const candidate = parts[0]
      if (candidate && candidate.startsWith("http")) {
        urlPart = candidate
      }
    }
    else if (parts.length >= 2) {
      const first = parts[0]
      const second = parts[1]

      if (first && first.startsWith("http")) {
        urlPart = first
        namePart = parts.slice(1).join("::")
      }
      else {
        if (first) {
          videoId = first
        }
        else {
          videoId = null
        }
        urlPart = second
        if (parts.length >= 3) {
          namePart = parts.slice(2).join("::")
        }
      }
    }

    if (!urlPart || !urlPart.startsWith("http")) {
      return null
    }

    let decodedName: string | null = null
    if (namePart) {
      try {
        decodedName = decodeURIComponent(namePart)
      }
      catch (err) {
        decodedName = namePart
      }
    }

    return { url: urlPart, videoId, name: decodedName }
  }

  async handleUploadVideo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement
    if (!input) {
      return
    }

    this.closeAttachmentMenu()

    const fileList = input.files
    let file: File | null = null
    if (fileList && fileList.length > 0) {
      file = fileList[0]
    }
    if (!file) {
      return
    }

    try {
      const result: any = await this.addvideoService.addVideo(file)

      let url = ""
      if (result && typeof result.url === "string") {
        url = result.url
      }
      else if (result && result.data && typeof result.data.url === "string") {
        url = result.data.url
      }
      else if (result && result.video && typeof result.video.url === "string") {
        url = result.video.url
      }
      if (url) {
        url = String(url).trim()
      }
      else {
        url = ""
      }

      if (!url) {
        console.warn("[handleUploadVideo] impossible de determiner l'URL de la video retournee")
        return
      }

      let videoName = ""
      const candidateNames = [
        file?.name,
        result?.name,
        result?.data?.name,
        result?.video?.name
      ]
      for (const cand of candidateNames) {
        if (typeof cand === 'string' && cand.trim().length > 0) {
          videoName = cand.trim()
          break
        }
      }

      const videoId = this.resolveVideoIdFromResponse(result)
      if (videoId) {
        this.videoIdByUrl[url] = videoId
      }

      const segments: string[] = []
      if (videoId) {
        segments.push(videoId)
      }
      segments.push(url)
      if (videoName) {
        segments.push(encodeURIComponent(videoName))
      }

      const payload = this.videoPrefix + segments.join("::")

      const ok = this.chat.send(payload)
      if (ok) {
        queueMicrotask(() => this.scrollToBottom())
      }
      else {
        console.warn("[handleUploadVideo] envoi message video echoue")
      }
    }
    catch (err) {
      console.error("Erreur :", err)
    }
    finally {
      input.value = ""
    }
  }

  async handleDeleteVideo(videoId: string, videoUrl: string | null = null): Promise<void> {
    if (!this.isLikelyObjectId(videoId)) {
      console.warn("[handleDeleteVideo] identifiant video invalide", videoId)
      return
    }

    try {
      await this.deleteVideoService.deleteVideo(videoId)
      if (videoUrl) {
        if (this.videoIdByUrl[videoUrl]) {
          delete this.videoIdByUrl[videoUrl]
        }
      }
      else {
        for (const key of Object.keys(this.videoIdByUrl)) {
          if (this.videoIdByUrl[key] === videoId) {
            delete this.videoIdByUrl[key]
          }
        }
      }
    }
    catch (err) {
      console.error("Erreur suppression video :", err)
    }
  }
}
