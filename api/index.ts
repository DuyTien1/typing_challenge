import type { Request, Response } from 'express';

// Bảo đảm định danh môi trường Vercel Serverless
process.env.VERCEL = process.env.VERCEL || '1';

// Import ứng dụng Express đã được đóng gói hoàn chỉnh sẵn sàng cho Production
// @ts-ignore - file dist/server.cjs được tạo tự động bởi lệnh build
import serverBundle from '../dist/server.cjs';

const expressApp = (serverBundle as any).app || (serverBundle as any).default || serverBundle;

export default async function handler(req: Request, res: Response) {
  try {
    // Đảm bảo URL luôn có tiền tố /api để khớp chuẩn xác với các route Express trên Vercel Serverless
    if (req.url && !req.url.startsWith('/api')) {
      req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
    }
    return expressApp(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Function] Exception in handler:', err);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: 'Lỗi thực thi Serverless Function.',
        message: err?.message || String(err),
      });
    }
  }
}
