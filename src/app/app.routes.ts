import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { IdCardComponent } from './id-card/id-card.component';
import { DrivingLicenseComponent } from './driving-license/driving-license.component';
import { PassportComponent } from './passport/passport.component';

export const routes: Routes = [
    { path: '', redirectTo: 'home', pathMatch: 'full' },
    { path: 'home', component: HomeComponent },
    { path: 'id-card', component: IdCardComponent },
    { path: 'driving-license', component: DrivingLicenseComponent },
    { path: 'passport', component: PassportComponent },
    { path: '**', redirectTo: 'home' }
];
