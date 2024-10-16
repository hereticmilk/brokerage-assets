import express from 'express';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import yaml from 'js-yaml';
import Fuse from 'fuse.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(bodyParser.json());

// Load forex data
const forexData = yaml.load(fs.readFileSync(join(__dirname, '../src/data/forex.yaml'), 'utf8'));
const currencies = forexData.currencies.map(currency => Object.keys(currency)[0]);

// Load crypto data
const cryptoData = yaml.load(fs.readFileSync(join(__dirname, '../src/data/crypto.yaml'), 'utf8'));
const cryptos = cryptoData.cryptocurrencies.map(crypto => Object.keys(crypto)[0]);

// Setup Fuse for search
const fuseOptions = {
  includeScore: true,
  threshold: 0.3,
};
const currencyFuse = new Fuse(currencies, fuseOptions);
const cryptoFuse = new Fuse(cryptos, fuseOptions);

app.get('/api/search-currencies', (req, res) => {
  const { query } = req.query;
  const results = currencyFuse.search(query);
  res.json(results.map(result => result.item));
});

app.get('/api/search-cryptos', (req, res) => {
  const { query } = req.query;
  const results = cryptoFuse.search(query);
  res.json(results.map(result => result.item));
});

export default app;
