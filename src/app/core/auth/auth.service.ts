import { Injectable, PLATFORM_ID, inject } from "@angular/core";
import { isPlatformBrowser } from "@angular/common";
import Keycloak from "keycloak-js";
import { environment } from '@core/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly platformId = inject(PLATFORM_ID);
    private readonly keycloak = new Keycloak({
        url: environment.keycloak.url,
        realm: environment.keycloak.realm,
        clientId: environment.keycloak.clientId
    });

    async init(): Promise<void> {
        if (!isPlatformBrowser(this.platformId)) {
            return;
        }

        await this.keycloak.init({
            onLoad: 'check-sso',
            pkceMethod: 'S256',
        });
    }

    loginWithGoogle(): void {
        this.keycloak.login({
            idpHint: 'google',
            redirectUri: window.location.origin
        });
    }

    loginWithMicrosoft(): void {
        this.keycloak.login({
            idpHint: 'microsoft',
            redirectUri: window.location.origin
        });
    }

    logout(): void {
        this.keycloak.logout({
            redirectUri: window.location.origin
        });
    }

    async getValidToken(): Promise<string | undefined> {
        if(!this.keycloak.authenticated) {
            return undefined;
        }

        try {
            await this.keycloak.updateToken(30);
            return this.keycloak.token;
        } catch (error) {
            this.keycloak.clearToken();
            return undefined;
        }
    }

    get isAuthenticated(): boolean {
        return this.keycloak.authenticated ?? false;
    }

    get username(): string | undefined {
        return this.keycloak.tokenParsed?.['preferred_username'];
    }

    get email(): string | undefined {
        return this.keycloak.tokenParsed?.['email'];
    }
}