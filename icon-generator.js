import fs from 'fs';
import path from 'path';
import https from 'https';
import express from 'express';
import bodyParser from 'body-parser';
import Fuse from 'fuse.js';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';
import { DOMParser } from 'xmldom';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility functions
const utils = {
  fetchSVG: (url) => {
    return new Promise((resolve, reject) => {
      https.get(url, (response) => {
        let data = '';
        response.on('data', (chunk) => data += chunk);
        response.on('end', () => resolve(data));
      }).on('error', reject);
    });
  },

  readLocalSVG: (filePath) => fs.readFileSync(filePath, 'utf8'),

  generateColorFromString: (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = '000000';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    return color.slice(6);
  }
};

// Data initialization
const dataInit = {
  cryptoIconsData: (() => {
    const manifestPath = path.join(__dirname, 'node_modules', 'cryptocurrency-icons', 'manifest.json');
    const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    console.log('Crypto manifest:', data);
    console.log('First few items in cryptoIconsData:', data.slice(0, 5));
    return data;
  })(),

  fetchForexData: () => {
    const forexPath = path.join(__dirname, 'src', 'data', 'forex.yaml');
    const forexContent = fs.readFileSync(forexPath, 'utf8');
    const forexData = yaml.load(forexContent);
    
    const currenciesArray = forexData.currencies.map(currency => {
      const [code, details] = Object.entries(currency)[0];
      return {
        code,
        name: details.Name,
        icon: details.Icon,
        countries: details.Countries || []
      };
    });

    console.log('Fetched forex data:', currenciesArray.slice(0, 5));
    return currenciesArray;
  },

  fetchCryptoData: () => {
    const cryptoPath = path.join(__dirname, 'src', 'data', 'crypto.yaml');
    const cryptoContent = fs.readFileSync(cryptoPath, 'utf8');
    const cryptoData = yaml.load(cryptoContent);
    
    const cryptoArray = cryptoData.cryptocurrencies.map(crypto => {
      const [symbol, details] = Object.entries(crypto)[0];
      return {
        symbol,
        name: details.Name,
        icon: details.Icon
      };
    });

    console.log('Fetched crypto data:', cryptoArray.slice(0, 5));
    return cryptoArray;
  },

  fetchBrands: () => {
    const brandsPath = path.join(__dirname, 'src', 'data', 'brands.yaml');
    const brandsContent = fs.readFileSync(brandsPath, 'utf8');
    const brandsData = yaml.load(brandsContent);
    return brandsData.brands.map(brand => ({ name: brand }));
  }
};

// Fuse.js initialization
const fuseInit = {
  cryptoFuseOptions: {
    keys: [
      { name: 'symbol', weight: 0.7 },
      { name: 'name', weight: 0.3 },
    ],
    includeScore: true,
    includeMatches: true,
    threshold: 0.3,
    minMatchCharLength: 1,
  },

  countryFuseOptions: {
    keys: ['code', 'name', 'countries'],
    threshold: 0.3,
    minMatchCharLength: 1
  }
};

// SVG generation functions
const svgGenerator = {
  combineFlagsSVG: async (country1, country2, size = 56) => {
    const flag1Url = `https://hatscripts.github.io/circle-flags/flags/${country1}.svg`;
    const flag2Url = `https://hatscripts.github.io/circle-flags/flags/${country2}.svg`;

    const [flag1Content, flag2Content] = await Promise.all([
      utils.fetchSVG(flag1Url),
      utils.fetchSVG(flag2Url)
    ]);

    const flagSize = size === 56 ? 38 : 66;
    const circleCenter = flagSize / 2;
    const circleRadius = circleCenter - 0.5;
    const secondFlagOffset = size === 56 ? 18 : 34;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <defs>
          <clipPath id="circleClip">
            <circle cx="${circleCenter}" cy="${circleCenter}" r="${circleRadius}" />
          </clipPath>
        </defs>
        <g transform="translate(0,0)">
          <g clip-path="url(#circleClip)">
            <svg width="${flagSize}" height="${flagSize}" viewBox="0 0 512 512">
              ${flag1Content.replace(/<svg[^>]*>|<\/svg>/g, '')}
            </svg>
          </g>
          <circle cx="${circleCenter}" cy="${circleCenter}" r="${circleRadius}" fill="none" stroke="#EAEAEA" stroke-width="1" />
        </g>
        <g transform="translate(${secondFlagOffset},${secondFlagOffset})">
          <g clip-path="url(#circleClip)">
            <svg width="${flagSize}" height="${flagSize}" viewBox="0 0 512 512">
              ${flag2Content.replace(/<svg[^>]*>|<\/svg>/g, '')}
            </svg>
          </g>
          <circle cx="${circleCenter}" cy="${circleCenter}" r="${circleRadius}" fill="none" stroke="#EAEAEA" stroke-width="1" />
        </g>
      </svg>
    `.trim();
  },

  combineFlagsWithBadgeSVG: async (country1, country2, badgeName, brand = 'Default', size = 100) => {
    const flag1Url = `https://hatscripts.github.io/circle-flags/flags/${country1}.svg`;
    const flag2Url = `https://hatscripts.github.io/circle-flags/flags/${country2}.svg`;
    const badgePath = path.join(__dirname, 'src', 'badges', brand, `${badgeName}.svg`);

    const [flag1Content, flag2Content, badgeContent] = await Promise.all([
      utils.fetchSVG(flag1Url),
      utils.fetchSVG(flag2Url),
      utils.readLocalSVG(badgePath)
    ]);

    const flagSize = size === 56 ? 38 : 66;
    const circleCenter = flagSize / 2;
    const circleRadius = circleCenter - 0.5;

    // Extract width and height from the badge SVG
    const badgeSVG = new DOMParser().parseFromString(badgeContent, 'image/svg+xml');
    const badgeWidth = parseInt(badgeSVG.documentElement.getAttribute('width') || '0');
    const badgeHeight = parseInt(badgeSVG.documentElement.getAttribute('height') || '0');

    // Calculate position to place badge in lower left corner
    const badgeX = 0;
    const badgeY = 100 - badgeHeight;

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
        <defs>
          <clipPath id="circleClip">
            <circle cx="${circleCenter}" cy="${circleCenter}" r="${circleRadius}" />
          </clipPath>
        </defs>
        <g transform="translate(0,0)">
          <g clip-path="url(#circleClip)">
            <svg width="${flagSize}" height="${flagSize}" viewBox="0 0 512 512">
              ${flag1Content.replace(/<svg[^>]*>|<\/svg>/g, '')}
            </svg>
          </g>
          <circle cx="${circleCenter}" cy="${circleCenter}" r="${circleRadius}" fill="none" stroke="#EAEAEA" stroke-width="1" />
        </g>
        <g transform="translate(34,34)">
          <g clip-path="url(#circleClip)">
            <svg width="${flagSize}" height="${flagSize}" viewBox="0 0 512 512">
              ${flag2Content.replace(/<svg[^>]*>|<\/svg>/g, '')}
            </svg>
          </g>
          <circle cx="${circleCenter}" cy="${circleCenter}" r="${circleRadius}" fill="none" stroke="#EAEAEA" stroke-width="1" />
        </g>
        <g transform="translate(${badgeX},${badgeY})">
          <svg width="${badgeWidth}" height="${badgeHeight}">
            ${badgeContent.replace(/<svg[^>]*>|<\/svg>/g, '')}
          </svg>
        </g>
      </svg>
    `.trim();
  },

  createCryptoIcon: async (symbol, size = 100, variant = null, brand = 'Default') => {
    console.log(`Creating crypto icon for symbol: ${symbol}`);
    const crypto = dataInit.cryptoIconsData.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());
    console.log(`Found crypto data:`, crypto);

    let svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    `;

    if (crypto) {
      const iconPath = path.join(__dirname, 'node_modules', 'cryptocurrency-icons', 'svg', 'color', `${crypto.symbol.toLowerCase()}.svg`);
      console.log(`Attempting to read icon from: ${iconPath}`);
      if (fs.existsSync(iconPath)) {
        const iconContent = fs.readFileSync(iconPath, 'utf8');
        console.log(`Icon content for ${symbol}:`, iconContent);

        // Remove XML declaration if present
        const cleanIconContent = iconContent.replace(/<\?xml[^>]*\?>\s*/, '');

        // Extract the inner content of the SVG
        const match = cleanIconContent.match(/<svg[^>]*>([\s\S]*?)<\/svg\s*>/im);
        if (match && match[1]) {
          const iconSvg = match[1];
          const scale = size === 56 ? 1.75 : 3.125;
          svgContent += `
            <g transform="translate(0, 0) scale(${scale})">
              ${iconSvg}
            </g>
          `;
        } else {
          console.log(`Could not extract SVG content for ${symbol}`);
          svgContent += svgGenerator.getFallbackIcon(symbol, size);
        }
      } else {
        console.log(`Icon file not found for ${symbol}`);
        svgContent += svgGenerator.getFallbackIcon(symbol, size);
      }
    } else {
      console.log(`No crypto data found for ${symbol}`);
      svgContent += svgGenerator.getFallbackIcon(symbol, size);
    }

    if (variant) {
      const badgePath = path.join(__dirname, 'src', 'badges', brand, `${variant}.svg`);
      const badgeContent = fs.readFileSync(badgePath, 'utf8');
      
      // Extract width and height from the badge SVG
      const badgeSVG = new DOMParser().parseFromString(badgeContent, 'image/svg+xml');
      const badgeWidth = parseInt(badgeSVG.documentElement.getAttribute('width') || '0');
      const badgeHeight = parseInt(badgeSVG.documentElement.getAttribute('height') || '0');

      // Calculate position to place badge in lower left corner
      const badgeX = 0;
      const badgeY = size - badgeHeight;

      svgContent += `
        <g transform="translate(${badgeX},${badgeY})">
          <svg width="${badgeWidth}" height="${badgeHeight}">
            ${badgeContent.replace(/<svg[^>]*>|<\/svg>/g, '')}
          </svg>
        </g>
      `;
    }

    svgContent += '</svg>';
    console.log(`Generated SVG content for ${symbol}:`, svgContent);
    return svgContent.trim();
  },

  getFallbackIcon: (symbol, size = 100) => {
    const fallbackColor = `#${utils.generateColorFromString(symbol)}`;
    const fontSize = size === 56 ? 28 : 50;
    return `
      <rect width="${size}" height="${size}" fill="${fallbackColor}" />
      <text x="${size/2}" y="${size/2}" font-family="Arial, sans-serif" font-size="${fontSize}" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="#FFFFFF">
        ${symbol.charAt(0).toUpperCase()}
      </text>
    `;
  }
};

// File operations
const fileOps = {
  generateCombinedFlagSVGs: async (country1, country2, brand = 'Default') => {
    const versions = [
      { name: 'Original_56x56', svg: await svgGenerator.combineFlagsSVG(country1, country2, 56), width: 56, height: 56 },
      { name: 'Original_100x100', svg: await svgGenerator.combineFlagsSVG(country1, country2, 100), width: 100, height: 100 },
      { name: 'OTC_56x56', svg: await svgGenerator.combineFlagsWithBadgeSVG(country1, country2, 'OTC', brand, 56), width: 56, height: 56 },
      { name: 'OTC_100x100', svg: await svgGenerator.combineFlagsWithBadgeSVG(country1, country2, 'OTC', brand, 100), width: 100, height: 100 },
      { name: 'LEVERAGED_56x56', svg: await svgGenerator.combineFlagsWithBadgeSVG(country1, country2, 'LEVERAGED', brand, 56), width: 56, height: 56 },
      { name: 'LEVERAGED_100x100', svg: await svgGenerator.combineFlagsWithBadgeSVG(country1, country2, 'LEVERAGED', brand, 100), width: 100, height: 100 }
    ];

    const results = [];
    for (const version of versions) {
      const svgBuffer = Buffer.from(version.svg);
      const pngBuffer = await fileOps.convertSvgToPng(svgBuffer, version.width, version.height);
      const pngBase64 = pngBuffer.toString('base64');
      results.push({
        name: version.name,
        svg: version.svg,
        pngBase64: pngBase64,
      });
    }

    return results;
  },

  generateCryptoIcons: async (symbol, brand = 'Default') => {
    const versions = [
      { name: 'Original_56x56', svg: await svgGenerator.createCryptoIcon(symbol, 56), width: 56, height: 56 },
      { name: 'Original_100x100', svg: await svgGenerator.createCryptoIcon(symbol, 100), width: 100, height: 100 },
      { name: 'OTC_56x56', svg: await svgGenerator.createCryptoIcon(symbol, 56, 'OTC', brand), width: 56, height: 56 },
      { name: 'OTC_100x100', svg: await svgGenerator.createCryptoIcon(symbol, 100, 'OTC', brand), width: 100, height: 100 },
      { name: 'LEVERAGED_56x56', svg: await svgGenerator.createCryptoIcon(symbol, 56, 'LEVERAGED', brand), width: 56, height: 56 },
      { name: 'LEVERAGED_100x100', svg: await svgGenerator.createCryptoIcon(symbol, 100, 'LEVERAGED', brand), width: 100, height: 100 }
    ];

    const results = [];
    for (const version of versions) {
      const svgBuffer = Buffer.from(version.svg);
      const pngBuffer = await fileOps.convertSvgToPng(svgBuffer, version.width, version.height);
      const pngBase64 = pngBuffer.toString('base64');
      results.push({
        name: version.name,
        svg: version.svg,
        pngBase64: pngBase64,
      });
    }

    return results;
  },

  convertSvgToPng: async (svgBuffer, width, height) => {
    return sharp(svgBuffer)
      .resize(width, height)
      .png()
      .toBuffer();
  }
};

// Search functions
const search = {
  searchCryptos: (query) => {
    console.log('Searching for crypto:', query);
    if (!query) {
      return [];
    }
    console.log('Crypto array:', cryptoArray); // Add this line to check the contents of cryptoArray
    const results = cryptoFuse.search(query);
    console.log('Fuse search results:', results);
    return results.slice(0, 5).map(result => ({
      symbol: result.item.symbol,
      name: result.item.name,
      icon: result.item.icon,
    }));
  }
};

// Express app setup
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // Add this line near the top of your file, after creating the app

// Serve static files only in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend/dist')));
}

// Initialize data and Fuse instances
let currenciesArray = [];
let cryptoArray = [];
let currencyFuse, cryptoFuse;

(async () => {
  try {
    currenciesArray = dataInit.fetchForexData();
    cryptoArray = dataInit.fetchCryptoData();
    currencyFuse = new Fuse(currenciesArray, fuseInit.countryFuseOptions);
    cryptoFuse = new Fuse(cryptoArray, fuseInit.cryptoFuseOptions);
  } catch (error) {
    console.error('Error initializing data:', error);
  }
})();

// Routes
app.get('/api/search-currencies', (req, res) => {
  console.log('Received currency search request:', req.query);
  const query = req.query.q ? req.query.q.toLowerCase() : '';
  const results = currencyFuse.search(query);
  console.log('Currency search results:', results);

  const suggestions = results.slice(0, 5).map(result => ({
    code: result.item.code,
    name: result.item.name,
    icon: result.item.icon
  }));

  res.json(suggestions);
});

app.get('/api/search-cryptos', (req, res) => {
  console.log('Received crypto search request:', req.query);
  const query = req.query.q ? req.query.q.toLowerCase() : '';
  const results = cryptoFuse.search(query);
  console.log('Crypto search results:', results);

  const suggestions = results.slice(0, 5).map(result => ({
    symbol: result.item.symbol,
    name: result.item.name,
    icon: result.item.icon
  }));

  res.json(suggestions);
});

app.post('/api/generate', async (req, res) => {
  console.log('Received generate request:', req.body);
  try {
    const { currency1, currency2, brand = 'Default' } = req.body;

    if (!currency1 || !currency2) {
      throw new Error('Both currency codes are required');
    }

    const currency1Data = currenciesArray.find(c => c.code.toLowerCase() === currency1.toLowerCase());
    const currency2Data = currenciesArray.find(c => c.code.toLowerCase() === currency2.toLowerCase());

    if (!currency1Data || !currency2Data) {
      throw new Error('Invalid currency codes');
    }

    // Function to extract the country code from the icon URL
    const getCountryCode = (iconUrl) => {
      const match = iconUrl.match(/\/([a-z_]+)\.svg$/);
      return match ? match[1] : 'xx';
    };

    const country1 = getCountryCode(currency1Data.icon);
    const country2 = getCountryCode(currency2Data.icon);

    const svgObjects = await fileOps.generateCombinedFlagSVGs(country1, country2, brand);

    console.log('Sending generate response');
    res.json(svgObjects);
  } catch (error) {
    console.error('Error in generate:', error);
    res.status(400).json({ error: error.message || 'An error occurred while generating flags' });
  }
});

app.post('/api/generate-crypto', async (req, res) => {
  console.log('Received generate crypto request:', req.body);
  try {
    const { symbol, brand = 'Default' } = req.body;

    if (!symbol) {
      throw new Error('Cryptocurrency symbol is required');
    }

    console.log('Searching for crypto:', symbol);
    const cryptoData = cryptoArray.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());

    if (!cryptoData) {
      throw new Error(`Invalid cryptocurrency symbol: ${symbol}`);
    }

    const svgObjects = await fileOps.generateCryptoIcons(symbol, brand);

    console.log('Sending generate crypto response');
    res.json(svgObjects);
  } catch (error) {
    console.error('Error in generate crypto:', error);
    res.status(400).json({ error: error.message || 'An error occurred while generating crypto icons' });
  }
});

// Add this new route
app.get('/api/brands', (req, res) => {
  try {
    const brands = dataInit.fetchBrands();
    res.json(brands);
  } catch (error) {
    console.error('Error fetching brands:', error);
    res.status(500).json({ error: 'An error occurred while fetching brands' });
  }
});

// Start the server only if not in production (for local development)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3001; // Change this to 3001
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

export default app;
