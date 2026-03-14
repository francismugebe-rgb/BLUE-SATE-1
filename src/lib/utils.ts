import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

export function validateFile(file: File, type: 'image' | 'video'): { valid: boolean; error?: string } {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  
  if (type === 'image') {
    if (!isImage) return { valid: false, error: 'Please upload an image file (PNG, JPEG)' };
    if (file.size > 2 * 1024 * 1024) return { valid: false, error: 'Image size must be less than 2MB' };
  } else {
    if (!isVideo) return { valid: false, error: 'Please upload a video file (MP4)' };
    if (file.size > 5 * 1024 * 1024) return { valid: false, error: 'Video size must be less than 5MB' };
  }
  
  return { valid: true };
}

export function formatTime(date: string | Date) {
  const d = new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}
