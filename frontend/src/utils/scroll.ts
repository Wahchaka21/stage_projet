export function scrollToBottomById(id: string, smooth = false): void {
    const el = document.getElementById(id)
    if (!el) {
        return
    }

    const anchor = el.querySelector("[data-scroll-anchor='end']") as HTMLElement | null
    if (anchor && anchor.scrollIntoView) {
        anchor.scrollIntoView({ block: "end", behavior: smooth ? "smooth" : "auto" })
    }
    else {
        el.scrollTop = el.scrollHeight
    }
}

export function scheduleScrollById(id: string, smooth = false): void {
    requestAnimationFrame(() => {
        scrollToBottomById(id, smooth)
        setTimeout(() => scrollToBottomById(id, smooth), 0)
        setTimeout(() => scrollToBottomById(id, smooth), 120)
    })
}

export function shouldStickToBottomById(id: string, threshold = 120): boolean {
    const el = document.getElementById(id)
    if (!el) {
        return true
    }
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight
    return distance < threshold
}