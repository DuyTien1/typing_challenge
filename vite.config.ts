import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
    allowedHosts: [
      'typing-challenge-plh0.onrender.com', // Tên miền cụ thể
      // hoặc dùng '.onrender.com' (cho phép mọi subdomain của render)
      // hoặc dùng true (cho phép tất cả các host)
    ],
  },
  // Nếu bạn đang chạy lệnh "vite preview" trên Render thì thêm cả khối preview này:
  preview: {
    allowedHosts: [
      'typing-challenge-plh0.onrender.com',
      // hoặc true
    ]
  }
  };
});
