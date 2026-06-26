import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const filename = resolvedParams.filename;

    if (!filename) {
      return new NextResponse('Filename missing', { status: 400 });
    }

    const filePath = path.join(process.cwd(), 'public', 'uploads', filename);

    try {
      const fileBuffer = await fs.readFile(filePath);
      
      // Determine content type based on extension
      const ext = path.extname(filename).toLowerCase();
      let contentType = 'application/octet-stream';
      
      if (ext === '.jpg' || ext === '.jpeg') {
        contentType = 'image/jpeg';
      } else if (ext === '.png') {
        contentType = 'image/png';
      } else if (ext === '.gif') {
        contentType = 'image/gif';
      } else if (ext === '.svg') {
        contentType = 'image/svg+xml';
      } else if (ext === '.webp') {
        contentType = 'image/webp';
      } else if (ext === '.pdf') {
        contentType = 'application/pdf';
      } else if (ext === '.doc') {
        contentType = 'application/msword';
      } else if (ext === '.docx') {
        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (ext === '.xls') {
        contentType = 'application/vnd.ms-excel';
      } else if (ext === '.xlsx') {
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      }

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    } catch (e) {
      console.error(`File not found: ${filePath}`, e);
      return new NextResponse('File not found', { status: 404 });
    }
  } catch (error) {
    console.error('Serve uploads route error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
