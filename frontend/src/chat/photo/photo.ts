import { ElementRef } from '@angular/core';
import { AddPhotoService } from '../add-photo.service';
import { DeletePhotoService } from '../delete-photo.service';
import type { UiMessage } from '../chat';

export class PhotoFeature {
  selectedMessageHasPhoto: boolean = false
  selectedPhotoUrl: string | null = null
  selectedPhotoId: string | null = null
  photoPreviewUrl: string | null = null
  previewPhotoId: string | null = null
  previewPhotoMessageId: string | null = null
  previewPhotoIsMine: boolean = false

  private photoIdByUrl: Record<string, string> = {}
  private readonly photoPrefix: string = "[[photo]]"

  constructor(
    private addPhotoService: AddPhotoService,
    private deletePhotoService: DeletePhotoService,
    private sendMessage: (payload: string) => boolean,
    private scrollToBottom: () => void,
    private closeAttachmentMenu: () => void,
    private handleDeleteMessage: (messageId: string) => Promise<void>,
    private isLikelyObjectId: (value: string | null | undefined) => boolean,
    private closeActionModal: () => void
  ) { }

  openPhotoPicker(input?: ElementRef<HTMLInputElement>): void {
    this.closeAttachmentMenu()
    const el = input?.nativeElement
    if (!el) {
      return
    }
    el.value = ""
    el.click()
  }

  tryCreateUiMessage(text: string, isMe: boolean, at: string, id: string): UiMessage | null {
    const info = this.extractPhotoData(text)
    if (!info) {
      return null
    }

    if (info.photoId) {
      this.photoIdByUrl[info.url] = info.photoId
    }

    const known = this.photoIdByUrl[info.url]
    const finalPhotoId = info.photoId || known || null
    if (finalPhotoId) {
      this.photoIdByUrl[info.url] = finalPhotoId
    }

    return {
      id,
      me: isMe,
      text: "",
      at,
      photoUrl: info.url,
      photoId: finalPhotoId,
      videoUrl: null,
      videoId: null,
      videoName: null
    }
  }

  applySelectionFromMessage(message: UiMessage | undefined): void {
    this.resetSelection()
    if (!message || !message.photoUrl) {
      return
    }
    this.selectedMessageHasPhoto = true
    this.selectedPhotoUrl = message.photoUrl
    this.selectedPhotoId = message.photoId || this.photoIdByUrl[message.photoUrl] || null
  }

  resetSelection(): void {
    this.selectedMessageHasPhoto = false
    this.selectedPhotoUrl = null
    this.selectedPhotoId = null
  }

  async handleUploadPhoto(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null
    if (!input) {
      return
    }

    this.closeAttachmentMenu()

    let file: File | null = null
    if (input.files && input.files[0]) {
      file = input.files[0]
    }

    if (!file) {
      return
    }

    try {
      const result: any = await this.addPhotoService.addPhoto(file)

      let url = ""
      if (typeof result?.url === "string") {
        url = result.url
      }
      else if (typeof result?.data?.url === "string") {
        url = result.data.url
      }
      else if (typeof result?.photo?.url === "string") {
        url = result.photo.url
      }
      if (url) {
        url = String(url).trim()
      }
      else {
        url = ""
      }

      if (!url) {
        console.warn("[handleUploadPhoto] impossible de determiner l'URL de la photo retournee")
        return
      }

      const photoId = this.resolvePhotoIdFromResponse(result)
      if (photoId) {
        this.photoIdByUrl[url] = photoId
      }

      let payload = this.photoPrefix + url
      if (photoId) {
        payload = this.photoPrefix + photoId + "::" + url
      }

      const ok = this.sendMessage(payload)
      if (ok) {
        queueMicrotask(() => this.scrollToBottom())
      }
      else {
        console.warn("[handleUploadPhoto] envoi message photo echoue")
      }
    }
    catch (err) {
      console.error("Erreur :", err)
    }
    finally {
      input.value = ""
    }
  }

  async confirmDeletePhoto(messageId: string | null): Promise<void> {
    if (!messageId) {
      return
    }

    const url = this.selectedPhotoUrl || null
    let photoId: string | null = this.selectedPhotoId || null
    if (!photoId && url) {
      const known = this.photoIdByUrl[url]
      if (known) {
        photoId = known
      }
    }

    let safe: string | null = null
    if (this.isLikelyObjectId(photoId)) {
      safe = String(photoId)
    }

    if (safe && url) {
      await this.handleDeletePhoto(safe, url)
    }
    else if (safe) {
      await this.handleDeletePhoto(safe)
    }
    else {
      console.warn("[confirmDeletePhoto] identifiant de photo manquant pour", url)
    }

    await this.handleDeleteMessage(messageId)
  }

  openSelectedPhoto(messageId: string | null, isMine: boolean | null): void {
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

    this.openPhotoPreview(this.selectedPhotoUrl, photoId, messageId, isMine)
    this.closeActionModal()
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

    let safe: string | null = null
    if (this.isLikelyObjectId(photoId)) {
      safe = String(photoId)
    }

    if (safe && url) {
      await this.handleDeletePhoto(safe, url)
    }
    else if (safe) {
      await this.handleDeletePhoto(safe)
    }
    else {
      console.warn("[deletePhotoFromPreview] aucun identifiant photo associe au message, suppression seulement du message")
    }

    await this.handleDeleteMessage(messageId)
    this.cancelPhotoPreview()
  }

  openPhotoPreview(url: string, photoId: string | null, messageId: string | null, isMine: boolean | null): void {
    this.photoPreviewUrl = url
    this.previewPhotoId = photoId ?? null
    this.previewPhotoMessageId = messageId ?? null
    this.previewPhotoIsMine = isMine === true
  }

  closePhotoPreview(event: MouseEvent): void {
    const target = event.target as HTMLElement | null
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

  onMessageDeleted(message: UiMessage | undefined, messageId: string): void {
    if (message?.photoUrl && this.photoIdByUrl[message.photoUrl]) {
      delete this.photoIdByUrl[message.photoUrl]
    }
    if (this.previewPhotoMessageId === messageId) {
      this.cancelPhotoPreview()
    }
  }

  private async handleDeletePhoto(photoId: string, photoUrl: string | null = null): Promise<void> {
    if (!this.isLikelyObjectId(photoId)) {
      console.warn("[handleDeletePhoto] identifiant photo invalide", photoId)
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
      console.error("Erreur suppression photo :", err)
    }
  }

  private resolvePhotoIdFromResponse(result: any): string | null {
    if (!result) {
      return null
    }
    const candidates: any[] = [result]
    if (result && typeof result === "object") {
      if ("data" in result) {
        candidates.push(result.data)
      }
      if ("photo" in result) {
        candidates.push(result.photo)
      }
    }
    for (const item of candidates) {
      if (!item || typeof item !== "object") {
        continue
      }
      if (typeof item._id === "string" && item._id.trim()) {
        return item._id.trim()
      }
      if (typeof item.id === "string" && item.id.trim()) {
        return item.id.trim()
      }
      const inner = item._id
      if (inner && typeof inner === "object") {
        if (typeof inner.$oid === "string" && inner.$oid.trim()) {
          return inner.$oid.trim()
        }
        if (typeof inner.toString === "function") {
          const s = String(inner.toString()).trim()
          if (s && s !== "[object Object]") {
            return s
          }
        }
      }
    }
    return null
  }

  private extractPhotoData(text: string): { url: string; photoId: string | null } | null {
    if (!text) {
      return null
    }
    const i = text.indexOf(this.photoPrefix)
    if (i === -1) {
      return null
    }
    const payload = text.substring(i + this.photoPrefix.length).trim()
    if (!payload) {
      return null
    }

    const sep = payload.indexOf("::")
    if (sep >= 0) {
      const possibleId = payload.substring(0, sep)
      const rawUrl = payload.substring(sep + 2).trim()
      if (rawUrl.startsWith("http")) {
        let idVal: string | null = null
        if (possibleId) {
          idVal = possibleId
        }
        return { url: rawUrl, photoId: idVal }
      }
      return null
    }
    if (payload.startsWith("http")) {
      return { url: payload, photoId: null }
    }
    return null
  }
}