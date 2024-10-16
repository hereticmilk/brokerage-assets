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
const currencies = forexData.currencies.map(currency => {
  const [code, details] = Object.entries(currency)[0];
  return { code, name: details.Name, icon: details.Icon };
});

// Load crypto data
const cryptoData = yaml.load(fs.readFileSync(join(__dirname, '../src/data/crypto.yaml'), 'utf8'));
const cryptos = cryptoData.cryptocurrencies.map(crypto => {
  const [symbol, details] = Object.entries(crypto)[0];
  return { symbol, name: details.Name, color: details.Color };
});

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

export default app;
