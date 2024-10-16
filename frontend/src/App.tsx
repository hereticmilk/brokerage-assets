import { useState, useEffect } from 'react';
import { ThemeProvider } from '@/components/theme-provider';
import { ModeToggle } from '@/components/mode-toggle';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/hooks/use-toast';
import { Cat, Languages, Loader2, Zap } from 'lucide-react';
import { Download } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Currency {
  code: string;
  name: string;
  icon: string;
}

interface Crypto {
  symbol: string;
  name: string;
  color: string;
}

interface SvgObject {
  name: string;
  svg: string;
  pngBase64: string;
}

interface Brand {
  name: string;
}

// Add this new interface
interface IconSize {
  value: string;
  label: string;
}

function App() {
  const [loading, setLoading] = useState(false);
  const [forexCountry1, setForexCountry1] = useState('');
  const [forexCountry2, setForexCountry2] = useState('');
  const [cryptoSymbol, setCryptoSymbol] = useState('');
  const [forexResults, setForexResults] = useState<SvgObject[]>([]);
  const [cryptoResults, setCryptoResults] = useState<SvgObject[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [cryptos, setCryptos] = useState<Crypto[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<string>('Default');
  const { toast } = useToast();

  // Add these new state variables
  const [originalSize, setOriginalSize] = useState<string>("100x100");
  const [otcSize, setOtcSize] = useState<string>("100x100");
  const [leveragedSize, setLeveragedSize] = useState<string>("100x100");

  useEffect(() => {
    fetchCurrencies('');
    fetchCryptos('');
    fetchBrands();
  }, []);

  const fetchCurrencies = async (query: string) => {
    try {
      console.log('Fetching currencies with query:', query);
      const response = await fetch(`/api/search-currencies?q=${query}`);
      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);
        throw new Error('Failed to fetch currencies');
      }
      const data = await response.json();
      console.log('Received currency data:', data);
      setCurrencies(data);
    } catch (error) {
      console.error('Error fetching currencies:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch currencies. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const fetchCryptos = async (query: string) => {
    try {
      console.log('Fetching cryptos with query:', query);
      const response = await fetch(`/api/search-cryptos?q=${query}`);
      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);
        throw new Error('Failed to fetch cryptos');
      }
      const data = await response.json();
      console.log('Received crypto data:', data);
      setCryptos(data);
    } catch (error) {
      console.error('Error fetching cryptos:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch cryptocurrencies. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const fetchBrands = async () => {
    try {
      const response = await fetch('/api/brands');
      if (!response.ok) {
        throw new Error('Failed to fetch brands');
      }
      const data = await response.json();
      setBrands(data);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch brands. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleGenerate = async (type: 'forex' | 'crypto') => {
    if (type === 'forex' && (!forexCountry1 || !forexCountry2)) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter both base and quote currencies.',
        variant: 'destructive',
      });
      return;
    }

    if (type === 'crypto' && !cryptoSymbol) {
      toast({
        title: 'Invalid Input',
        description: 'Please enter a cryptocurrency symbol.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      let response;
      if (type === 'forex') {
        console.log('Generating forex with:', { currency1: forexCountry1, currency2: forexCountry2, brand: selectedBrand });
        response = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currency1: forexCountry1,
            currency2: forexCountry2,
            brand: selectedBrand
          })
        });
      } else {
        const symbol = cryptoSymbol.split(' ')[0];
        console.log('Generating crypto with:', { symbol, brand: selectedBrand });
        response = await fetch('/api/generate-crypto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol,
            brand: selectedBrand
          })
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to generate ${type} assets`);
      }

      const data: SvgObject[] = await response.json();
      if (type === 'forex') {
        setForexResults(data);
      } else {
        setCryptoResults(data);
      }

      toast({
        title: 'Assets Generated',
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} assets have been generated successfully.`,
      });
    } catch (error) {
      console.error(`Error generating ${type} assets:`, error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to generate ${type} assets. Please try again.`,
        variant: 'destructive',
      });
      // Clear the results if there's an error
      if (type === 'forex') {
        setForexResults([]);
      } else {
        setCryptoResults([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const iconSizes: IconSize[] = [
    { value: "56x56", label: "56x56" },
    { value: "100x100", label: "100x100" },
  ];

  const renderResults = (results: SvgObject[]) => {
    if (results.length === 0) return null;

    const handleDownload = (data: string, fileName: string, type: 'svg' | 'png') => {
      let blob;
      if (type === 'svg') {
        blob = new Blob([data], { type: 'image/svg+xml' });
      } else if (type === 'png') {
        const byteCharacters = atob(data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        blob = new Blob([byteArray], { type: 'image/png' });
      }

      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    };

    const getIconByTypeAndSize = (type: string, size: string) => {
      return results.find(item => item.name.includes(type) && item.name.includes(size));
    };

    const createSvgDataUrl = (svgContent: string) => {
      const encodedSvg = encodeURIComponent(svgContent);
      return `data:image/svg+xml,${encodedSvg}`;
    };

    const renderCard = (type: string, size: string, setSize: React.Dispatch<React.SetStateAction<string>>) => {
      const icon = getIconByTypeAndSize(type, size);
      if (!icon) return null;

      return (
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>{type}</CardTitle>
            <CardDescription>
              <Select 
                value={size} 
                onValueChange={setSize} 
                disabled={type === "OTC" || type === "LEVERAGED"}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {iconSizes.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow flex flex-col items-center justify-center">
            <div className="w-32 h-32 mb-4 flex items-center justify-center">
              <img 
                src={createSvgDataUrl(icon.svg)} 
                alt={icon.name}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => handleDownload(icon.svg, `${icon.name}.svg`, 'svg')}
                variant="outline"
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                SVG
              </Button>
              <Button
                onClick={() => handleDownload(icon.pngBase64, `${icon.name}.png`, 'png')}
                variant="outline"
                size="sm"
              >
                <Download className="mr-2 h-4 w-4" />
                PNG
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    };

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {renderCard("Original", originalSize, setOriginalSize)}
        {renderCard("OTC", otcSize, setOtcSize)}
        {renderCard("LEVERAGED", leveragedSize, setLeveragedSize)}
      </div>
    );
  };

  const handleCurrencySelect = (event: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
    const value = event.target.value;
    const code = value.split(' ')[0];
    setter(code);
  };

  const handleCryptoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setCryptoSymbol(value); // Store the full value, including name
  };

  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <header className="border-b">
          <div className="container mx-auto flex items-center justify-between py-4 px-4 sm:px-6 lg:px-8">
            <div>
              <h1 className="text-2xl font-bold">Brokerage Graphical Assets</h1>
              <p className="text-sm text-muted-foreground">Made with <Cat className="inline-block w-4 h-4 text-red-500" /> by <a href="https://www.linkedin.com/in/tretiukhin/" target="_blank" rel="noopener noreferrer" className="text hover:underline">Artur Tretiukhin</a></p>
            </div>
            <div className="flex items-center space-x-2">
              <Select onValueChange={setSelectedBrand} defaultValue={selectedBrand}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select brand" />
                </SelectTrigger>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.name} value={brand.name}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon">
                <Languages className="h-4 w-4" />
              </Button>
              <ModeToggle />
            </div>
          </div>
        </header>
        <main className="flex-grow flex items-center justify-center">
          <div className="container mx-auto py-8 px-4 sm:px-6 lg:px-8 max-w-4xl">
            <Tabs defaultValue="forex" className="space-y-4">
              <TabsList>
                <TabsTrigger value="forex">Forex</TabsTrigger>
                <TabsTrigger value="crypto">Crypto</TabsTrigger>
                <TabsTrigger value="stocks" disabled>Stocks</TabsTrigger>
              </TabsList>
              <TabsContent value="forex" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Generate Forex Pair Icons</CardTitle>
                    <CardDescription>Create icons for forex currency pairs.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex space-x-2">
                      <Input
                        placeholder="Currency (e.g., USD or US Dollar)"
                        value={forexCountry1}
                        onChange={(e) => {
                          handleCurrencySelect(e, setForexCountry1);
                          fetchCurrencies(e.target.value);
                        }}
                        list="currencies1"
                      />
                      <Input
                        placeholder="Currency (e.g., EUR or Euro)"
                        value={forexCountry2}
                        onChange={(e) => {
                          handleCurrencySelect(e, setForexCountry2);
                          fetchCurrencies(e.target.value);
                        }}
                        list="currencies2"
                      />
                    </div>
                    <datalist id="currencies1">
                      {currencies.map((currency) => (
                        <option key={currency.code} value={`${currency.code} ${currency.name}`} />
                      ))}
                    </datalist>
                    <datalist id="currencies2">
                      {currencies.map((currency) => (
                        <option key={currency.code} value={`${currency.code} ${currency.name}`} />
                      ))}
                    </datalist>
                    <Button onClick={() => handleGenerate('forex')} disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                      Generate
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Generated Assets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                      {forexResults.length > 0 ? (
                        renderResults(forexResults)
                      ) : (
                        <p className="text-sm text-muted-foreground">Generated icons will appear here.</p>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="crypto" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Generate Crypto Icons</CardTitle>
                    <CardDescription>Create icons for cryptocurrencies.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      placeholder="Cryptocurrency (e.g., BTC or Bitcoin)"
                      value={cryptoSymbol}
                      onChange={(e) => {
                        handleCryptoSelect(e);
                        fetchCryptos(e.target.value);
                      }}
                      list="cryptos"
                    />
                    <datalist id="cryptos">
                      {cryptos.map((crypto) => (
                        <option key={crypto.symbol} value={`${crypto.symbol} ${crypto.name}`} />
                      ))}
                    </datalist>
                    <Button onClick={() => handleGenerate('crypto')} disabled={loading}>
                      {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                      Generate
                    </Button>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Generated Assets</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] w-full rounded-md border p-4">
                      {cryptoResults.length > 0 ? (
                        renderResults(cryptoResults)
                      ) : (
                        <p className="text-sm text-muted-foreground">Generated icons will appear here.</p>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="stocks">
                {/* Content for Stocks tab will be added here in the future */}
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
