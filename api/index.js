import express from 'express';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import Fuse from 'fuse.js';
import cors from 'cors';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());

// Load forex data
const forexPath = path.join(__dirname, '..', 'src', 'data', 'forex.yaml');
const forexData = yaml.load(fs.readFileSync(forexPath, 'utf8'));
const currencies = forexData.currencies.map(currency => {
  const [code, details] = Object.entries(currency)[0];
  return { code, name: details.Name, icon: details.Icon };
});

// Load crypto data from manifest.json
const manifestPath = path.join(__dirname, '..', 'node_modules', 'cryptocurrency-icons', 'manifest.json');
const cryptoData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const cryptos = cryptoData.map(crypto => ({
  symbol: crypto.symbol,
  name: crypto.name,
  color: crypto.color
}));

// Setup Fuse for search
const fuseOptions = {
  includeScore: true,
  threshold: 0.3,
  keys: ['code', 'name']
};
const currencyFuse = new Fuse(currencies, fuseOptions);

const cryptoFuseOptions = {
  ...fuseOptions,
  keys: ['symbol', 'name']
};
const cryptoFuse = new Fuse(cryptos, cryptoFuseOptions);

app.get('/api/search-currencies', (req, res) => {
  const { query } = req.query;
  const results = query ? currencyFuse.search(query) : currencies;
  res.json(results.map(result => result.item || result));
});

app.get('/api/search-cryptos', (req, res) => {
  const { query } = req.query;
  const results = query ? cryptoFuse.search(query) : cryptos;
  res.json(results.map(result => result.item || result));
});

// Add these routes to handle asset generation
app.post('/api/generate', async (req, res) => {
  console.log('Received generation request:', req.body);
  // Implementation for generating forex assets
});

app.post('/api/generate-crypto', async (req, res) => {
  console.log('Received generation request:', req.body);
  // Implementation for generating crypto assets
});

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));

export default app;
