import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ChatService, ChatMessage } from '../chat/chat.service';
import { DeleteMessageService } from '../chat/delete-message.service';
import { modifyMessageService } from '../chat/modify-message.service';
import { AddPhotoService } from '../chat/add-photo.service';
import { DeletePhotoService } from '../chat/delete-photo.service';
import { AddVideoService } from '../chat/add-video.service';
import { DeleteVideoService } from '../chat/delete-video.service';

type AdminUser = {
  _id: string
  name?: string
  nickname?: string
  email?: string
  role?: string
}

type UiMessage = {
  id: string
  me: boolean
  text: string
  at: string
  updatedAt?: string
  photoUrl: string | null
  photoId: string | null
  videoUrl: string | null
  videoId: string | null
  videoName: string | null
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './admin.html'
})
export class Admin implements OnInit, OnDestroy {
  // Base d'URL de ton API backend
  private readonly api = "http://localhost:3000"

  // --- État côté utilisateurs (colonne de gauche)
  users: AdminUser[] = []                 // liste des utilisateurs retournés par /admin/users
  usersLoading = false                    // état de chargement de la liste
  usersError: string | null = null        // message d'erreur éventuel
  selectedUser: AdminUser | null = null   // utilisateur actuellement sélectionné
  hasSelectedOnce = false                 // permet d'éviter de reselectionner auto au rechargement

  // --- État côté messages (colonne de droite)
  messages: UiMessage[] = []              // messages de la conversation courante
  messagesLoading = false                 // état de chargement de l'historique
  messagesError: string | null = null     // message d'erreur affiché dans la zone messages
  messageDraft = ""                       // contenu du textarea d'envoi
  showAttachmentMenu = false
  @ViewChild('photoInput') photoInput: ElementRef<HTMLInputElement> | undefined = undefined
  @ViewChild('videoInput') videoInput: ElementRef<HTMLInputElement> | undefined = undefined
  photoPreviewUrl: string | null = null
  previewPhotoId: string | null = null
  previewPhotoMessageId: string | null = null
  previewPhotoIsMine = false
  private photoIdByUrl: Record<string, string> = {}
  private readonly photoPrefix = '[[photo]]'
  private videoIdByUrl: Record<string, string> = {}
  private readonly videoPrefix = '[[video]]'
  private videoNameCache: Record<string, string> = {}
  private pendingVideoFetch: Set<string> = new Set<string>()

  // --- Édition d'un message
  editMessageId: string | null = null     // id du message en cours d'édition (si mode édition actif)
  editDraft = ""                          // contenu du textarea d'édition
  editError: string | null = null         // erreur éventuelle affichée pendant l'édition

  // --- Infos sur l'admin connecté
  me: any | null = null                   // payload /auth/me (peut contenir d'autres infos)
  myUserId: string | null = null          // id stringifié de l'admin connecté

  // --- Socket & peer
  private activePeerId: string | null = null              // id de l'utilisateur avec qui on est connectés en temps réel
  private messageSubscription: Subscription | null = null // abonnement au flux temps réel

  constructor(
    private http: HttpClient,
    private chatService: ChatService,
    private deleteService: DeleteMessageService,
    private modifyService: modifyMessageService,
    private addPhotoService: AddPhotoService,
    private deletePhotoService: DeletePhotoService,
    private addVideoService: AddVideoService,
    private deleteVideoService: DeleteVideoService
  ) { }

  ngOnInit(): void {
    this.loadConnectedAdmin()
  }

  ngOnDestroy(): void {
    // Si on s'est abonné au flux socket, on s'en désabonne proprement
    if (this.messageSubscription) {
      this.messageSubscription.unsubscribe()
      this.messageSubscription = null
    }
    // Et on ferme la connexion socket
    else {
      this.chatService.disconnect()
    }
    this.pendingVideoFetch.clear()
  }

  // Nom affiché pour un utilisateur (name > nickname > email > fallback)
  getDisplayName(user: AdminUser | null): string {
    if (!user) {
      return "Utilisateur"
    }

    // name prioritaire s'il existe et non vide
    if (user.name) {
      const trimmedName = String(user.name).trim()
      if (trimmedName.length > 0) {
        return trimmedName
      }
    }

    // sinon nickname
    if (user.nickname) {
      const trimmedNickname = String(user.nickname).trim()
      if (trimmedNickname.length > 0) {
        return trimmedNickname
      }
    }

    // sinon email
    if (user.email) {
      return String(user.email)
    }

    else {
      return "Utilisateur"
    }
  }

  // Bouton "Envoyer" désactivé si pas d'utilisateur sélectionné ou message vide
  isSendDisabled(): boolean {
    if (!this.selectedUser) {
      return true
    }

    if (!this.messageDraft) {
      return true
    }

    const trimmedDraft = this.messageDraft.trim()
    if (trimmedDraft.length === 0) {
      return true
    }
    else {
      return false
    }
  }

  // Badge d'auteur sur une bulle de message : "Moi" si c'est l'admin, sinon nom de l'utilisateur ciblé
  getAuthorLabel(message: UiMessage): string {
    if (message && message.me) {
      return "Moi"
    }
    else {
      return this.getDisplayName(this.selectedUser)
    }
  }

  // trackBy pour *ngFor : évite le re-render complet si l'ordre change
  trackByMessage(index: number, item: UiMessage): string {
    if (item && item.id) {
      return item.id
    }
    return String(index)
  }

  // Sélection d'un utilisateur dans la liste
  selectUser(user: AdminUser): void {
    // sécurité : pas d'id => on ignore
    if (!user || !user._id) {
      return
    }

    // On ne refait rien si on est déjà sur le même utilisateur/peer
    const newPeerId = String(user._id)
    const alreadyOnSameUser = this.selectedUser && this.selectedUser._id === user._id && this.activePeerId === newPeerId
    if (alreadyOnSameUser) {
      return
    }

    // On mémorise la sélection courante
    this.selectedUser = user
    this.hasSelectedOnce = true
    this.activePeerId = newPeerId

    // On reset la zone messages (UI) avant de recharger
    this.clearMessageArea()
    // On coupe la connexion temps réel précédente (si existante)
    this.disconnectFromPeer()
    // On ouvre une nouvelle connexion temps réel avec ce peer
    this.connectToPeer(newPeerId)
    // On récupère l'historique initial
    this.fetchHistoryForPeer(newPeerId)
  }

  // Envoi d'un message via le service socket
  sendMessage(): void {
    this.closeAttachmentMenu()
    // Si désactivé (pas de user / message vide), on arrête
    if (this.isSendDisabled()) {
      return
    }

    // Trim pour éviter d'envoyer des espaces
    const draft = this.messageDraft.trim()
    // chatService.send retourne un booléen 'ok' (selon ton implémentation)
    const sendOk = this.chatService.send(draft)
    if (!sendOk) {
      this.messagesError = "Impossible d'envoyer le message"
      return
    }

    // On vide le textarea et on planifie le scroll en bas
    this.messageDraft = ""
    this.scheduleScroll()
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

  async handleUploadPhoto(event: Event): Promise<void> {
    this.messagesError = null
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

      let url = ''
      if (result && typeof result.url === 'string') {
        url = result.url
      } else if (result && result.data && typeof result.data.url === 'string') {
        url = result.data.url
      } else if (result && result.photo && typeof result.photo.url === 'string') {
        url = result.photo.url
      }
      if (url) {
        url = String(url).trim()
      }
      else {
        url = ''
      }

      if (!url) {
        this.messagesError = "URL photo manquante"
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

      const ok = this.chatService.send(payload)
      if (!ok) {
        this.messagesError = "Impossible d'envoyer la photo"
      }
      else {
        this.scheduleScroll()
      }
    }
    catch (err) {
      this.messagesError = "Erreur lors de l'envoi de la photo"
      console.error(err)
    }
    finally {
      if (input) {
        input.value = ''
      }
    }
  }

  async handleUploadVideo(event: Event): Promise<void> {
    this.messagesError = null
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
      const result: any = await this.addVideoService.addVideo(file)

      let url = ''
      if (result && typeof result.url === 'string') {
        url = result.url
      }
      else if (result && result.data && typeof result.data.url === 'string') {
        url = result.data.url
      }
      else if (result && result.video && typeof result.video.url === 'string') {
        url = result.video.url
      }
      if (url) {
        url = String(url).trim()
      }
      else {
        url = ''
      }

      if (!url) {
        this.messagesError = "URL video manquante"
        return
      }

      let videoName = ''
      const nameCandidates = [
        file?.name,
        result?.name,
        result?.data?.name,
        result?.video?.name
      ]
      for (const candidate of nameCandidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
          videoName = candidate.trim()
          break
        }
      }

      const videoId = this.resolveVideoIdFromResponse(result)
      if (videoId) {
        this.videoIdByUrl[url] = videoId
        if (videoName) {
          this.videoNameCache[videoId] = videoName
        }
      }

      const segments: string[] = []
      if (videoId) {
        segments.push(videoId)
      }
      segments.push(url)
      if (videoName) {
        segments.push(encodeURIComponent(videoName))
      }

      const payload = this.videoPrefix + segments.join('::')

      const ok = this.chatService.send(payload)
      if (!ok) {
        this.messagesError = "Impossible d'envoyer la video"
      }
      else {
        this.scheduleScroll()
      }
    }
    catch (err) {
      this.messagesError = "Erreur lors de l'envoi de la video"
      console.error(err)
    }
    finally {
      if (input) {
        input.value = ''
      }
    }
  }

  private async handleDeletePhoto(photoId: string, photoUrl?: string): Promise<void> {
    try {
      await this.deletePhotoService.deletePhoto(photoId)
      if (photoUrl && this.photoIdByUrl[photoUrl]) {
        delete this.photoIdByUrl[photoUrl]
      }
    }
    catch (err) {
      this.messagesError = "Erreur lors de la suppression de la photo"
      console.error(err)
    }
  }

  private async handleDeleteVideo(videoId: string, videoUrl: string | null = null): Promise<void> {
    try {
      await this.deleteVideoService.deleteVideo(videoId)
      if (videoUrl && this.videoIdByUrl[videoUrl]) {
        delete this.videoIdByUrl[videoUrl]
      }
      if (this.videoNameCache[videoId]) {
        delete this.videoNameCache[videoId]
      }
      if (this.pendingVideoFetch.has(videoId)) {
        this.pendingVideoFetch.delete(videoId)
      }
    }
    catch (err) {
      this.messagesError = "Erreur lors de la suppression de la video"
      console.error(err)
    }
  }

  openPhotoPreview(url: string, messageId: string, photoId?: string | null, isMine?: boolean): void {
    this.photoPreviewUrl = url
    this.previewPhotoMessageId = messageId

    if (photoId) {
      this.previewPhotoId = photoId
    }
    else {
      const known = this.photoIdByUrl[url]
      if (known) {
        this.previewPhotoId = known
      }
      else {
        this.previewPhotoId = null
      }
    }

    if (isMine === true) {
      this.previewPhotoIsMine = true
    }
    else {
      this.previewPhotoIsMine = false
    }
  }

  cancelPhotoPreview(): void {
    this.photoPreviewUrl = null
    this.previewPhotoId = null
    this.previewPhotoMessageId = null
    this.previewPhotoIsMine = false
  }

  async deletePhotoFromPreview(): Promise<void> {
    const messageId = this.previewPhotoMessageId

    if (!messageId) {
      return
    }

    try {
      await this.deleteMessage(messageId)
    }
    finally {
      this.cancelPhotoPreview()
    }
  }

  openPhotoFromMessage(message: UiMessage): void {
    if (!message || !message.id) {
      return
    }
    if (!message.photoUrl) {
      return
    }

    let photoId = message.photoId
    if (!photoId) {
      const known = this.photoIdByUrl[message.photoUrl]
      if (known) {
        photoId = known
      }
    }

    this.openPhotoPreview(message.photoUrl, message.id, photoId, message.me)
  }

  downloadVideo(message: UiMessage): void {
    if (!message || !message.videoUrl) {
      return
    }

    try {
      window.open(message.videoUrl, '_blank', 'noopener')
    }
    catch (err) {
      console.error('[downloadVideo] impossible d\'ouvrir la video :', err)
    }
  }

  private ensureVideoNameForMessage(message: UiMessage): void {
    if (!message) {
      return
    }

    if (!message.videoId) {
      return
    }

    const cached = this.videoNameCache[message.videoId]
    if (cached && cached.trim().length > 0) {
      if (message.videoName !== cached) {
        this.updateMessagesVideoName(message.videoId, cached)
      }
      return
    }

    this.requestVideoNameFetch(message.videoId)
  }

  private updateMessagesVideoName(videoId: string, name: string): void {
    if (!videoId) {
      return
    }

    const trimmed = name.trim()
    if (!trimmed) {
      return
    }

    let changed = false
    for (let i = 0; i < this.messages.length; i++) {
      const entry = this.messages[i]
      if (entry && entry.videoId === videoId) {
        if (entry.videoName !== trimmed) {
          this.messages[i] = {
            ...entry,
            videoName: trimmed
          }
          changed = true
        }
      }
    }

    if (changed) {
      this.messages = [...this.messages]
    }
  }

  private requestVideoNameFetch(videoId: string): void {
    if (!videoId) {
      return
    }

    const cached = this.videoNameCache[videoId]
    if (cached && cached.trim().length > 0) {
      this.updateMessagesVideoName(videoId, cached)
      return
    }

    if (this.pendingVideoFetch.has(videoId)) {
      return
    }

    this.pendingVideoFetch.add(videoId)

    this.http.get<any>(`${this.api}/chat/video/${videoId}`, { withCredentials: true }).subscribe({
      next: (res) => {
        let resolvedName = ''
        if (res && typeof res === 'object') {
          if (typeof res.name === 'string' && res.name.trim().length > 0) {
            resolvedName = res.name.trim()
          }
          else if (res.video && typeof res.video.name === 'string' && res.video.name.trim().length > 0) {
            resolvedName = res.video.name.trim()
          }

          if (typeof res.url === 'string' && res.url.trim().length > 0) {
            this.videoIdByUrl[res.url.trim()] = videoId
          }
        }

        if (resolvedName) {
          this.videoNameCache[videoId] = resolvedName
          this.updateMessagesVideoName(videoId, resolvedName)
        }
      },
      error: (err) => {
        console.error('[requestVideoNameFetch] erreur :', err)
        this.pendingVideoFetch.delete(videoId)
      },
      complete: () => {
        this.pendingVideoFetch.delete(videoId)
      }
    })
  }

  private extractFileNameFromUrl(url: string | null): string | null {
    if (!url) {
      return null
    }

    try {
      const parsed = new URL(url)
      const lastSegment = parsed.pathname.split('/').pop()
      if (lastSegment && lastSegment.trim().length > 0) {
        return decodeURIComponent(lastSegment)
      }
    }
    catch (err) {
      // fallback below
    }

    const parts = url.split('/')
    if (parts.length === 0) {
      return null
    }

    const candidate = parts[parts.length - 1]
    if (!candidate) {
      return null
    }

    try {
      const decoded = decodeURIComponent(candidate)
      if (decoded.trim().length > 0) {
        return decoded
      }
    }
    catch (err) {
      if (candidate.trim().length > 0) {
        return candidate
      }
    }

    return null
  }


  // Ouvre le mode édition pour un message
  openEdit(message: UiMessage): void {
    if (!message || !message.id) {
      return
    }

    if (message.photoUrl) {
      return
    }

    if (message.videoUrl) {
      return
    }

    this.editMessageId = message.id   // on mémorise l'id du message édité
    this.editDraft = message.text     // on pré-remplit le textarea d'édition
    this.editError = null             // on efface l'erreur éventuelle
  }

  // Ferme l'édition et nettoie l'état d'édition
  cancelEdit(): void {
    this.editMessageId = null
    this.editDraft = ""
    this.editError = null
  }

  // Valide l'édition : appelle l'API, met à jour la liste, ferme l'édition
  async confirmEdit(): Promise<void> {
    if (!this.editMessageId) {
      return
    }

    // Validation côté client
    const trimmedDraft = this.editDraft.trim()
    if (trimmedDraft.length === 0) {
      this.editError = "Le message ne peut pas etre vide"
      return
    }

    try {
      // Appel service : PUT /chat/modify/:id
      const response = await this.modifyService.modifyMessage(this.editMessageId, trimmedDraft)
      // Mise à jour locale de la bulle (texte + "Modifié")
      this.updateMessageAfterEdit(this.editMessageId, trimmedDraft, response?.updatedAt)
      // Sortie du mode édition
      this.cancelEdit()
    }
    catch (error: any) {
      // Gestion des erreurs renvoyées par le service
      if (typeof error === "string") {
        this.editError = error
      }
      else {
        this.editError = "Erreur lors de la modification du message"
      }
    }
  }

  // Suppression d'un message
  async deleteMessage(messageId: string): Promise<void> {
    if (!messageId) {
      return
    }

    this.messagesError = null

    let target: UiMessage | null = null
    for (const entry of this.messages) {
      if (entry.id === messageId) {
        target = entry
        break
      }
    }

    let photoId: string | null = null
    let photoUrl: string | null = null
    let videoId: string | null = null
    let videoUrl: string | null = null
    if (target) {
      if (target.photoId) {
        photoId = target.photoId
      }
      if (target.photoUrl) {
        photoUrl = target.photoUrl
      }
      if (target.videoId) {
        videoId = target.videoId
      }
      if (target.videoUrl) {
        videoUrl = target.videoUrl
      }
    }

    if (!photoId && photoUrl) {
      const known = this.photoIdByUrl[photoUrl]
      if (known) {
        photoId = known
      }
    }

    if (!videoId && videoUrl) {
      const knownVideo = this.videoIdByUrl[videoUrl]
      if (knownVideo) {
        videoId = knownVideo
      }
    }

    try {
      if (photoId) {
        let photoUrlValue: string | undefined = undefined
        if (photoUrl) {
          photoUrlValue = photoUrl
        }
        await this.handleDeletePhoto(photoId, photoUrlValue)
      }

      if (videoId) {
        let videoUrlValue: string | null = null
        if (videoUrl) {
          videoUrlValue = videoUrl
        }
        await this.handleDeleteVideo(videoId, videoUrlValue)
      }

      await this.deleteService.deleteMessage(messageId)
      const remaining: UiMessage[] = []
      for (const entry of this.messages) {
        if (entry.id !== messageId) {
          remaining.push(entry)
        }
        else {
          if (entry.photoUrl && this.photoIdByUrl[entry.photoUrl]) {
            delete this.photoIdByUrl[entry.photoUrl]
          }
          if (entry.videoUrl && this.videoIdByUrl[entry.videoUrl]) {
            delete this.videoIdByUrl[entry.videoUrl]
          }
          if (entry.videoId && this.videoNameCache[entry.videoId]) {
            delete this.videoNameCache[entry.videoId]
          }
          if (entry.videoId && this.pendingVideoFetch.has(entry.videoId)) {
            this.pendingVideoFetch.delete(entry.videoId)
          }
        }
      }
      this.messages = remaining
      if (this.previewPhotoMessageId === messageId) {
        this.cancelPhotoPreview()
      }
    }
    catch (error: any) {
      if (typeof error === "string") {
        this.messagesError = error
      }
      else {
        this.messagesError = "Erreur lors de la suppression du message"
      }
    }

  }
  // Copie d'un message dans le presse-papiers
  async copyMessage(messageId: string): Promise<void> {
    if (!messageId) {
      return
    }

    this.messagesError = null

    // On retrouve la cible à partir de l'id
    let target: UiMessage | null = null
    for (const entry of this.messages) {
      if (entry.id === messageId) {
        target = entry
        break
      }
    }
    if (!target) {
      return
    }

    if (target.photoUrl) {
      return
    }

    if (target.videoUrl) {
      return
    }

    // Compatibilité navigateur
    if (!navigator || !navigator.clipboard) {
      this.messagesError = "La copie n'est pas disponible sur ce navigateur"
      return
    }

    // Copie asynchrone
    try {
      await navigator.clipboard.writeText(target.text)
    }
    catch (_err) {
      this.messagesError = "Erreur lors de la copie du message"
    }
  }

  // ------------------------------------------------------------------
  // Chargement de l'admin connecté (vérifie aussi s'il a le rôle admin)
  // ------------------------------------------------------------------
  private loadConnectedAdmin(): void {
    this.usersLoading = true
    this.usersError = null

    // /auth/me pour récupérer l'utilisateur courant (avec cookie => withCredentials)
    this.http.get<any>(`${this.api}/auth/me`, { withCredentials: true }).subscribe({
      next: (user) => {
        // Si on a un _id, on considère l'admin comme connecté
        if (user && user._id) {
          this.me = user
          this.myUserId = String(user._id)
        }
        else {
          this.me = null
          this.myUserId = null
        }

        // On refuse l'accès si pas admin
        if (!this.me || this.me.role !== "admin") {
          this.usersLoading = false
          this.users = []
          this.usersError = "Acces reserve aux administrateurs"
          return
        }

        // Sinon on charge la liste des utilisateurs
        this.loadUsers()
      },
      error: () => {
        // Erreur /auth/me => on réinitialise
        this.me = null
        this.myUserId = null
        this.usersLoading = false
        this.usersError = "Impossible de recuperer l'utilisateur connecte"
      }
    })
  }

  // ------------------------------------
  // Récupération de la liste d'utilisateurs
  // ------------------------------------
  private loadUsers(): void {
    this.usersLoading = true
    this.usersError = null

    this.http.get<any>(`${this.api}/admin/users`, { withCredentials: true }).subscribe({
      next: (response) => {
        let list: AdminUser[] = []

        // Selon ta route, les données peuvent être dans response.data ou être la liste directement
        if (response && Array.isArray(response.data)) {
          list = response.data
        }
        else if (Array.isArray(response)) {
          list = response
        }

        this.users = list
        this.usersLoading = false

        // Sélection automatique du premier utilisateur au premier chargement
        if (!this.hasSelectedOnce && this.users.length > 0) {
          this.selectUser(this.users[0])
        }
      },
      error: () => {
        this.users = []
        this.usersLoading = false
        this.usersError = "Impossible de recuperer la liste des utilisateurs"
      }
    })
  }

  // -------------------------------------------------
  // Connexion temps réel au 'peer' (l'utilisateur ciblé)
  // -------------------------------------------------
  private connectToPeer(peerId: string): void {
    // Ouverture de la socket pour ce peer
    const opened = this.chatService.connect(peerId)
    if (!opened) {
      this.messagesError = "Impossible d'ouvrir la connexion temps reel"
      return
    }

    // Abonnement au flux des messages en temps réel
    this.messageSubscription = this.chatService.stream().subscribe((message) => {
      this.handleIncoming(message)
    })
  }

  // -------------------------------------------------
  // Déconnexion propre du flux socket en cours
  // -------------------------------------------------
  private disconnectFromPeer(): void {
    // On se désabonne du flux si nécessaire
    if (this.messageSubscription && typeof this.messageSubscription.unsubscribe === "function") {
      this.messageSubscription.unsubscribe()
    }
    this.messageSubscription = null
    // Et on coupe la socket
    this.chatService.disconnect()
  }

  // -------------------------------------------------
  // Chargement de l'historique des messages pour un peer
  // -------------------------------------------------
  private fetchHistoryForPeer(peerId: string): void {
    this.messagesLoading = true
    this.messagesError = null

    // On demande, par ex, les 100 derniers messages
    this.chatService.getHistoryWithPeer(peerId, 100).subscribe({
      next: (result) => {
        // Si, entre-temps, l'utilisateur actif a changé, on ignore la réponse
        if (this.activePeerId !== peerId) {
          return
        }

        // On remplace l'historique par une liste proprement "mappée" pour l'UI
        this.messages = []
        if (result && Array.isArray(result.messages)) {
          for (const raw of result.messages) {
            const mapped = this.mapMessage(raw)
            if (mapped.id) {
              this.messages.push(mapped)
              this.ensureVideoNameForMessage(mapped)
            }
          }
        }

        this.messagesLoading = false
        // On descend au bas de la zone (derniers messages visibles)
        this.scheduleScroll()
      },
      error: () => {
        if (this.activePeerId !== peerId) {
          return
        }

        this.messagesLoading = false
        this.messages = []
        this.messagesError = "Impossible de charger les messages"
      }
    })
  }

  // Réinitialise la zone messages lors d'un changement d'utilisateur
  private clearMessageArea(): void {
    this.messages = []
    this.messagesLoading = false
    this.messagesError = null
    this.messageDraft = ''
    this.editMessageId = null
    this.editDraft = ''
    this.editError = null
    this.showAttachmentMenu = false
    this.photoIdByUrl = {}
    this.videoIdByUrl = {}
    this.videoNameCache = {}
    this.pendingVideoFetch.clear()
    this.cancelPhotoPreview()
  }

  // Réception d'un message temps réel (ou édition d'un message existant)
  private handleIncoming(msg: ChatMessage): void {
    const mapped = this.mapMessage(msg)
    if (!mapped.id) {
      return
    }

    const stickToBottom = this.shouldStickToBottom()

    let alreadyThere = false
    for (let i = 0; i < this.messages.length; i++) {
      const entry = this.messages[i]
      if (entry.id === mapped.id) {
        this.messages[i] = {
          ...entry,
          text: mapped.text,
          at: mapped.at,
          updatedAt: mapped.updatedAt,
          photoUrl: mapped.photoUrl,
          photoId: mapped.photoId,
          videoUrl: mapped.videoUrl,
          videoId: mapped.videoId,
          videoName: mapped.videoName
        }
        alreadyThere = true
        break
      }
    }

    if (!alreadyThere) {
      this.messages.push(mapped)
    }

    this.ensureVideoNameForMessage(mapped)

    if (stickToBottom) {
      this.scheduleScroll()
    }
  }

  // Met à jour le message en local après un succès d'édition (texte + libellé "Modifié")
  private updateMessageAfterEdit(messageId: string, newText: string, updatedAtRaw?: string): void {
    // On calcule le label "Modifié xx/xx/xxxx ..." (si le backend nous donne la date, on l'utilise)
    let updatedLabel = ""
    if (updatedAtRaw) {
      updatedLabel = this.formatDate(updatedAtRaw, true)
    }
    if (updatedLabel.length === 0) {
      updatedLabel = this.formatDate(new Date().toISOString(), true)
    }

    // On trouve la cible et on la met à jour
    for (const entry of this.messages) {
      if (entry.id === messageId) {
        entry.text = newText
        if (updatedLabel.length > 0) {
          entry.updatedAt = updatedLabel
        }
      }
    }
  }

  // Conversion d'un message backend -> forme UiMessage
  private mapMessage(msg: ChatMessage | any): UiMessage {
    const id = this.extractId(msg)         // _id | id -> string
    const me = this.isFromMe(msg)          // me = true si message.userId === admin._id
    const rawText = this.extractText(msg)  // force en string

    const videoInfo = this.extractVideoData(rawText)
    const photoInfo = this.extractPhotoData(rawText)

    let text = rawText
    let photoUrl: string | null = null
    let photoId: string | null = null
    let videoUrl: string | null = null
    let videoId: string | null = null
    let videoName: string | null = null

    if (videoInfo) {
      text = ""
      videoUrl = videoInfo.url
      if (videoInfo.videoId) {
        videoId = videoInfo.videoId
        this.videoIdByUrl[videoInfo.url] = videoInfo.videoId
      }
      if (!videoId && videoUrl) {
        const knownVideo = this.videoIdByUrl[videoUrl]
        if (knownVideo) {
          videoId = knownVideo
        }
      }

      if (videoInfo.name && videoInfo.name.trim().length > 0) {
        videoName = videoInfo.name.trim()
        if (videoId) {
          this.videoNameCache[videoId] = videoName
        }
      }
      else if (videoId) {
        const cached = this.videoNameCache[videoId]
        if (cached && cached.trim().length > 0) {
          videoName = cached
        }
      }

      if (!videoName && videoUrl) {
        const extracted = this.extractFileNameFromUrl(videoUrl)
        if (extracted) {
          videoName = extracted
        }
      }

      if (videoId && videoUrl) {
        this.videoIdByUrl[videoUrl] = videoId
      }
    }

    if (photoInfo) {
      text = ""
      photoUrl = photoInfo.url
      if (photoInfo.photoId) {
        photoId = photoInfo.photoId
        this.photoIdByUrl[photoInfo.url] = photoInfo.photoId
      }
      if (!photoId && photoUrl) {
        const known = this.photoIdByUrl[photoUrl]
        if (known) {
          photoId = known
        }
      }
    }

    // Formatage de la date d'envoi
    let sentAtRaw: any = undefined
    if (msg && msg.at) {
      sentAtRaw = msg.at
    }
    const at = this.formatDate(sentAtRaw)

    // Formatage de la date de modification (optionnelle)
    let updatedRaw: any = undefined
    if (msg && msg.updatedAt) {
      updatedRaw = msg.updatedAt
    }
    const updatedAt = this.formatDate(updatedRaw, true)

    const message: UiMessage = {
      id,
      me,
      text,
      at,
      photoUrl,
      photoId,
      videoUrl,
      videoId,
      videoName
    }

    if (updatedAt.length > 0) {
      message.updatedAt = updatedAt
    }

    return message
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

    const separatorIndex = payload.indexOf('::')
    if (separatorIndex >= 0) {
      const possibleId = payload.substring(0, separatorIndex)
      const rawUrl = payload.substring(separatorIndex + 2).trim()
      if (rawUrl.startsWith('http')) {
        let idValue: string | null = null
        if (possibleId) {
          idValue = possibleId
        }
        return { url: rawUrl, photoId: idValue }
      }
      return null
    }

    if (payload.startsWith('http')) {
      return { url: payload, photoId: null }
    }

    return null
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

    const parts = payload.split('::')

    let videoId: string | null = null
    let urlPart: string | null = null
    let namePart: string | null = null

    if (parts.length === 1) {
      const candidate = parts[0]
      if (candidate && candidate.startsWith('http')) {
        urlPart = candidate
      }
    }
    else if (parts.length >= 2) {
      const first = parts[0]
      const second = parts[1]

      if (first && first.startsWith('http')) {
        urlPart = first
        namePart = parts.slice(1).join('::')
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
          namePart = parts.slice(2).join('::')
        }
      }
    }

    if (!urlPart || !urlPart.startsWith('http')) {
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


  // Récupère l'id depuis différentes formes possibles
  private extractId(msg: any): string {
    if (msg && msg._id) {
      return String(msg._id)
    }
    if (msg && msg.id) {
      return String(msg.id)
    }
    return ""
  }

  // true si le message a été envoyé par l'admin (comparaison userId === myUserId)
  private isFromMe(msg: any): boolean {
    if (!this.myUserId) {
      return false
    }
    if (msg && msg.userId) {
      const authorId = String(msg.userId)
      const myId = String(this.myUserId)
      if (authorId === myId) {
        return true
      }
    }
    return false
  }

  // Retourne le texte du message en string
  private extractText(msg: any): string {
    if (!msg) {
      return ""
    }

    if (typeof msg.text === "string") {
      return msg.text
    }

    if (msg.text !== undefined && msg.text !== null) {
      return String(msg.text)
    }

    return ""
  }

  // Transforme une valeur (Date | string | timestamp) en libellé localisé
  // allowEmpty = true => retourne "" si value est invalide (utile pour updatedAt)
  private formatDate(value: any, allowEmpty = false): string {
    if (!value) {
      if (allowEmpty) {
        return ""
      }
      return new Date().toLocaleString()
    }

    const parsed = new Date(value)
    if (isNaN(parsed.getTime())) {
      if (allowEmpty) {
        return ""
      }
      return new Date().toLocaleString()
    }

    return parsed.toLocaleString()
  }

  // Scroll instantané en bas de la zone messages (nécessite l'élément #adminMessages dans le HTML)
  private scrollToBottom(): void {
    const target = document.getElementById("adminMessages")
    if (!target) {
      return
    }
    target.scrollTop = target.scrollHeight
  }

  // Planifie un scroll en bas au prochain frame (laisse Angular finir de rendre d'abord)
  private scheduleScroll(): void {
    requestAnimationFrame(() => {
      this.scrollToBottom()
    })
  }

  // Indique si on doit maintenir l'auto-scroll (on n'auto-scroll pas si l'admin remonte l'historique)
  private shouldStickToBottom(): boolean {
    const target = document.getElementById('adminMessages')
    if (!target) {
      // Sans conteneur, on considère qu'on peut scroller (pas bloquant)
      return true
    }

    // distance = combien de pixels on est au-dessus du bas
    const distance = target.scrollHeight - target.scrollTop - target.clientHeight
    // Seuil de 120px : si on est proche du bas, on auto-scroll
    if (distance < 120) {
      return true
    }
    return false
  }
}
