import { Component, OnInit } from "@angular/core";
import { AuthService } from '@core/auth/auth.service';
import { Router } from '@angular/router';

@Component({
    selector: 'app-login',
    templateUrl: './login.html',
    styleUrls: ['./login.css']
})
export class Login implements OnInit {
    constructor(
        private readonly authService: AuthService,
        private readonly router: Router
    ) { }

    ngOnInit(): void {
        if (this.authService.isAuthenticated) {
            void this.router.navigateByUrl('/');
        }
    }

    loginWithGoogle(): void {
        this.authService.loginWithGoogle();
    }

    loginWithMicrosoft(): void {
        this.authService.loginWithMicrosoft();
    }
}