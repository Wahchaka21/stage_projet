// auth.interceptor.ts
import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { LoginService } from './login.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(LoginService);
    const token = auth.accessToken();

    let authReq;
    if (token) {
        // Si on a un token → on ajoute l’Authorization
        authReq = req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
    }
    else {
        // Sinon → on laisse la requête telle quelle
        authReq = req;
    }

    return next(authReq).pipe(
        catchError((err: HttpErrorResponse) => {
            if (err.status === 401) {
                // Si 401 → on tente un refresh
                return auth.refresh().pipe(
                    switchMap(() => {
                        const newToken = auth.accessToken();

                        let retryReq;
                        if (newToken) {
                            retryReq = authReq.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } });
                        }
                        else {
                            retryReq = authReq;
                        }

                        return next(retryReq);
                    }),
                    catchError(e => {
                        auth.accessToken.set(null);
                        return throwError(() => e);
                    })
                );
            }
            else {
                // Toute autre erreur → on la renvoie telle quelle
                return throwError(() => err);
            }
        })
    );
};