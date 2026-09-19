const fs = require('node:fs');
const path = require('node:path');
const sharp = require('/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const dest=__dirname;
const source=path.join(dest,'..','rcmarket-wordmark-v1');
const files={
  'svg/rcmarket-03-unbounded-black.svg':'wordmark-black.svg',
  'svg/rcmarket-03-unbounded-white.svg':'wordmark-white.svg',
  'favicon/favicon-03-unbounded.svg':'favicon.svg',
  'favicon/favicon-03-unbounded.ico':'favicon.ico',
  'favicon/favicon-03-unbounded-16.png':'favicon-16.png',
  'favicon/favicon-03-unbounded-32.png':'favicon-32.png',
  'fonts/unbounded-OFL.txt':'OFL-Unbounded.txt'
};
async function main(){
  for(const [from,to] of Object.entries(files)) fs.copyFileSync(path.join(source,from),path.join(dest,to));
  for(const [name,size] of [['apple-touch-icon.png',180],['icon-192.png',192],['icon-512.png',512]]){
    await sharp(path.join(dest,'favicon.svg'),{density:1536}).resize(size,size).removeAlpha().png().toFile(path.join(dest,name));
  }
  const svg=fs.readFileSync(path.join(dest,'wordmark-white.svg'),'utf8');
  const preview=fs.readFileSync(path.join(dest,'header.template.html'),'utf8').replace('{{WORDMARK_WHITE}}','data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64'));
  if(preview.includes('{{WORDMARK_WHITE}}')) throw new Error('Unresolved image');
  fs.writeFileSync('/Users/admin/.codex/visualizations/2026/09/07/01a07cbe-290a-7531-b916-5a6ee63943f1/rcmarket-approved-header.html',preview);
  fs.writeFileSync(path.join(dest,'brand.json'),JSON.stringify({name:'рцмаркет',selectedVariant:'03-unbounded',fontBasis:'Unbounded 500',selectedAt:'2026-09-08',implementationStatus:'asset-package-only',wordmark:{black:'wordmark-black.svg',white:'wordmark-white.svg'},favicon:{svg:'favicon.svg',ico:'favicon.ico',png16:'favicon-16.png',png32:'favicon-32.png'},touchIcon:'apple-touch-icon.png',optionalPwaIcons:['icon-192.png','icon-512.png']},null,2)+'\n');
  console.log('Selected variant 03 packaged without altering its outlines');
}
main().catch(error=>{console.error(error);process.exit(1)});
