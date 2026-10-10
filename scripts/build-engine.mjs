import { spawnSync } from 'node:child_process';
import { mkdir, copyFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
const root=resolve(import.meta.dirname,'..');
const local=resolve(root,'.tools/go/bin',process.platform==='win32'?'go.exe':'go');
let go=process.env.GO_BINARY || 'go';
try {await access(local);go=local;} catch {}
const run=(args,extra={})=>{
 const result=spawnSync(go,args,{cwd:resolve(root,'engine'),env:{...process.env,...extra},encoding:'utf8'});
 if(result.error || result.status!==0) throw new Error(result.error?.message || result.stderr || result.stdout);
 return result.stdout.trim();
};
await mkdir(resolve(root,'vendor'),{recursive:true});
run(['test','./...']);
run(['build','-trimpath','-ldflags=-s -w','-o',resolve(root,'vendor/universe.wasm'),'.'],{GOOS:'js',GOARCH:'wasm'});
await copyFile(resolve(run(['env','GOROOT']),'lib/wasm/wasm_exec.js'),resolve(root,'vendor/wasm_exec.js'));
await copyFile(resolve(run(['env','GOROOT']),'LICENSE'),resolve(root,'vendor/Go-LICENSE.txt'));
console.log('Go physics and discovery engine tested and compiled to WebAssembly.');
