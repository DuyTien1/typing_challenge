import type { Request, Response } from 'express';

// Bảo đảm định danh môi trường Vercel Serverless
process.env.VERCEL = process.env.VERCEL || '1';

import app, { app as namedApp } from '../server';

const expressApp = namedApp || app;

export default function handler(req: Request, res: Response) {
  // Đảm bảo URL luôn có tiền tố /api để khớp chuẩn xác với các route Express trên Vercel Serverless
  if (req.url && !req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }
  return (expressApp as any)(req, res);
}
