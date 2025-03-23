import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:5000'; // Backend URL

  constructor(private http: HttpClient) {}

  saveIdCard(formData: FormData) {
    return this.http.post(`${this.apiUrl}/save-id-card`, formData);
  }
}
