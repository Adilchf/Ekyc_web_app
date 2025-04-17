import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { NgIf } from '@angular/common';

@Component({
  selector: 'app-home',
  standalone: true,  // ✅ Ensure this is standalone
  imports: [FormsModule],  // ✅ Required for [(ngModel)]
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent {
  selectedOption: string = '';

  constructor(private router: Router) {}

  onSubmit() {
    console.log('Navigating to:', this.selectedOption);
    if (this.selectedOption) {
      this.router.navigate(['/' + this.selectedOption], {
        queryParams: { type: this.selectedOption }
      })
        .catch(err => console.error('Navigation Error:', err));
    } else {
      console.error('No option selected');
    }
  }
}
