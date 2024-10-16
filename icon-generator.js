import fs from 'fs';
import path from 'path';
import https from 'https';
import express from 'express';
import bodyParser from 'body-parser';
import Fuse from 'fuse.js';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

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

  combineFlagsWithBadgeSVG: async (country1, country2, badgeName) => {
    const flag1Url = `https://hatscripts.github.io/circle-flags/flags/${country1}.svg`;
    const flag2Url = `https://hatscripts.github.io/circle-flags/flags/${country2}.svg`;
    const badgePath = path.join(__dirname, 'badges', `${badgeName}.svg`);

    const [flag1Content, flag2Content, badgeContent] = await Promise.all([
      utils.fetchSVG(flag1Url),
      utils.fetchSVG(flag2Url),
      utils.readLocalSVG(badgePath)
    ]);

    const flagSize = 66;
    const circleCenter = flagSize / 2;
    const circleRadius = circleCenter - 0.5;

    let badgeWidth, badgeHeight, badgeY;
    if (badgeName === 'OTC') {
      badgeWidth = 80;
      badgeHeight = 42;
      badgeY = 58;
    } else if (badgeName === 'LEVERAGED') {
      badgeWidth = 48;
      badgeHeight = 48;
      badgeY = 52;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">
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
        <g transform="translate(0,${badgeY})">
          <svg width="${badgeWidth}" height="${badgeHeight}">
            ${badgeContent.replace(/<svg[^>]*>|<\/svg>/g, '')}
          </svg>
        </g>
      </svg>
    `.trim();
  },

  createCryptoIcon: async (symbol, size = 100, variant = null) => {
    console.log(`Creating crypto icon for symbol: ${symbol}`);
    const crypto = dataInit.cryptoIconsData.find(c => c.symbol.toLowerCase() === symbol.toLowerCase());
    console.log(`Found crypto data:`, crypto);

    let svgContent = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
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
          svgContent += `
            <g transform="translate(0, 0) scale(3.125)">
              ${iconSvg}
            </g>
          `;
        } else {
          console.log(`Could not extract SVG content for ${symbol}`);
          svgContent += svgGenerator.getFallbackIcon(symbol);
        }
      } else {
        console.log(`Icon file not found for ${symbol}`);
        svgContent += svgGenerator.getFallbackIcon(symbol);
      }
    } else {
      console.log(`No crypto data found for ${symbol}`);
      svgContent += svgGenerator.getFallbackIcon(symbol);
    }

    if (variant) {
      const badgePath = path.join(__dirname, 'badges', `${variant}.svg`);
      const badgeContent = fs.readFileSync(badgePath, 'utf8');
      let badgeWidth, badgeHeight, badgeY;
      if (variant === 'OTC') {
        badgeWidth = 80;
        badgeHeight = 42;
        badgeY = 58;
      } else if (variant === 'LEVERAGED') {
        badgeWidth = 48;
        badgeHeight = 48;
        badgeY = 52;
      }
      svgContent += `
        <g transform="translate(0,${badgeY})">
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

  getFallbackIcon: (symbol) => {
    const fallbackColor = `#${utils.generateColorFromString(symbol)}`;
    return `
      <rect width="100" height="100" fill="${fallbackColor}" />
      <text x="50" y="50" font-family="Arial, sans-serif" font-size="50" font-weight="bold" text-anchor="middle" dominant-baseline="central" fill="#FFFFFF">
        ${symbol.charAt(0).toUpperCase()}
      </text>
    `;
  }
};

// File operations
const fileOps = {
  saveCombinedFlagSVGs: async (country1, country2) => {
    const outputDir = path.join(__dirname, 'output', `${country1}_${country2}`);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const versions = [
      { name: '56x56', svg: await svgGenerator.combineFlagsSVG(country1, country2, 56) },
      { name: '100x100', svg: await svgGenerator.combineFlagsSVG(country1, country2, 100) },
      { name: '100x100_OTC', svg: await svgGenerator.combineFlagsWithBadgeSVG(country1, country2, 'OTC') },
      { name: '100x100_LEVERAGED', svg: await svgGenerator.combineFlagsWithBadgeSVG(country1, country2, 'LEVERAGED') }
    ];

    for (const version of versions) {
      const outputFile = path.join(outputDir, `${country1}_${country2}_${version.name}.svg`);
      fs.writeFileSync(outputFile, version.svg);
    }
    
    console.log(`Combined flag SVGs saved to: ${outputDir}`);
  },

  saveCryptoIcon: async (symbol) => {
    const outputDir = path.join(__dirname, 'output', 'cryptos', symbol);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const versions = [
      { name: '100x100', svg: await svgGenerator.createCryptoIcon(symbol, 100) },
      { name: '100x100_OTC', svg: await svgGenerator.createCryptoIcon(symbol, 100, 'OTC') },
      { name: '100x100_LEVERAGED', svg: await svgGenerator.createCryptoIcon(symbol, 100, 'LEVERAGED') }
    ];

    for (const version of versions) {
      const outputFile = path.join(outputDir, `${symbol}_${version.name}.svg`);
      fs.writeFileSync(outputFile, version.svg);
    }
    
    console.log(`Crypto icon SVGs saved to: ${outputDir}`);
    return outputDir;
  }
};

// Search functions
const search = {
  searchCryptos: (query) => {
    console.log('Searching for crypto:', query);
    if (!query) {
      return [];
    }
    const results = cryptoFuse.search(query);
    console.log('Fuse search results:', results);
    return results.slice(0, 5).map(result => ({
      symbol: result.item.symbol,
      name: result.item.name,
      color: result.item.color,
      matches: result.matches,
    }));
  }
};

// Express app setup
const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files only in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, 'frontend/dist')));
}

app.use('/output', express.static(path.join(__dirname, 'output')));

// Initialize data and Fuse instances
let currenciesArray = [];
let currencyFuse, cryptoFuse;

(async () => {
  try {
    currenciesArray = dataInit.fetchForexData();
    currencyFuse = new Fuse(currenciesArray, fuseInit.countryFuseOptions);
    cryptoFuse = new Fuse(dataInit.cryptoIconsData, fuseInit.cryptoFuseOptions);
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
    color: result.item.color || utils.generateColorFromString(result.item.symbol)
  }));

  res.json(suggestions);
});

app.post('/api/generate', async (req, res) => {
  console.log('Received generate request:', req.body);
  try {
    const { currency1, currency2 } = req.body;
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

    await fileOps.saveCombinedFlagSVGs(country1, country2);
    
    const outputDir = path.join(__dirname, 'output', `${country1}_${country2}`);
    const files = fs.readdirSync(outputDir);
    
    let svgObjects = files.map(file => {
      const filePath = `/output/${country1}_${country2}/${file}`;
      const svgContent = fs.readFileSync(path.join(outputDir, file), 'utf8');
      return {
        name: file.replace(`${country1}_${country2}_`, '').replace('.svg', ''),
        svg: svgContent,
        downloadUrl: filePath
      };
    });
    
    console.log('Sending generate response');
    res.json(svgObjects);
  } catch (error) {
    console.error('Error in generate:', error);
    res.status(500).json({ error: 'An error occurred while generating flags' });
  }
});

app.post('/api/generate-crypto', async (req, res) => {
  console.log('Received generate crypto request:', req.body);
  try {
    const { symbol } = req.body;
    const outputDir = await fileOps.saveCryptoIcon(symbol);
    
    const files = fs.readdirSync(outputDir);
    
    let svgObjects = files.map(file => {
      const filePath = `/output/cryptos/${symbol}/${file}`;
      const svgContent = fs.readFileSync(path.join(outputDir, file), 'utf8');
      return {
        name: file.replace(`${symbol}_`, ''),
        svg: svgContent,
        downloadUrl: filePath
      };
    });
    
    console.log('Sending generate crypto response');
    res.json(svgObjects);
  } catch (error) {
    console.error('Error in generate crypto:', error);
    res.status(500).json({ error: 'An error occurred while generating crypto icons' });
  }
});

// Start the server only if not in production (for local development)
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;
