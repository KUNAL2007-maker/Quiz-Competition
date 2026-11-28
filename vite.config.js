import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({mode})=>{
  Object.assign(process.env,loadEnv(mode,process.cwd(),''));
  return {cacheDir:'.local/vite-cache',plugins:[react(),{name:'local-api',configureServer(server){
    server.middlewares.use('/api',async(req,res)=>{const {default:handle}=await import('./server/handler.js');await handle(req,res)});
  }}]};
});
