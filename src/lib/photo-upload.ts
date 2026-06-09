import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { compressImage, generateThumbnail } from '@/lib/photo-compression';

interface UploadResult {
  url: string;
  thumbnailUrl: string;
  storagePath: string;
}

export async function uploadPhoto(
  file: File,
  storagePath: string,
): Promise<UploadResult> {
  const [compressed, thumbnail] = await Promise.all([
    compressImage(file),
    generateThumbnail(file),
  ]);

  const fullRef = ref(storage, storagePath);
  const thumbRef = ref(storage, storagePath.replace(/(\.\w+)?$/, '_thumb.jpg'));

  await Promise.all([
    uploadBytes(fullRef, compressed, { contentType: 'image/jpeg' }),
    uploadBytes(thumbRef, thumbnail, { contentType: 'image/jpeg' }),
  ]);

  const [url, thumbnailUrl] = await Promise.all([
    getDownloadURL(fullRef),
    getDownloadURL(thumbRef),
  ]);

  return { url, thumbnailUrl, storagePath };
}
