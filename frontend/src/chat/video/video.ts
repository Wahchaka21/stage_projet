import { ElementRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AddVideoService } from '../add-video.service';
import { DeleteVideoService } from '../delete-video.service';
import type { UiMessage } from '../chat';

export class VideoFeature {
  selectedMessageHasVideo: boolean = false
  selectedVideoUrl: string | null = null
  selectedVideoId: string | null = null

  private videoIdByUrl: Record<string, string> = {}
  private videoNameCache: Record<string, string> = {}
  private pendingVideoFetch: Set<string> = new Set<string>()
  private readonly videoPrefix: string = "[[video]]"

  constructor(
    private addVideoService: AddVideoService,
    private deleteVideoService: DeleteVideoService,
    private http: HttpClient,
    private sendMessage: (payload: string) => boolean,
    private scrollToBottom: () => void,
    private closeAttachmentMenu: () => void,
    private handleDeleteMessage: (messageId: string) => Promise<void>,
    private isLikelyObjectId: (value: string | null | undefined) => boolean,
    private getMessages: () => UiMessage[],
    private setMessages: (messages: UiMessage[]) => void,
    private closeActionModal: () => void,
    private openActionModal: (index: number, messageId: string) => void
  ) { }

  openVideoPicker(input?: ElementRef<HTMLInputElement>): void {
    this.closeAttachmentMenu()
    const el = input?.nativeElement
    if (!el) {
      return
    }
    el.value = ""
    el.click()
  }

  tryCreateUiMessage(text: string, isMe: boolean, at: string, id: string): UiMessage | null {
    const videoInfo = this.extractVideoData(text)
    if (!videoInfo) {
      return null
    }

    if (videoInfo.videoId) {
      this.videoIdByUrl[videoInfo.url] = videoInfo.videoId
    }

    let finalVideoId: string | null = null
    if (videoInfo.videoId) {
      finalVideoId = videoInfo.videoId
    }
    else {
      const known = this.videoIdByUrl[videoInfo.url]
      if (known) {
        finalVideoId = known
      }
    }
    if (finalVideoId) {
      this.videoIdByUrl[videoInfo.url] = finalVideoId
    }

    let finalVideoName: string | null = null
    let providedName = ""
    if (videoInfo.name) {
      providedName = videoInfo.name.trim()
    }
    if (providedName) {
      finalVideoName = providedName
      if (finalVideoId) {
        this.videoNameCache[finalVideoId] = providedName
      }
      else if (videoInfo.videoId) {
        this.videoNameCache[videoInfo.videoId] = providedName
      }
    }
    if (!finalVideoName && finalVideoId) {
      const cached = this.videoNameCache[finalVideoId]
      if (cached && cached.trim().length > 0) {
        finalVideoName = cached.trim()
      }
    }
    if (!finalVideoName) {
      finalVideoName = this.extractFileNameFromUrl(videoInfo.url)
    }

    return {
      id,
      me: isMe,
      text: "",
      at,
      photoUrl: null,
      photoId: null,
      videoUrl: videoInfo.url,
      videoId: finalVideoId,
      videoName: finalVideoName
    }
  }

  applySelectionFromMessage(message: UiMessage | undefined): void {
    this.resetSelection()
    if (!message || !message.videoUrl) {
      return
    }
    this.selectedMessageHasVideo = true
    this.selectedVideoUrl = message.videoUrl
    this.selectedVideoId = message.videoId || this.videoIdByUrl[message.videoUrl] || null
  }

  resetSelection(): void {
    this.selectedMessageHasVideo = false
    this.selectedVideoUrl = null
    this.selectedVideoId = null
  }

  async handleUploadVideo(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null
    if (!input) {
      return
    }

    this.closeAttachmentMenu()

    let file: File | null = null
    if (input.files && input.files[0]) {
      file = input.files[0]
    } if (!file) {
      return
    }

    try {
      const result: any = await this.addVideoService.addVideo(file)

      let url = ""
      if (typeof result?.url === "string") {
        url = result.url
      }
      else if (typeof result?.data?.url === "string") {
        url = result.data.url
      }
      else if (typeof result?.video?.url === "string") {
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
      const candidateNames = [file?.name, result?.name, result?.data?.name, result?.video?.name]
      for (const cand of candidateNames) {
        if (typeof cand === "string" && cand.trim().length > 0) {
          videoName = cand.trim()
          break
        }
      }

      const videoId = this.resolveVideoIdFromResponse(result)
      if (videoId) {
        this.videoIdByUrl[url] = videoId
      }
      if (videoId && videoName) {
        this.videoNameCache[videoId] = videoName
      }

      const parts: string[] = []
      if (videoId) {
        parts.push(videoId)
      }
      parts.push(url)
      if (videoName) {
        parts.push(encodeURIComponent(videoName))
      }

      const payload = this.videoPrefix + parts.join("::")

      const ok = this.sendMessage(payload)
      if (ok) {
        queueMicrotask(() => this.scrollToBottom())
      }
      else console.warn("[handleUploadVideo] envoi message video echoue")
    }
    catch (err) {
      console.error("Erreur :", err)
    }
    finally {
      input.value = ""
    }
  }

  async confirmDeleteVideo(messageId: string | null): Promise<void> {
    if (!messageId) {
      return
    }

    const url = this.selectedVideoUrl || null
    let videoId: string | null = this.selectedVideoId || null
    if (!videoId && url) {
      const known = this.videoIdByUrl[url]
      if (known) {
        videoId = known
      }
    }

    let safe: string | null = null
    if (this.isLikelyObjectId(videoId)) {
      safe = String(videoId)
    }

    if (safe && url) {
      await this.handleDeleteVideo(safe, url)
    }
    else if (safe) {
      await this.handleDeleteVideo(safe)
    }
    else {
      console.warn("[confirmDeleteVideo] identifiant de video manquant pour", url)
    }

    await this.handleDeleteMessage(messageId)
  }

  downloadSelectedVideo(): void {
    if (!this.selectedMessageHasVideo) {
      return
    }
    if (!this.selectedVideoUrl) {
      return
    }
    try {
      window.open(this.selectedVideoUrl, "_blank", "noopener")
    }
    catch (err) {
      console.error("[downloadSelectedVideo] impossible d'ouvrir la video :", err)
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

  ensureVideoNameForMessage(message: UiMessage): void {
    if (!message || !message.videoId) {
      return
    }
    const cached = this.videoNameCache[message.videoId]
    if (cached && cached.trim().length > 0) {
      if (message.videoName !== cached) this.updateMessagesVideoName(message.videoId, cached)
      return
    }
    this.requestVideoNameFetch(message.videoId)
  }

  onMessageDeleted(message: UiMessage | undefined): void {
    if (message?.videoUrl && this.videoIdByUrl[message.videoUrl]) {
      delete this.videoIdByUrl[message.videoUrl]
    }
    if (message?.videoId && this.videoNameCache[message.videoId]) {
      delete this.videoNameCache[message.videoId]
    }
    if (message?.videoId) {
      this.pendingVideoFetch.delete(message.videoId)
    }
  }

  private async handleDeleteVideo(videoId: string, videoUrl: string | null = null): Promise<void> {
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
      if (this.videoNameCache[videoId]) {
        delete this.videoNameCache[videoId]
      }
      this.pendingVideoFetch.delete(videoId)
    }
    catch (err) {
      console.error("Erreur suppression video :", err)
    }
  }

  private updateMessagesVideoName(videoId: string, name: string): void {
    const trimmed = name.trim()
    if (!trimmed) {
      return
    }
    const messages = this.getMessages()
    let updated = false
    for (let i = 0; i < messages.length; i++) {
      const m = messages[i]
      if (m && m.videoId === videoId && m.videoName !== trimmed) {
        messages[i] = { ...m, videoName: trimmed }
        updated = true
      }
    }
    if (updated) {
      this.setMessages([...messages])
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

    this.http.get<any>(`http://localhost:3000/chat/video/${videoId}`, { withCredentials: true })
      .subscribe({
        next: (res) => {
          let name = ""
          if (res && typeof res === "object") {
            if (typeof res.name === "string" && res.name.trim()) {
              name = res.name.trim()
            }
            else if (res.video && typeof res.video.name === "string" && res.video.name.trim()) {
              name = res.video.name.trim()
            }
            if (typeof res.url === "string" && res.url.trim()) {
              this.videoIdByUrl[res.url.trim()] = videoId
            }
          }
          if (name) {
            this.videoNameCache[videoId] = name
            this.updateMessagesVideoName(videoId, name)
          }
        },
        error: (err) => {
          console.error("[requestVideoNameFetch] erreur :", err)
          this.pendingVideoFetch.delete(videoId)
        },
        complete: () => this.pendingVideoFetch.delete(videoId)
      })
  }

  private resolveVideoIdFromResponse(result: any): string | null {
    if (!result) {
      return null
    }
    const candidates: any[] = [result]
    if (result && typeof result === "object") {
      if ("data" in result) {
        candidates.push(result.data)
      }
      if ("video" in result) {
        candidates.push(result.video)
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

  private extractVideoData(text: string): { url: string; videoId: string | null; name: string | null } | null {
    if (!text) {
      return null
    }
    const i = text.indexOf(this.videoPrefix)
    if (i === -1) {
      return null
    }
    const payload = text.substring(i + this.videoPrefix.length).trim()
    if (!payload) {
      return null
    }

    const parts = payload.split("::")
    let videoId: string | null = null
    let urlPart: string | null = null
    let namePart: string | null = null

    if (parts.length === 1) {
      const c = parts[0]
      if (c && c.startsWith("http")) {
        urlPart = c
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
      catch {
        decodedName = namePart
      }
    }
    return { url: urlPart, videoId, name: decodedName }
  }

  private extractFileNameFromUrl(url: string): string | null {
    if (!url) {
      return null
    }
    try {
      const parsed = new URL(url)
      const last = parsed.pathname.split("/").pop()
      if (last && last.trim().length > 0) {
        return decodeURIComponent(last)
      }
    }
    catch (err) {
      console.error("extractFileNameFromUrl error :", err)
    }
    const parts = url.split("/")
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
      return null
    }
    catch {
      if (candidate.trim().length > 0) {
        return candidate
      }
      return null
    }
  }
}