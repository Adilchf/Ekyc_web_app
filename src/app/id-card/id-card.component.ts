import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import Tesseract from 'tesseract.js';
import * as faceapi from 'face-api.js';
import { ApiService } from '../services/api.service';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { inject } from '@angular/core';
@Component({
  selector: 'app-id-card',
  templateUrl: './id-card.component.html',
  styleUrls: ['./id-card.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class IdCardComponent {
  apiService = inject(ApiService);
  http = inject(HttpClient);
  // Form data
  form = {
    familyName: '',
    givenName: '',
    identityNumber: '',
    cardNumber: '',
    birthdate: '',
    expiryDate: '',
    documentType: '',
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

  constructor(private route: ActivatedRoute) {}
  selectedDocumentType: string = 'idCard';
  async ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.selectedDocumentType = params['type'] || 'idCard'; // fallback to 'idCard' if not provided
      console.log('📄 Document Type:', this.selectedDocumentType);
    });
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


        this.form.identityNumber = this.identityNumber || '';
        this.form.cardNumber = this.cardNumber || '';

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
      this.birthdate = this.extractBirthdate(text);
      this.expiryDate = this.extractExpiryDate(text);
      this.form.familyName = this.familyName || '';
      this.form.givenName = this.givenName || '';
      this.form.expiryDate = this.expiryDate || '';
      this.form.birthdate = this.birthdate || '';
    }).catch(error => console.error('OCR Error (Back):', error));
  }

  /** Extract Face from Image */
   /** Extract face image from a given imageSrc */
   async extractFace(imageSrc: string, isSelfie = false): Promise<string | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = imageSrc;

      img.onload = async () => {
        const detections = await faceapi
          .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        if (!detections) {
          alert(isSelfie
            ? "No face detected in selfie. Please upload a clearer image."
            : "No face detected in ID card.");
          resolve(null);
          return;
        }

        const landmarks = detections.landmarks;

        // 🔍 Check for closed eyes in selfie
        if (isSelfie && this.areEyesClosed(landmarks)) {
          alert("Eyes are closed. Please open your eyes and retake the photo.");
          resolve(null);
          return;
        }

        const { x, y, width, height } = detections.detection.box;
        const padding = width * 0.4;

        const canvas = document.createElement('canvas');
        canvas.width = width + padding * 2;
        canvas.height = height + padding * 2;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            img,
            x - padding,
            y - padding,
            width + padding * 2,
            height + padding * 2,
            0,
            0,
            canvas.width,
            canvas.height
          );
          const faceDataURL = canvas.toDataURL('image/png');
          resolve(faceDataURL);
        } else {
          resolve(null);
        }
      };
    });
  }

  /** Detect if both eyes are closed using EAR (Eye Aspect Ratio) */
  areEyesClosed(landmarks: faceapi.FaceLandmarks68): boolean {
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();

    function eyeOpenness(eye: faceapi.Point[]): number {
      const verticalDist1 = Math.abs(eye[1].y - eye[5].y);
      const verticalDist2 = Math.abs(eye[2].y - eye[4].y);
      const horizontalDist = Math.abs(eye[3].x - eye[0].x);
      return (verticalDist1 + verticalDist2) / (2.0 * horizontalDist);
    }

    const leftEyeOpen = eyeOpenness(leftEye);
    const rightEyeOpen = eyeOpenness(rightEye);

    console.log("🟡 Left Eye EAR:", leftEyeOpen.toFixed(3));
    console.log("🟡 Right Eye EAR:", rightEyeOpen.toFixed(3));

    const closedEyeThreshold = 0.265;

    const eyesClosed = leftEyeOpen < closedEyeThreshold && rightEyeOpen < closedEyeThreshold;

    if (eyesClosed) {
      console.log("⚠️ Eyes are considered CLOSED");
    } else {
      console.log("✅ Eyes are OPEN");
    }

    return eyesClosed;
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

    /** Extracts Birthdate (YYMMDD) */
extractBirthdate(text: string): string | null {
  const match = text.match(/\b(\d{6})\d[M|F]/); // Extract date before 'M'
  return match ? this.formatDate(match[1]) : null;
}

/** Extracts Expiry Date (YYMMDD) */
extractExpiryDate(text: string): string | null {
  const match = text.match(/\d[M|F](\d{6})/); // Extract date after 'M'
  return match ? this.formatDate(match[1]) : null;
}

/** Converts YYMMDD to DD.MM.YYYY */
formatDate(yyMMdd: string): string {
  const year = parseInt(yyMMdd.substring(0, 2), 10);
  const month = yyMMdd.substring(2, 4);
  const day = yyMMdd.substring(4, 6);

  const fullYear = year > 50 ? 1900 + year : 2000 + year; // Handles 20th and 21st century

  return `${fullYear}-${month}-${day}`;
}


onSubmit() {
  const formData = new FormData();


  // Required fields
  const requiredFields = [
    this.form.identityNumber,
    this.form.cardNumber,
    this.form.expiryDate,
    this.form.birthdate,
    this.form.familyName,
    this.form.givenName,
    this.form.frontImage,

  ];

  // Check if any field is empty
  if (requiredFields.some(field => !field || field === '')) {
    alert('⚠️ All fields are required. Please fill in all fields before submitting.');
    return;
  }

  // Append fields after validation
  formData.append('identityNumber', this.form.identityNumber);
  formData.append('cardNumber', this.form.cardNumber);
  formData.append('expiryDate', this.form.expiryDate);
  formData.append('birthdate', this.form.birthdate);
  formData.append('familyName', this.form.familyName);
  formData.append('givenName', this.form.givenName);
  formData.append('document_type', this.selectedDocumentType);



  // Convert extracted faces from Base64 to Blob and append to FormData
  if (this.frontFace) {
    const frontFaceBlob = this.dataURLtoBlob(this.frontFace);
    formData.append('frontFace', frontFaceBlob, 'frontFace.png');
  }

  if (this.selfieFace) {
    const selfieFaceBlob = this.dataURLtoBlob(this.selfieFace);
    formData.append('selfieFace', selfieFaceBlob, 'selfieFace.png');
  }

  // Submit the form only if all fields are filled
  this.http.post('http://localhost:5000/save-id-card', formData).subscribe(
    response => {
      console.log('✅ Data saved:', response);
      alert('ID card saved successfully!');
    },
    error => {
      console.error('❌ Error saving data:', error);
      alert('Failed to save ID card');
    }
  );
}


    // Utility function to convert Base64 to Blob
    dataURLtoBlob(dataURL: string): Blob {
      const byteString = atob(dataURL.split(',')[1]);
      const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const intArray = new Uint8Array(arrayBuffer);

      for (let i = 0; i < byteString.length; i++) {
        intArray[i] = byteString.charCodeAt(i);
      }

      return new Blob([arrayBuffer], { type: mimeString });
    }






}






