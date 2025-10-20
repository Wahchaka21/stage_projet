import { Routes } from '@angular/router';
import { authMeResolver } from '../home/auth-me.resolver';

export const routes: Routes = [
    {
        path: "inscription",
        loadComponent: () =>
            import("../registration/registration").then((m) => m.Registration)
    },
    {
        path: "connexion",
        loadComponent: () =>
            import("../login/login").then((m) => m.Login)
    },
    {
        path: "condition-utilisation",
        loadComponent: () =>
            import("../rgpd/rgpd").then((m) => m.Rgpd)
    },
    {
        path: "accueil",
        loadComponent: () =>
            import("../home/home").then((m) => m.Home),
        resolve: { me: authMeResolver }
    },
    {
        path: "discussion/:peerId",
        loadComponent: () =>
            import("../chat/chat").then((m) => m.Chat)
    },
    {
        path: "julescoachingadminspace",
        loadComponent: () =>
            import("../admin/admin").then((m) => m.Admin)
    },
    {
        path: "rdv",
        loadComponent: () =>
            import("../rdv/rdv").then((m) => m.Rdv)
    },
    {
        path: "cette-semaine",
        loadComponent: () =>
            import("../cette-semaine/cette-semaine").then((m) => m.CetteSemaine)
    },
    {
        path: "plan-alimentaire",
        loadComponent: () =>
            import("../plan-alimentaire/plan-alimentaire").then((m) => m.PlanAlimentaire)
    },
    {
        path: "",
        redirectTo: "/connexion",
        pathMatch: "full"
    },
    {
        path: "**",
        redirectTo: "/connexion"
    }
];