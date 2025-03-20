import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-passport',
  imports: [ FormsModule],
  standalone: true,
  templateUrl: './passport.component.html',
  styleUrls: ['./passport.component.css']
})
export class PassportComponent {
  form = {
    familyName: '',
    givenName: '',
    identityNumber: '',
    cardNumber: '',
    birthdate: '',
    selfie: null as File | null,
    idCard: null as File | null
  };

  onFileSelected(event: any, field: 'selfie' | 'idCard') {
    const file = event.target.files[0];
    if (file) {
      this.form[field] = file;
    }
  }

  onSubmit() {
    console.log("Form Data:", this.form);
    alert('Form submitted successfully!');
  }
}
