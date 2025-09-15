// auth.interceptor.ts
import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { LoginService } from './login.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const auth = inject(LoginService);
    const token = auth.accessToken();

    const authReq = token
        ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
        : req;

    return next(authReq).pipe(
        catchError((err: HttpErrorResponse) => {
            if (err.status === 401) {
                return auth.refresh().pipe(
                    switchMap(() => {
                        const newToken = auth.accessToken();
                        const retryReq = newToken
                            ? authReq.clone({ setHeaders: { Authorization: `Bearer ${newToken}` } })
                            : authReq;
                        return next(retryReq);
                    }),
                    catchError(e => {
                        auth.accessToken.set(null);
                        return throwError(() => e);
                    })
                );
            }
            return throwError(() => err);
        })
    );
};