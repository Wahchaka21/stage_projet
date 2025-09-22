import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { ChatService, ChatMessage } from '../chat/chat.service';
import { DeleteMessageService } from '../chat/delete-message.service';
import { modifyMessageService } from '../chat/modify-message.service';

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
    private modifyService: modifyMessageService
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

  // Ouvre le mode édition pour un message
  openEdit(message: UiMessage): void {
    if (!message || !message.id) {
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

    try {
      // Appel du service de suppression
      await this.deleteService.deleteMessage(messageId)
      // On reconstruit le tableau sans le message supprimé
      const remaining: UiMessage[] = []
      for (const entry of this.messages) {
        if (entry.id !== messageId) {
          remaining.push(entry)
        }
      }
      this.messages = remaining
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
  }

  // Réception d'un message temps réel (ou édition d'un message existant)
  private handleIncoming(msg: ChatMessage): void {
    // On convertit la forme brute -> forme UI
    const mapped = this.mapMessage(msg)
    // Si pas d'id (sécurité), on ignore
    if (!mapped.id) {
      return
    }

    // Savoir si on doit rester collé en bas (si l'utilisateur n'est pas en train de remonter l'historique)
    const stickToBottom = this.shouldStickToBottom()

    // On tente d'abord une mise à jour "in place" d'un message existant (edition)
    let alreadyThere = false
    for (const entry of this.messages) {
      if (entry.id === mapped.id) {
        entry.text = mapped.text
        entry.at = mapped.at
        entry.updatedAt = mapped.updatedAt
        alreadyThere = true
        break
      }
    }

    // Sinon, c'est un nouveau message, on l'ajoute à la fin
    if (!alreadyThere) {
      this.messages.push(mapped)
    }

    // Si on était proche du bas, on redéfile en bas (sinon on ne touche pas au scroll)
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
    const text = this.extractText(msg)     // force en string

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
      at
    }

    if (updatedAt.length > 0) {
      message.updatedAt = updatedAt
    }

    return message
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
