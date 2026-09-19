// Upload only the approved batch. Credentials stay in memory and curl stdin.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const sharp = require('/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');

const hash = (data) => crypto.createHash('sha256').update(data).digest('hex');

async function main() {
  const draft = JSON.parse(fs.readFileSync(path.join(__dirname, 'products.json'), 'utf8'));
  const apply = process.argv.includes('--apply');
  const configText = fs.readFileSync('/Users/admin/IdeaProjects/rcm/src/main/resources/application-local.yml', 'utf8');
  const section = configText.match(/^s3:\s*\n((?:[ \t]+[^\n]*\n|\s*\n)*)/m)?.[1];
  if (!section) throw new Error('Storage configuration not found');
  const config = Object.fromEntries([...section.matchAll(/^\s+([\w-]+):\s*(.+)$/gm)].map(match => [match[1], match[2].trim()]));
  if (config.endpoint !== 'https://storage.yandexcloud.net' || config.bucket !== 'rcm' || !config['access-key'] || !config['secret-key']) {
    throw new Error('Unexpected storage destination or missing credentials');
  }
  const products = [];
  const unique = new Set();
  for (const [productIndex, product] of draft.products.entries()) {
    const variants = [];
    for (const [variantIndex, variant] of product.variants.entries()) {
      const images = [];
      for (const [imageIndex, source] of variant.images.entries()) {
        const bytes = fs.readFileSync(source);
        if (bytes.length > 8 * 1024 * 1024 || bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
          throw new Error('Invalid or oversized image in approved batch');
        }
        const metadata = await sharp(bytes).metadata();
        if (metadata.format !== 'webp' || !metadata.width || !metadata.height) throw new Error('Image cannot be decoded');
        const sha256 = hash(bytes);
        if (unique.has(sha256)) throw new Error('Duplicate image in approved batch');
        unique.add(sha256);
        const key = `products/rcm-demo-20260908/${product.draftId}/${variantIndex + 1}-${imageIndex + 1}-${sha256.slice(0, 16)}.webp`;
        images.push({ source, key, url: `${config.endpoint}/${config.bucket}/${key}`, sha256, bytes: bytes.length, width: metadata.width, height: metadata.height });
      }
      variants.push({ ...variant, images });
    }
    products.push({ ...product, publicId: `dm090${productIndex + 1}`, article: `RCM-DEMO-20260908-${productIndex + 1}`, variants });
  }
  if (products.length !== 5 || unique.size !== 15) throw new Error('Unexpected approved batch size');

  for (const product of products) {
    for (const variant of product.variants) {
      for (const image of variant.images) {
        if (!apply) continue;
        const existing = await fetch(image.url, { signal: AbortSignal.timeout(15000) });
        if (existing.ok) {
          if (hash(Buffer.from(await existing.arrayBuffer())) !== image.sha256) throw new Error('Existing object differs; will not overwrite');
          continue;
        }
        if (existing.status !== 404) throw new Error(`Storage preflight returned HTTP ${existing.status}`);
        const curlConfig = [
          `url = ${JSON.stringify(image.url)}`,
          `aws-sigv4 = ${JSON.stringify(`aws:amz:${config.region}:s3`)}`,
          `user = ${JSON.stringify(`${config['access-key']}:${config['secret-key']}`)}`,
          `upload-file = ${JSON.stringify(image.source)}`,
          'header = "Content-Type: image/webp"',
          `header = "x-amz-content-sha256: ${image.sha256}"`,
          'header = "If-None-Match: *"',
          'connect-timeout = 10',
          'max-time = 45',
        ].join('\n');
        const uploaded = spawnSync('curl', ['--config', '-', '--silent', '--show-error', '--output', '/dev/null', '--write-out', '%{http_code}'], { input: curlConfig, encoding: 'utf8' });
        if (uploaded.status !== 0 || uploaded.stdout !== '200') throw new Error(`Image upload failed (HTTP ${uploaded.stdout || 'unavailable'})`);
        const verified = await fetch(image.url, { signal: AbortSignal.timeout(15000) });
        if (!verified.ok || hash(Buffer.from(await verified.arrayBuffer())) !== image.sha256) throw new Error('Uploaded image verification failed');
        process.stderr.write(`Verified image: ${product.draftId}, ${variant.color}, ${variant.images.indexOf(image) + 1}\n`);
      }
    }
  }
  console.log(JSON.stringify({ batch: 'rcm-demo-20260908', status: apply ? 'images_uploaded_and_verified' : 'plan_only', databaseHost: '66.151.35.76', database: 'rcmarket', sellerUsername: 'seed_seller_ip', products }, null, 2));
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
