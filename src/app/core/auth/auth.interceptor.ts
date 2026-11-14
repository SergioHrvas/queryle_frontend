import { HttpInterceptorFn } from "@angular/common/http";
import { environment } from "@core/environments/environment";
import { AuthService } from "@core/auth/auth.service";
import { inject } from "@angular/core";
import { from, switchMap } from "rxjs";

export const authInterceptor : HttpInterceptorFn = (req, next) => {
    if(!req.url.startsWith(environment.apiUrl)) {
        return next(req);
    }
    
    const authService = inject(AuthService);
    return from(authService.getValidToken()).pipe(
        switchMap(token => {
            if(!token) {
                return next(req);
            }

            const authReq = req.clone({
                setHeaders: {
                    Authorization: `Bearer ${token}`
                }
            });

            return next(authReq);
        })
    );
}