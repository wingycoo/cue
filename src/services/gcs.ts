import type { Note } from '../types';

/**
 * Direct GCS REST API Client using browser fetch and OAuth Access Token
 */

export async function uploadNoteToGCS(
  bucket: string,
  token: string,
  note: Note
): Promise<void> {
  const objectName = encodeURIComponent(`notes/${note.id}.json`);
  const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${objectName}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(note),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to upload note to GCS: ${res.status} ${errorText}`);
  }
}

export async function deleteNoteFromGCS(
  bucket: string,
  token: string,
  noteId: string
): Promise<void> {
  const objectName = encodeURIComponent(`notes/${noteId}.json`);
  const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${objectName}`;

  const res = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  // 404 is fine if object was already deleted
  if (!res.ok && res.status !== 404) {
    const errorText = await res.text();
    throw new Error(`Failed to delete note from GCS: ${res.status} ${errorText}`);
  }
}

export async function listNotesFromGCS(
  bucket: string,
  token: string
): Promise<Note[]> {
  const prefix = encodeURIComponent('notes/');
  const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=${prefix}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to list GCS objects: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  if (!data.items || !Array.isArray(data.items)) {
    return [];
  }

  // Fetch all note content concurrently
  const notesPromises = data.items
    .filter((item: any) => item.name.endsWith('.json'))
    .map(async (item: any) => {
      try {
        return await downloadNoteFromGCS(bucket, token, item.name);
      } catch (err) {
        console.warn(`Failed to fetch note ${item.name}:`, err);
        return null;
      }
    });

  const notes = await Promise.all(notesPromises);
  return notes.filter((n): n is Note => n !== null && !n.isDeleted);
}

export async function downloadNoteFromGCS(
  bucket: string,
  token: string,
  objectPath: string
): Promise<Note> {
  const encodedName = encodeURIComponent(objectPath);
  const url = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodedName}?alt=media`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to download note ${objectPath}`);
  }

  return await res.json();
}

/**
 * Uploads an image File/Blob to GCS and returns a downloadable/viewable URL or Object Key
 */
export async function uploadImageToGCS(
  bucket: string,
  token: string,
  file: File | Blob
): Promise<{ objectKey: string; publicUrl: string }> {
  const extension = file.type.split('/')[1] || 'png';
  const imageId = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const objectName = `images/${imageId}.${extension}`;
  const encodedName = encodeURIComponent(objectName);

  const url = `https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?uploadType=media&name=${encodedName}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': file.type || 'image/png',
    },
    body: file,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Failed to upload image to GCS: ${res.status} ${errorText}`);
  }

  const mediaUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodedName}?alt=media`;
  return {
    objectKey: objectName,
    publicUrl: mediaUrl,
  };
}

/**
 * Fetch image blob from GCS using Authorization token and create Object URL
 */
const imageBlobCache = new Map<string, string>();

export async function getGCSImageBlobUrl(
  bucket: string,
  token: string,
  imagePathOrUrl: string
): Promise<string> {
  if (imagePathOrUrl.startsWith('data:') || imagePathOrUrl.startsWith('blob:')) {
    return imagePathOrUrl;
  }

  if (imageBlobCache.has(imagePathOrUrl)) {
    return imageBlobCache.get(imagePathOrUrl)!;
  }

  let fetchUrl = imagePathOrUrl;
  if (!imagePathOrUrl.startsWith('http')) {
    const encodedName = encodeURIComponent(imagePathOrUrl);
    fetchUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodedName}?alt=media`;
  }

  const res = await fetch(fetchUrl, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    throw new Error('Failed to load GCS image blob');
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  imageBlobCache.set(imagePathOrUrl, blobUrl);
  return blobUrl;
}
