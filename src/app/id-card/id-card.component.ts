import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Tesseract from 'tesseract.js';
import * as faceapi from 'face-api.js';

@Component({
  selector: 'app-id-card',
  templateUrl: './id-card.component.html',
  styleUrls: ['./id-card.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class IdCardComponent {
  // Form data
  form = {
    familyName: '',
    givenName: '',
    identityNumber: '',
    cardNumber: '',
    birthdate: '',
    expiryDate: '',
    selfie: null as File | null,
    frontImage: null as File | null,
    backImage: null as File | null,
  };

  // Preview images
  frontPreview: string | null = null;
  backPreview: string | null = null;
  selfiePreview: string | null = null;
  extractedFace: string | null = null; // Store extracted face

  // Extracted Data
  identityNumber: string | null = null;
  cardNumber: string | null = null;
  expiryDate: string | null = null;
  birthdate: string | null = null;
  familyName: string | null = null;
  givenName: string | null = null;

  /** Handles Selfie Upload */
  onFileSelected(event: any, type: string) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (type === 'selfie') {
        this.form.selfie = file;
        this.selfiePreview = reader.result as string;
      }
    };
    reader.readAsDataURL(file);
  }

  /** Handles Front ID Upload & Extracts Data */
  onFrontSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.form.frontImage = file;
    const reader = new FileReader();

    reader.onload = async () => {
      this.frontPreview = reader.result as string;
      this.extractFrontText(); // Extract text
      this.extractedFace = await this.extractFace(this.frontPreview); // Extract face
    };

    reader.readAsDataURL(file);
  }

  /** Handles Back ID Upload */
  onBackSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.form.backImage = file;
    const reader = new FileReader();

    reader.onload = () => {
      this.backPreview = reader.result as string;
      this.extractBackText(); // Extract names from back side
    };

    reader.readAsDataURL(file);
  }

  /** Extracts text from the front image using OCR */
  extractFrontText() {
    if (!this.frontPreview) {
      console.error("Front image is required!");
      return;
    }

    Tesseract.recognize(
      this.frontPreview,
      'eng',
      { logger: m => console.log(m) }
    ).then(({ data: { text } }) => {
      console.log('Extracted Text:', text);
      this.identityNumber = this.extractIdentityNumber(text);
      this.cardNumber = this.extractCardNumber(text);
      const dates = this.extractDates(text);
      this.expiryDate = dates[1] || null; // 2nd date is expiry date
      this.birthdate = dates[2] || null; // 3rd date is birthdate

      this.form.identityNumber = this.identityNumber || '';
      this.form.cardNumber = this.cardNumber || '';
      this.form.expiryDate = this.expiryDate || '';
      this.form.birthdate = this.birthdate || '';
    }).catch(error => console.error('OCR Error:', error));
  }

  extractBackText() {
    if (!this.backPreview) {
      console.error("Back image is required!");
      return;
    }

    Tesseract.recognize(
      this.backPreview,
      'eng',
      { logger: m => console.log(m) }
    ).then(({ data: { text } }) => {
      console.log('Extracted Back Text:', text);
      this.familyName = this.extractFamilyName(text);
      this.givenName = this.extractGivenName(text);

      this.form.familyName = this.familyName || '';
      this.form.givenName = this.givenName || '';
    }).catch(error => console.error('OCR Error (Back):', error));
  }

  /** Extracts face from the front ID card */
/** Ensures models are loaded and extracts face with padding */
async extractFace(frontPreview: string): Promise<string | null> {
  try {
    // ✅ Ensure models are loaded before running inference
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/assets/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/assets/models');
    await faceapi.nets.faceRecognitionNet.loadFromUri('/assets/models');

    return new Promise((resolve) => {
      const img = new Image();
      img.src = frontPreview;
      img.onload = async () => {
        const detections = await faceapi.detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detections) {
          let { x, y, width, height } = detections.detection.box;

          // ✅ Expand the bounding box by 20% to include more area around the face
          const padding = 0.2; // 20% padding
          const expandX = width * padding;
          const expandY = height * padding;

          x = Math.max(0, x - expandX); // Prevent negative values
          y = Math.max(0, y - expandY);
          width = Math.min(img.width - x, width + 2 * expandX);
          height = Math.min(img.height - y, height + 2 * expandY);

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (ctx) {
            ctx.drawImage(img, x, y, width, height, 0, 0, width, height);
            resolve(canvas.toDataURL('image/png')); // Return the expanded face image
          }
        } else {
          console.log("No face detected.");
          resolve(null);
        }
      };
    });
  } catch (error) {
    console.error("Face extraction error:", error);
    return null;
  }
}


  /** Extracts 18-digit Identity Number */
  extractIdentityNumber(text: string): string | null {
    const match = text.match(/\b\d{18}\b/);
    return match ? match[0] : null;
  }

  /** Extracts 9-digit Card Number */
  extractCardNumber(text: string): string | null {
    const match = text.match(/\b\d{9}\b/);
    return match ? match[0] : null;
  }

  extractDates(text: string): string[] {
    const dateRegex = /\b(\d{4}\.\d{2}\.\d{2})\b/g;
    const matches = text.match(dateRegex) || [];
    return matches.slice(0, 3); // Get first 3 dates
  }

  /** Extracts Family Name (Nom:) */
  extractFamilyName(text: string): string | null {
    const match = text.match(/Nom:\s*([A-Z]+)/i);
    return match ? match[1].trim() : null;
  }

  /** Extracts Given Name (Prénom(s)) only from its line */
  extractGivenName(text: string): string | null {
    const match = text.match(/Prénom\(s\):\s*([A-Z]+)/i);
    return match ? match[1].trim() : null;
  }

  onSubmit() {
    console.log('Form Data:', this.form);
    alert('Form submitted successfully!');
  }
}
