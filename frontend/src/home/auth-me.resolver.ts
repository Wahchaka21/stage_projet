// auth-me.resolver.ts
import { inject } from '@angular/core';
import { ResolveFn } from '@angular/router';
import { HttpClient } from '@angular/common/http';

const API = 'http://localhost:3000'

export const authMeResolver: ResolveFn<any> = () => {
    const http = inject(HttpClient)
    return http.get(`${API}/auth/me`)
}