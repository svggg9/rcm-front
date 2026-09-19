const fs = require('node:fs');
const path = require('node:path');
const sharp = require('/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const base = __dirname;
async function main() {
  const variants = JSON.parse(fs.readFileSync(path.join(base, 'manifest.json'), 'utf8'));
  for (const {slug} of variants) {
    const source = path.join(base, 'favicon', `favicon-${slug}.svg`);
    const entries = [];
    for (const size of [16,32]) {
      const png = await sharp(source, {density:384}).resize(size,size).png().toBuffer();
      fs.writeFileSync(path.join(base,'favicon',`favicon-${slug}-${size}.png`),png);
      entries.push({size,png});
    }
    const header = Buffer.alloc(6 + 16*entries.length);
    header.writeUInt16LE(1,2);
    header.writeUInt16LE(entries.length,4);
    let offset = header.length;
    entries.forEach(({size,png},index)=>{
      const start=6+16*index;
      header[start]=size; header[start+1]=size;
      header.writeUInt16LE(1,start+4); header.writeUInt16LE(32,start+6);
      header.writeUInt32LE(png.length,start+8); header.writeUInt32LE(offset,start+12);
      offset+=png.length;
    });
    fs.writeFileSync(path.join(base,'favicon',`favicon-${slug}.ico`),Buffer.concat([header,...entries.map(x=>x.png)]));
  }
  console.log('Built 12 PNGs and 6 ICOs');
}
main().catch(error=>{console.error(error);process.exit(1)});
