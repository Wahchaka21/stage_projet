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
        path: "",
        redirectTo: "/connexion",
        pathMatch: "full"
    },
    {
        path: "**",
        redirectTo: "/connexion"
    }
];