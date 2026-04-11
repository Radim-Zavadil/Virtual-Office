import fs from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';

// Manual .env loading for the script
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = Object.fromEntries(
  envContent.split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const [key, ...value] = line.split('=');
      return [key.trim(), value.join('=').trim().replace(/^"(.*)"$/, '$1')];
    })
);

const redis = new Redis({
  url: envVars.KV_REST_API_URL,
  token: envVars.KV_REST_API_TOKEN,
});

async function migrate() {
  const dataDir = path.join(process.cwd(), 'data');
  const files = fs.readdirSync(dataDir);

  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile() && file.endsWith('.json')) {
      const key = file.replace('.json', '');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      let redisKey = key;
      if (key === 'map') redisKey = 'map:default';
      
      console.log(`Migrating ${file} to key: ${redisKey}`);
      await redis.set(redisKey, data);
    } else if (stats.isDirectory() && file === 'maps') {
      const mapFiles = fs.readdirSync(filePath);
      for (const mapFile of mapFiles) {
        if (mapFile.endsWith('.json')) {
          const mapId = mapFile.replace('.json', '');
          const data = JSON.parse(fs.readFileSync(path.join(filePath, mapFile), 'utf8'));
          const redisKey = `map:${mapId}`;
          console.log(`Migrating map ${mapFile} to key: ${redisKey}`);
          await redis.set(redisKey, data);
        }
      }
    }
  }

  console.log('Migration completed successfully!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
