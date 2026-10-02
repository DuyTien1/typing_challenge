import type { Request, Response } from 'express';
import app from '../server';

export default function handler(req: Request, res: Response) {
  // Đảm bảo URL luôn có tiền tố /api để khớp chuẩn xác với các route Express trên Vercel Serverless
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return (app as any)(req, res);
}
