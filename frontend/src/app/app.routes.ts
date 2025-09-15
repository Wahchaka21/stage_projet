import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: "inscription",
        loadComponent: () =>
            import("../registration/registration").then((m) => m.Registration)
    }
];