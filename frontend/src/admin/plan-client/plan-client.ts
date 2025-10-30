import { CommonModule } from "@angular/common"
import { Component, ElementRef, Input, OnChanges, OnInit, SimpleChanges, ViewChild } from "@angular/core"
import { FormsModule } from "@angular/forms"
import { AddPlanClientService, CreateExercisePayload } from "./create-planClient.service"
import { DeletePlanClientService } from "./delete-planClient.service"
import { ListPlanClientService, PlanClientExercise, PlanClientItem, PlanClientVideo } from "./list-planClient.service"
import { UploadVideoToPlanService } from "./upload-video-to-plan.service"
import { AttachVideoToPlanService } from "./attach-video-to-plan.service"
import { QuickAddExerciseService } from "./quick-add-exercise.service"
import { UpdateExerciseService } from "./update-exercise.service"
import { RemoveExerciseService } from "./remove-exercise.service"
import { ReorderExercisesService } from "./reorder-exercises.service"

type ExerciseForm = {
    _id: string
    name: string
    type: string
    sets: number
    reps: number
    workSec: number
    restSec: number
    loadKg: number
    rpe: number
    hrZone: string
    notes: string
    videoUrl: string
    videoName: string
    videoDuration: number
    saving: boolean
    success: string | null
    error: string | null
}

type ManagedPlan = PlanClientItem & {
    exercisesForm: ExerciseForm[]
    expanded: boolean
    message: string | null
    error: string | null
    busy: boolean
}

const EXERCISE_TYPES = ["cardio", "muscu", "mobilite", "autre"]

@Component({
    selector: "app-plan-client",
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: "./plan-client.html",
    styleUrls: ["./plan-client.css"]
})
export class PlanClient implements OnInit, OnChanges {

    @Input() selectedUserId: string | null = null
    @Input() myUserId: string | null = null

    @ViewChild("planVideoInput") planVideoInput: ElementRef<HTMLInputElement> | undefined = undefined

    mode: "create" | "manage" = "create"

    planClientTitre = ""
    newExercises: ExerciseForm[] = []
    planClientLoading = false
    planClientError: string | null = null
    planClientSuccess: string | null = null
    exerciseTypes = EXERCISE_TYPES

    listLoading = false
    listError: string | null = null
    plans: ManagedPlan[] = []

    deleteConfirmOpen = false
    deleteTargetId: string | null = null
    deleteTargetTitle = ""
    deleteError: string | null = null

    videoUploadLoading = false
    videoUploadError: string | null = null
    videoUploadSuccess: string | null = null
    private targetPlanForUpload: string | null = null

    constructor(
        private addPlanClientService: AddPlanClientService,
        private deletePlanClientService: DeletePlanClientService,
        private listPlanClientService: ListPlanClientService,
        private uploadVideoService: UploadVideoToPlanService,
        private attachVideoService: AttachVideoToPlanService,
        private quickAddExerciseService: QuickAddExerciseService,
        private updateExerciseService: UpdateExerciseService,
        private removeExerciseService: RemoveExerciseService,
        private reorderExercisesService: ReorderExercisesService
    ) { }

    ngOnInit(): void {
        this.resetCreateForm()
        this.reload()
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (Object.prototype.hasOwnProperty.call(changes, "selectedUserId")) {
            this.reload()
        }
    }

    switchToCreate(): void {
        this.mode = "create"
        this.planClientError = null
        this.planClientSuccess = null
        this.resetCreateForm()
        this.deleteConfirmOpen = false
        this.videoUploadError = null
        this.videoUploadSuccess = null
        this.videoUploadLoading = false
    }

    switchToManage(): void {
        this.mode = "manage"
        this.planClientError = null
        this.planClientSuccess = null
        this.deleteConfirmOpen = false
        this.videoUploadError = null
        this.videoUploadSuccess = null
        this.videoUploadLoading = false
        this.loadList()
    }

    private reload(): void {
        if (this.mode === "manage") {
            this.loadList()
        }
    }

    private resetCreateForm(): void {
        this.planClientTitre = ""
        this.newExercises = []
    }

    addNewExercise(): void {
        this.newExercises.push(this.createExerciseForm())
    }

    removeNewExercise(index: number): void {
        if (index < 0 || index >= this.newExercises.length) {
            return
        }
        this.newExercises.splice(index, 1)
    }

    moveNewExerciseUp(index: number): void {
        if (index <= 0 || index >= this.newExercises.length) {
            return
        }
        const current = this.newExercises[index]
        this.newExercises.splice(index, 1)
        this.newExercises.splice(index - 1, 0, current)
    }

    moveNewExerciseDown(index: number): void {
        if (index < 0 || index >= this.newExercises.length - 1) {
            return
        }
        const current = this.newExercises[index]
        this.newExercises.splice(index, 1)
        this.newExercises.splice(index + 1, 0, current)
    }

    async handleCreatePlanClient(): Promise<void> {
        this.planClientError = null
        this.planClientSuccess = null

        const userId = this.selectedUserId
        if (!userId) {
            this.planClientError = "Choisissez un client avant de creer un plan"
            return
        }

        if (this.newExercises.length === 0) {
            this.planClientError = "Ajoutez au moins un exercice"
            return
        }

        const payloadExercises: CreateExercisePayload[] = []
        for (const ex of this.newExercises) {
            payloadExercises.push(this.buildExercisePayload(ex))
        }

        this.planClientLoading = true
        try {
            await this.addPlanClientService.addPlanClient({
                sharedWithClientId: userId,
                title: this.planClientTitre || "",
                exercises: payloadExercises
            })
            this.planClientLoading = false
            this.planClientSuccess = "Plan client cree"
            this.resetCreateForm()
            if (this.mode === "manage") {
                await this.loadList()
            }
        }
        catch (err: any) {
            this.planClientLoading = false
            if (typeof err === "string") {
                this.planClientError = err
            }
            else if (err && err.fields && err.fields.exercises) {
                this.planClientError = "Exercices invalides"
            }
            else {
                this.planClientError = "Impossible de creer le plan client"
            }
        }
    }

    private loadPlanFromResponse(doc: PlanClientItem, keepExpanded: boolean): ManagedPlan {
        const plan: ManagedPlan = {
            _id: doc._id || "",
            userId: doc.userId || "",
            sharedWithClientId: doc.sharedWithClientId || "",
            title: doc.title || "",
            createdAt: doc.createdAt,
            videos: this.normalizeVideos(doc.videos),
            exercises: this.normalizeExercises(doc.exercises),
            exercisesForm: [],
            expanded: keepExpanded,
            message: null,
            error: null,
            busy: false
        }
        plan.exercisesForm = plan.exercises.map(x => this.createExerciseForm(x))
        return plan
    }

    private normalizeVideos(list: PlanClientVideo[] | undefined | null): PlanClientVideo[] {
        const items: PlanClientVideo[] = []
        if (Array.isArray(list)) {
            for (const v of list) {
                items.push({
                    videoId: v && v.videoId ? String(v.videoId) : "",
                    url: v && v.url ? String(v.url) : "",
                    name: v && v.name ? String(v.name) : "",
                    size: v && typeof v.size === "number" ? v.size : 0,
                    format: v && v.format ? String(v.format) : "",
                    duration: v && typeof v.duration === "number" ? v.duration : 0
                })
            }
        }
        return items
    }

    private normalizeExercises(list: PlanClientExercise[] | undefined | null): PlanClientExercise[] {
        const items: PlanClientExercise[] = []
        if (Array.isArray(list)) {
            for (const ex of list) {
                items.push({
                    _id: ex && ex._id ? String(ex._id) : "",
                    name: ex && ex.name ? String(ex.name) : "",
                    type: ex && ex.type ? String(ex.type) : "",
                    sets: ex && typeof ex.sets === "number" ? ex.sets : 1,
                    reps: ex && typeof ex.reps === "number" ? ex.reps : 1,
                    workSec: ex && typeof ex.workSec === "number" ? ex.workSec : 0,
                    restSec: ex && typeof ex.restSec === "number" ? ex.restSec : 0,
                    loadKg: ex && typeof ex.loadKg === "number" ? ex.loadKg : 0,
                    rpe: ex && typeof ex.rpe === "number" ? ex.rpe : 0,
                    hrZone: ex && ex.hrZone ? String(ex.hrZone) : "",
                    notes: ex && ex.notes ? String(ex.notes) : "",
                    video: {
                        url: ex && ex.video && ex.video.url ? String(ex.video.url) : "",
                        name: ex && ex.video && ex.video.name ? String(ex.video.name) : "",
                        duration: ex && ex.video && typeof ex.video.duration === "number" ? ex.video.duration : 0
                    }
                })
            }
        }
        return items
    }

    private createExerciseForm(source?: PlanClientExercise): ExerciseForm {
        const base: ExerciseForm = {
            _id: "",
            name: "",
            type: "muscu",
            sets: 3,
            reps: 12,
            workSec: 0,
            restSec: 90,
            loadKg: 0,
            rpe: 0,
            hrZone: "",
            notes: "",
            videoUrl: "",
            videoName: "",
            videoDuration: 0,
            saving: false,
            success: null,
            error: null
        }

        if (!source) {
            return base
        }

        base._id = source._id || ""
        base.name = source.name || ""
        base.type = this.ensureExerciseType(source.type)
        base.sets = typeof source.sets === "number" ? source.sets : base.sets
        base.reps = typeof source.reps === "number" ? source.reps : base.reps
        base.workSec = typeof source.workSec === "number" ? source.workSec : base.workSec
        base.restSec = typeof source.restSec === "number" ? source.restSec : base.restSec
        base.loadKg = typeof source.loadKg === "number" ? source.loadKg : base.loadKg
        base.rpe = typeof source.rpe === "number" ? source.rpe : base.rpe
        base.hrZone = source.hrZone || ""
        base.notes = source.notes || ""
        if (source.video) {
            base.videoUrl = source.video.url || ""
            base.videoName = source.video.name || ""
            base.videoDuration = typeof source.video.duration === "number" ? source.video.duration : 0
        }

        return base
    }

    private buildExercisePayload(form: ExerciseForm): CreateExercisePayload {
        const payload: CreateExercisePayload = {
            name: form.name ? String(form.name).trim() : "",
            type: this.ensureExerciseType(form.type),
            sets: this.toPositiveInt(form.sets, 1),
            reps: this.toPositiveInt(form.reps, 1),
            workSec: this.toNonNegativeInt(form.workSec, 0),
            restSec: this.toNonNegativeInt(form.restSec, 0),
            loadKg: this.toNonNegativeNumber(form.loadKg, 0),
            rpe: this.toBoundedInt(form.rpe, 0, 0, 10),
            hrZone: form.hrZone ? String(form.hrZone).trim() : "",
            notes: form.notes ? String(form.notes).trim() : "",
            video: {
                url: form.videoUrl ? String(form.videoUrl).trim() : "",
                name: form.videoName ? String(form.videoName).trim() : "",
                duration: this.toNonNegativeInt(form.videoDuration, 0)
            }
        }
        return payload
    }

    private ensureExerciseType(value: string | undefined): string {
        if (value) {
            for (const allowed of EXERCISE_TYPES) {
                if (allowed === value) {
                    return value
                }
            }
        }
        return "muscu"
    }

    private toPositiveInt(value: any, fallback: number): number {
        const parsed = Number(value)
        if (!Number.isFinite(parsed)) {
            return fallback
        }
        const rounded = Math.round(parsed)
        if (rounded < 1) {
            return Math.max(1, fallback)
        }
        return rounded
    }

    private toNonNegativeInt(value: any, fallback: number): number {
        const parsed = Number(value)
        if (!Number.isFinite(parsed)) {
            return fallback
        }
        const rounded = Math.round(parsed)
        if (rounded < 0) {
            return 0
        }
        return rounded
    }

    private toNonNegativeNumber(value: any, fallback: number): number {
        const parsed = Number(value)
        if (!Number.isFinite(parsed)) {
            return fallback
        }
        if (parsed < 0) {
            return 0
        }
        return parsed
    }

    private toBoundedInt(value: any, fallback: number, min: number, max: number): number {
        let result = this.toNonNegativeInt(value, fallback)
        if (result < min) {
            result = min
        }
        if (result > max) {
            result = max
        }
        return result
    }

    private async loadList(): Promise<void> {
        const userId = this.selectedUserId
        if (!userId) {
            this.plans = []
            this.listError = null
            return
        }
        this.listLoading = true
        this.listError = null
        try {
            const res = await this.listPlanClientService.listPlanClientForUser(userId)
            const plans: ManagedPlan[] = []
            if (res && Array.isArray(res.items)) {
                for (const raw of res.items) {
                    plans.push(this.loadPlanFromResponse(raw, false))
                }
            }
            this.plans = plans
            this.listLoading = false
        }
        catch (err: any) {
            this.listLoading = false
            if (typeof err === "string") {
                this.listError = err
            }
            else if (err && err.error && err.error.message) {
                this.listError = err.error.message
            }
            else {
                this.listError = "Impossible de charger les plans"
            }
        }
    }

    togglePlan(plan: ManagedPlan): void {
        plan.expanded = !plan.expanded
    }

    planTitle(plan: ManagedPlan): string {
        if (plan.title && plan.title.trim()) {
            return plan.title.trim()
        }
        return "Plan sans titre"
    }

    formatDate(value?: string): string {
        if (!value) {
            return ""
        }
        const date = new Date(value)
        if (Number.isNaN(date.getTime())) {
            return ""
        }
        return date.toLocaleString("fr-FR", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        })
    }

    async addExerciseToPlan(plan: ManagedPlan): Promise<void> {
        plan.busy = true
        plan.error = null
        plan.message = null
        try {
            const res = await this.quickAddExerciseService.add(plan._id)
            if (res && res.item) {
                this.applyUpdatedPlan(res.item, plan._id, true)
                plan.message = "Exercice ajoute"
            }
            plan.busy = false
        }
        catch (err: any) {
            plan.busy = false
            if (typeof err === "string") {
                plan.error = err
            }
            else if (err && err.error && err.error.message) {
                plan.error = err.error.message
            }
            else {
                plan.error = "Ajout impossible"
            }
        }
    }

    async saveExercise(plan: ManagedPlan, exercise: ExerciseForm): Promise<void> {
        if (!exercise._id) {
            exercise.error = "Identifiant exercice manquant"
            return
        }
        exercise.saving = true
        exercise.error = null
        exercise.success = null
        try {
            const patch = this.buildExercisePayload(exercise)
            const res = await this.updateExerciseService.update(plan._id, exercise._id, patch)
            if (res && res.item) {
                this.applyUpdatedPlan(res.item, plan._id, plan.expanded)
                const updatedPlan = this.findPlan(plan._id)
                if (updatedPlan) {
                    const updatedExercise = updatedPlan.exercisesForm.find(x => x._id === exercise._id)
                    if (updatedExercise) {
                        updatedExercise.success = "Enregistre"
                    }
                }
            }
            exercise.saving = false
        }
        catch (err: any) {
            exercise.saving = false
            if (typeof err === "string") {
                exercise.error = err
            }
            else if (err && err.error && err.error.message) {
                exercise.error = err.error.message
            }
            else {
                exercise.error = "Sauvegarde impossible"
            }
        }
    }

    async removeExercise(plan: ManagedPlan, exercise: ExerciseForm): Promise<void> {
        if (!exercise._id) {
            return
        }
        exercise.saving = true
        exercise.error = null
        exercise.success = null
        try {
            const res = await this.removeExerciseService.remove(plan._id, exercise._id)
            if (res && res.item) {
                this.applyUpdatedPlan(res.item, plan._id, plan.expanded)
            }
        }
        catch (err: any) {
            exercise.saving = false
            if (typeof err === "string") {
                exercise.error = err
            }
            else if (err && err.error && err.error.message) {
                exercise.error = err.error.message
            }
            else {
                exercise.error = "Suppression impossible"
            }
            return
        }
    }

    async moveExercise(plan: ManagedPlan, index: number, direction: "up" | "down"): Promise<void> {
        const list = plan.exercisesForm
        if (index < 0 || index >= list.length) {
            return
        }
        if (direction === "up") {
            if (index === 0) {
                return
            }
            const current = list[index]
            list.splice(index, 1)
            list.splice(index - 1, 0, current)
        }
        else {
            if (index >= list.length - 1) {
                return
            }
            const current = list[index]
            list.splice(index, 1)
            list.splice(index + 1, 0, current)
        }

        const orderedIds: string[] = []
        for (const ex of list) {
            if (ex._id) {
                orderedIds.push(ex._id)
            }
        }

        if (orderedIds.length === 0) {
            return
        }

        plan.busy = true
        plan.message = null
        plan.error = null
        try {
            const res = await this.reorderExercisesService.reorder(plan._id, orderedIds)
            if (res && res.item) {
                this.applyUpdatedPlan(res.item, plan._id, plan.expanded)
            }
            plan.busy = false
        }
        catch (err: any) {
            plan.busy = false
            if (typeof err === "string") {
                plan.error = err
            }
            else if (err && err.error && err.error.message) {
                plan.error = err.error.message
            }
            else {
                plan.error = "Reorganisation impossible"
            }
        }
    }

    openDeletePlan(plan: ManagedPlan): void {
        this.deleteConfirmOpen = true
        this.deleteTargetId = plan._id
        this.deleteTargetTitle = this.planTitle(plan)
        this.deleteError = null
    }

    cancelDeletePlan(): void {
        this.deleteConfirmOpen = false
        this.deleteTargetId = null
        this.deleteTargetTitle = ""
        this.deleteError = null
    }

    async confirmDeletePlan(): Promise<void> {
        if (!this.deleteTargetId) {
            return
        }
        try {
            await this.deletePlanClientService.DeletePlanClient(this.deleteTargetId)
            this.plans = this.plans.filter(p => p._id !== this.deleteTargetId)
            this.cancelDeletePlan()
        }
        catch (err: any) {
            if (typeof err === "string") {
                this.deleteError = err
            }
            else if (err && err.error && err.error.message) {
                this.deleteError = err.error.message
            }
            else {
                this.deleteError = "Suppression impossible"
            }
        }
    }

    openPlanVideoPicker(planId: string): void {
        if (!this.planVideoInput) {
            return
        }
        this.targetPlanForUpload = planId
        this.planVideoInput.nativeElement.value = ""
        this.planVideoInput.nativeElement.click()
    }

    async handleVideoPicked(event: Event): Promise<void> {
        const input = event.target as HTMLInputElement
        if (!input || !input.files || input.files.length === 0) {
            return
        }
        const planId = this.targetPlanForUpload
        if (!planId) {
            return
        }
        this.videoUploadError = null
        this.videoUploadSuccess = null
        this.videoUploadLoading = true

        try {
            for (let i = 0; i < input.files.length; i += 1) {
                const file = input.files.item(i)
                if (file) {
                    const res = await this.uploadVideoService.upload(planId, file)
                    if (res && res.item) {
                        this.applyUpdatedPlan(res.item, planId, true)
                    }
                }
            }
            this.videoUploadSuccess = "Video ajoutee"
            this.videoUploadLoading = false
        }
        catch (err: any) {
            this.videoUploadLoading = false
            if (typeof err === "string") {
                this.videoUploadError = err
            }
            else if (err && err.error && err.error.message) {
                this.videoUploadError = err.error.message
            }
            else {
                this.videoUploadError = "Ajout video impossible"
            }
        }
        finally {
            this.targetPlanForUpload = null
        }
    }

    async detachVideo(plan: ManagedPlan, videoId: string): Promise<void> {
        plan.busy = true
        plan.error = null
        plan.message = null
        try {
            const res = await this.attachVideoService.detach(plan._id, videoId)
            if (res && res.item) {
                this.applyUpdatedPlan(res.item, plan._id, plan.expanded)
                plan.message = "Video retiree"
            }
            plan.busy = false
        }
        catch (err: any) {
            plan.busy = false
            if (typeof err === "string") {
                plan.error = err
            }
            else if (err && err.error && err.error.message) {
                plan.error = err.error.message
            }
            else {
                plan.error = "Suppression video impossible"
            }
        }
    }

    trackPlan(_: number, plan: ManagedPlan): string {
        return plan._id
    }

    trackExercise(index: number, exercise: ExerciseForm): string {
        if (exercise._id) {
            return exercise._id
        }
        return `new-${index}`
    }

    private applyUpdatedPlan(raw: PlanClientItem, planId: string, keepExpanded: boolean): void {
        const updated = this.loadPlanFromResponse(raw, keepExpanded)
        const index = this.plans.findIndex(p => p._id === planId)
        if (index >= 0) {
            this.plans[index] = updated
        }
        else {
            this.plans.push(updated)
        }
    }

    private findPlan(planId: string): ManagedPlan | undefined {
        return this.plans.find(p => p._id === planId)
    }
}
