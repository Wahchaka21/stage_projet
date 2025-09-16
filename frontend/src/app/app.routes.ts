import { Routes } from '@angular/router';

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
            import("../home/home").then((m) => m.Home)
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