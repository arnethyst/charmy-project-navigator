'use server';

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export async function uploadImage(formData: FormData) {
    const file = formData.get('file') as File;
    if (!file) {
        throw new Error('No file uploaded');
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // unique filename
    const filename = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    const uploadDir = join(process.cwd(), 'public', 'uploads');

    try {
        await mkdir(uploadDir, { recursive: true });
        await writeFile(join(uploadDir, filename), buffer);
        return `/uploads/${filename}`;
    } catch (error) {
        console.error('Upload error:', error);
        throw new Error('Failed to save file');
    }
}
