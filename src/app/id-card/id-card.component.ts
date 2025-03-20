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

  // Extracted Data
  identityNumber: string | null = null;
  cardNumber: string | null = null;
  expiryDate: string | null = null;
  birthdate: string | null = null;
  familyName: string | null = null;
  givenName: string | null = null;

  // Face Data
  frontFace: string | null = null;
  selfieFace: string | null = null;

  async ngOnInit() {
    await this.loadFaceModels();
    console.log("🔄 Loading face-api.js models...");
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri('/assets/models'),
      faceapi.nets.ssdMobilenetv1.loadFromUri('/assets/models'),
      faceapi.nets.faceLandmark68Net.loadFromUri('/assets/models'),
      faceapi.nets.faceExpressionNet.loadFromUri('/assets/models') // ✅ Load expressions model
    ]);
    console.log("✅ All models loaded successfully!");
  }

  /** Load Face-API Models */
  async loadFaceModels() {
    await faceapi.nets.ssdMobilenetv1.loadFromUri('/assets/models');
    await faceapi.nets.faceLandmark68Net.loadFromUri('/assets/models');
  }

  /** Handles Front ID Upload & Extracts Data */
  async onFrontSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.form.frontImage = file;
    const reader = new FileReader();

    reader.onload = async () => {
      this.frontPreview = reader.result as string;
      this.extractFrontText();
      this.frontFace = await this.extractFace(this.frontPreview);
    };

    reader.readAsDataURL(file);
  }
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


  /** Handles Selfie Upload */
  async onSelfieSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.form.selfie = file;
    const reader = new FileReader();

    reader.onload = async () => {
      this.selfiePreview = reader.result as string;
      this.selfieFace = await this.extractFace(this.selfiePreview, true);
    };

    reader.readAsDataURL(file);
  }

  /** Extract Text from Front ID */
  extractFrontText() {
    if (!this.frontPreview) {
      console.error("Front image is required!");
      return;
    }

    Tesseract.recognize(this.frontPreview, 'eng', { logger: m => console.log(m) })
      .then(({ data: { text } }) => {
        console.log('Extracted Text:', text);
        this.identityNumber = this.extractIdentityNumber(text);
        this.cardNumber = this.extractCardNumber(text);
        const dates = this.extractDates(text);
        this.expiryDate = dates[1] || null;
        this.birthdate = dates[2] || null;

        this.form.identityNumber = this.identityNumber || '';
        this.form.cardNumber = this.cardNumber || '';
        this.form.expiryDate = this.expiryDate || '';
        this.form.birthdate = this.birthdate || '';
      })
      .catch(error => console.error('OCR Error:', error));
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

  /** Extract Face from Image */
  async extractFace(imageSrc: string, isSelfie = false): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = imageSrc;
      img.onload = async () => {
        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks();

        if (!detections) {
          alert(isSelfie ? "No face detected in selfie. Please upload a clearer image." : "No face detected in ID card.");
          resolve(null);
          return;
        }

        const landmarks = detections.landmarks;

        // 🔍 Check if eyes are closed
        if (isSelfie && this.areEyesClosed(landmarks)) {
          alert("Eyes are closed. Please open your eyes and retake the photo.");
          resolve(null);  // Stop processing and return null
          return;
        }

        const { x, y, width, height } = detections.detection.box;
        const padding = width * 0.4;  // Adds extra space around face
        const canvas = document.createElement('canvas');
        canvas.width = width + padding * 2;
        canvas.height = height + padding * 2;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.drawImage(img, x - padding, y - padding, width + padding * 2, height + padding * 2, 0, 0, canvas.width, canvas.height);
          const faceDataURL = canvas.toDataURL('image/png');

          resolve(faceDataURL);  // ✅ Successfully extracted face
        } else {
          resolve(null);
        }
      };
    });
  }



/** Check if eyes are closed */
/** ✅ Detects if eyes are closed */
areEyesClosed(landmarks: faceapi.FaceLandmarks68): boolean {
  const leftEye = landmarks.getLeftEye();
  const rightEye = landmarks.getRightEye();

  function eyeOpenness(eye: faceapi.Point[]): number {
    const verticalDist1 = Math.abs(eye[1].y - eye[5].y);
    const verticalDist2 = Math.abs(eye[2].y - eye[4].y);
    const horizontalDist = Math.abs(eye[3].x - eye[0].x);

    // EAR (Eye Aspect Ratio) formula
    const eyeRatio = (verticalDist1 + verticalDist2) / (2.0 * horizontalDist);
    return eyeRatio;
  }

  const leftEyeOpen = eyeOpenness(leftEye);
  const rightEyeOpen = eyeOpenness(rightEye);

  console.log(`🔍 Left Eye Ratio: ${leftEyeOpen.toFixed(3)}`);
  console.log(`🔍 Right Eye Ratio: ${rightEyeOpen.toFixed(3)}`);

  const closedEyeThreshold = 0.20; // Adjusted threshold for better accuracy

  return leftEyeOpen < closedEyeThreshold && rightEyeOpen < closedEyeThreshold;
}




  /** Extract 18-digit Identity Number */
  extractIdentityNumber(text: string): string | null {
    const match = text.match(/\b\d{18}\b/);
    return match ? match[0] : null;
  }

  /** Extract 9-digit Card Number */
  extractCardNumber(text: string): string | null {
    const match = text.match(/\b\d{9}\b/);
    return match ? match[0] : null;
  }

  /** Extract Dates (YYYY.MM.DD) */
  extractDates(text: string): string[] {
    const dateRegex = /\b(\d{4}\.\d{2}\.\d{2})\b/g;
    return text.match(dateRegex) || [];
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

  /** Handles Selfie Upload */

  /** Handles Back ID Upload */


  /** Extracts face from the front ID card */
/** Ensures models are loaded and extracts face with padding */




