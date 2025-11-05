import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url';

class MetadataExtractor {
  constructor() {
    // MINIMAL blocked domains - only truly malicious sites
    this.blockedDomains = [
      'malicious-site.com',
      'phishing-site.net'
      // Add ONLY specific malicious domains, not broad patterns
    ];
  }

  // Main method to extract metadata from a given URL
  async extractMetadata(url) {
    console.log(`🔍 Starting metadata extraction for: ${url}`);
    
    try {
      // Step 1: URL normalization - clean and validate the input URL
      const normalizedUrl = this.normalizeUrl(url);
      console.log(`✅ Normalized URL: ${normalizedUrl}`);

      // Step 2: Quick safety check - ensure URL is safe to process
      await this.quickSafetyCheck(normalizedUrl);
      console.log(`✅ Safety check passed`);

      // Step 3: Attempt to fetch the website
      console.log(`🌐 Fetching website content...`);
      const response = await axios.get(normalizedUrl, {
        timeout: 10000, // 10 second timeout to avoid hanging requests
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AgencyMetadataBot/1.0; +https://yourdomain.com)'
        },
        validateStatus: function (status) {
          // Accept any status code - we'll handle errors manually
          return true;
        }
      });

      console.log(`📡 Response status: ${response.status}`);

      // Check for HTTP errors (400+ status codes)
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${this.getStatusText(response.status)}`);
      }

      // Check if we got HTML content (not PDF, image, etc.)
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        throw new Error(`Expected HTML but got: ${contentType}`);
      }

      console.log(`✅ Successfully fetched HTML content`);
      
      // Load HTML into cheerio for DOM parsing
      const $ = cheerio.load(response.data);
      
      // Extract metadata into structured object
      const metadata = {
        url: normalizedUrl,
        title: $('title').text()?.trim() || '', // Page title
        favicon: this.extractFavicon($, normalizedUrl), // Site favicon
        logo: this.extractLogo($, normalizedUrl), // Website logo
        ogImage: this.extractOgImage($, normalizedUrl), // Open Graph image
        twitterImage: this.extractTwitterImage($, normalizedUrl), // Twitter card image
        largeIcon: this.extractLargeIcon($, normalizedUrl), // Large app icons
        displayImage: null,  // Will be set to best available image
        colors: this.extractColors($), // Color scheme from CSS
        fonts: this.extractFonts($), // Font families used
        description: $('meta[name="description"]').attr('content')?.trim() || '', // Meta description
        keywords: $('meta[name="keywords"]').attr('content')?.trim() || '', // Meta keywords
        viewport: $('meta[name="viewport"]').attr('content') || '', // Viewport meta tag
        ogTitle: $('meta[property="og:title"]').attr('content')?.trim() || '', // Open Graph title
        ogDescription: $('meta[property="og:description"]').attr('content')?.trim() || '', // Open Graph description
      };

      // Determine the best display image from available options
      metadata.displayImage = this.getBestDisplayImage(metadata);

      console.log(`✅ Successfully extracted metadata:`, {
        title: metadata.title,
        description: metadata.description ? metadata.description.substring(0, 50) + '...' : 'None',
        hasLogo: !!metadata.logo,
        hasColors: metadata.colors.length > 0
      });

      return {
        success: true,
        metadata
      };

    } catch (error) {
      console.error(`❌ Metadata extraction failed:`, {
        url: url,
        error: error.message,
        code: error.code,
        responseStatus: error.response?.status,
        responseHeaders: error.response?.headers
      });

      // Provide helpful error messages based on error type
      let userFriendlyError = this.getUserFriendlyError(error);
      
      return {
        success: false,
        error: userFriendlyError
      };
    }
  }

  // Select the best available image for display purposes
  getBestDisplayImage(metadata) {
    const imagePriority = [
      metadata.logo,        // Actual website logo
      metadata.ogImage,     // Open Graph image (usually high quality)
      metadata.twitterImage, // Twitter image
      metadata.largeIcon,   // Large icon
      metadata.favicon      // Regular favicon (last resort)
    ];

    // Return the first good quality image found in priority order
    for (const imageUrl of imagePriority) {
      if (imageUrl && this.isLikelyGoodImage(imageUrl)) {
        console.log(`✅ Selected display image: ${imageUrl}`);
        return imageUrl;
      }
    }

    console.log(`❌ No suitable display image found`);
    return null;
  }

  // Determine if an image URL is likely to be good quality for display
  isLikelyGoodImage(url) {
    if (!url) return false;
    
    // Skip SVG for now (can be complex to handle)
    if (url.toLowerCase().endsWith('.svg')) {
      console.log(`🔄 Skipping SVG image: ${url}`);
      return false;
    }
    
    // Skip very small favicons (usually 16x16 pixels)
    if (url.includes('favicon.ico')) {
      console.log(`🔄 Skipping default favicon.ico`);
      return false;
    }
    
    // Prefer images that look like they could be logos or proper images
    const goodIndicators = [
      'logo', 'brand', 'og-image', 'twitter-image', 
      'apple-touch', 'icon-192', 'icon-512'
    ];
    
    const urlLower = url.toLowerCase();
    const isGood = goodIndicators.some(indicator => urlLower.includes(indicator)) ||
           // Or accept if it doesn't look like a tiny favicon
           (!urlLower.includes('favicon') && !urlLower.endsWith('.ico'));
    
    console.log(`🔍 Image quality check for ${url}: ${isGood ? 'GOOD' : 'POOR'}`);
    return isGood;
  }

  // Extract numeric size value from "sizes" attribute (e.g., "192x192" -> 192)
  getIconSizeValue(sizes) {
    if (!sizes) return 0;
    // Handle "WxH" format (e.g "192x192")
    const sizeMatch = sizes.match(/(\d+)x(\d+)/);
    if (sizeMatch) {
      return Math.max(parseInt(sizeMatch[1]), parseInt(sizeMatch[2]));
    }
    
    // Handle single size values (e.g "192")
    const singleSizeMatch = sizes.match(/(\d+)/);
    if (singleSizeMatch) {
      return parseInt(singleSizeMatch[1]);
    }
    
    return 0;
  }

  // Normalize and validate URL format
  normalizeUrl(url) {
    console.log(`🔄 Normalizing URL: ${url}`);
    
    try {
      // Add protocol if missing (default to HTTPS)
      if (!url.startsWith('http')) {
        url = 'https://' + url;
        console.log(`🔧 Added HTTPS protocol: ${url}`);
      }

      const urlObj = new URL(url);
      
      // Validate hostname
      if (!urlObj.hostname) {
        throw new Error('Invalid URL: No hostname found');
      }

      // Basic domain validation (must have at least domain.TLD)
      const domainParts = urlObj.hostname.split('.');
      if (domainParts.length < 2) {
        throw new Error('Invalid domain format');
      }

      console.log(`✅ URL normalized: ${urlObj.toString()}`);
      return urlObj.toString();
      
    } catch (error) {
      console.error(`❌ URL normalization failed: ${error.message}`);
      throw new Error(`Invalid URL: ${error.message}`);
    }
  }

  // Comprehensive safety check for URLs
  async quickSafetyCheck(url) {
    console.log(`🛡️ Running safety check for: ${url}`);
    
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;

    console.log(`🔍 Checking hostname: ${hostname}`);
    console.log(`📋 Blocked domains: ${this.blockedDomains}`);

    // 1. Check against explicitly blocked domains
    if (this.blockedDomains.includes(hostname)) {
      console.log(`❌ Domain explicitly blocked: ${hostname}`);
      throw new Error('This domain is blocked for security reasons');
    }
    console.log(`✅ Domain not in blocked list`);

    // 2. Check for dangerous file extensions in path (not domain)
    const dangerousPatterns = [
      /\.(exe|zip|rar|jar|dmg|pkg|scr|bat|cmd)$/i,
    ];

    const pathname = urlObj.pathname.toLowerCase();
    console.log(`🔍 Checking pathname: ${pathname}`);

    for (const pattern of dangerousPatterns) {
      if (pattern.test(pathname)) {
        console.log(`❌ Dangerous file pattern detected: ${pattern}`);
        throw new Error('URL points to a potentially dangerous file type');
      }
    }
    console.log(`✅ No dangerous file patterns found`);

    // 3. Check for localhost/internal IPs (basic check)
    if (hostname === 'localhost' || hostname.startsWith('127.') || hostname.startsWith('192.168.')) {
      console.log(`❌ Local/internal IP blocked: ${hostname}`);
      throw new Error('Local/internal URLs are not allowed');
    }
    console.log(`✅ Not a local/internal URL`);

    // 4. Check for dangerous TLDs/extensions in domain
    const dangerousTLDs = ['exe', 'bat', 'cmd', 'scr', 'pif', 'msi']; // Removed 'com' as it's legitimate
    const domainExt = hostname.split('.').pop().toLowerCase();
    
    if (dangerousTLDs.includes(domainExt)) {
      console.log(`❌ Dangerous domain extension: ${domainExt}`);
      throw new Error('Domain uses a potentially dangerous extension');
    }
    console.log(`✅ Domain extension is safe`);

    console.log(`✅ All safety checks passed`);
    return true;
  }

  getUserFriendlyError(error) {
    const message = error.message.toLowerCase();
    
    if (error.code === 'ENOTFOUND') {
      return 'Website not found. Please check the URL and try again.';
    } else if (error.code === 'ECONNREFUSED') {
      return 'Connection refused. The website might be down or blocking requests.';
    } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      return 'Request timeout. The website might be slow or experiencing high traffic.';
    } else if (error.response) {
      // HTTP error responses
      switch (error.response.status) {
        case 403:
          return 'Access forbidden. The website is blocking automated requests.';
        case 404:
          return 'Page not found. Please check the URL.';
        case 429:
          return 'Too many requests. Please wait a moment and try again.';
        case 500:
        case 502:
        case 503:
          return 'Website server error. Please try again later.';
        default:
          return `Website returned error: ${error.response.status}`;
      }
    } else if (message.includes('blocked')) {
      return 'This website was blocked for security reasons.';
    } else if (message.includes('invalid url')) {
      return 'Invalid URL format. Please check the website address.';
    } else if (message.includes('dangerous')) {
      return 'This website was blocked for security reasons.';
    } else {
      return `Unable to extract data: ${error.message}`;
    }
  }

  getStatusText(statusCode) {
    const statusTexts = {
      400: 'Bad Request',
      401: 'Unauthorized', 
      403: 'Forbidden',
      404: 'Not Found',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable'
    };
    return statusTexts[statusCode] || 'Unknown Error';
  }

  // Extract website logo using various CSS selector patterns
  extractLogo($, baseUrl) {
    const logoSelectors = [
      '.logo img',
      '[class*="logo"] img', // Any class containing "logo"
      '.header-logo img',
      '.site-logo img',
      '.brand-logo img',
      'header img:first-child', // First image in header
      'nav img:first-child', // First image in navigation
      '.navbar img',
      '.header img',
      '#logo img',
      '.brand img'
    ];

    for (const selector of logoSelectors) {
      const logoImg = $(selector).first();
      if (logoImg.length) {
        const src = logoImg.attr('src');
        if (src) {
          const resolvedUrl = this.resolveUrl(src, baseUrl);
          console.log(`✅ Found logo via ${selector}: ${resolvedUrl}`);
          return resolvedUrl;
        }
      }
    }

    // Also check for SVG logos
    const svgSelectors = [
      '.logo svg',
      '[class*="logo"] svg',
      '.brand svg'
    ];

    for (const selector of svgSelectors) {
      const logoSvg = $(selector).first();
      if (logoSvg.length) {
        // For SVG, we might want to extract the SVG content or look for an image version
        console.log(`Found SVG logo via ${selector}`);
        // Could return SVG data or look for alternative image versions
      }
    }

    return null;
  }

  extractOgImage($, baseUrl) {
    const ogImage = $('meta[property="og:image"]').attr('content') ||
                   $('meta[name="og:image"]').attr('content');
    
    if (ogImage) {
      const resolvedUrl = this.resolveUrl(ogImage, baseUrl);
      console.log('Found Open Graph image:', resolvedUrl);
      return resolvedUrl;
    }
    return null;
  }

  extractTwitterImage($, baseUrl) {
    const twitterImage = $('meta[name="twitter:image"]').attr('content') ||
                        $('meta[property="twitter:image"]').attr('content') ||
                        $('meta[name="twitter:image:src"]').attr('content');
    
    if (twitterImage) {
      const resolvedUrl = this.resolveUrl(twitterImage, baseUrl);
      console.log('Found Twitter image:', resolvedUrl);
      return resolvedUrl;
    }
    return null;
  }

  extractLargeIcon($, baseUrl) {
    const icons = [];
    
    // Apple touch icons (usually larger and high quality)
    $('link[rel="apple-touch-icon"]').each((i, elem) => {
      const href = $(elem).attr('href');
      const sizes = $(elem).attr('sizes');
      if (href) {
        icons.push({
          url: this.resolveUrl(href, baseUrl),
          sizes: sizes || '180x180',
          priority: 1
        });
      }
    });

    // Manifest icons
    $('link[rel="manifest"]').each(async (i, elem) => {
      const href = $(elem).attr('href');
      if (href) {
        try {
          const manifestUrl = this.resolveUrl(href, baseUrl);
          console.log('Found web app manifest:', manifestUrl);
        } catch (error) {
          console.log('Could not fetch manifest:', error.message);
        }
      }
    });

    // Larger favicon sizes
    $('link[rel="icon"][sizes]').each((i, elem) => {
      const href = $(elem).attr('href');
      const sizes = $(elem).attr('sizes');
      if (href && sizes) {
        const sizeValue = this.getIconSizeValue(sizes);
        if (sizeValue >= 32) {
          icons.push({
            url: this.resolveUrl(href, baseUrl),
            sizes: sizes,
            priority: sizeValue >= 192 ? 2 : 3
          });
        }
      }
    });

    if (icons.length > 0) {
      const bestIcon = icons.sort((a, b) => {
        if (a.priority !== b.priority) {
          return a.priority - b.priority;
        }
        return this.getIconSizeValue(b.sizes) - this.getIconSizeValue(a.sizes);
      })[0];
      
      console.log('Selected large icon:', bestIcon.url, `(${bestIcon.sizes})`);
      return bestIcon.url;
    }
    console.log(`❌ No large icon found`);
    return null;
  }

  extractFavicon($, baseUrl) {
    const faviconSelectors = [
      'link[rel="icon"]',
      'link[rel="shortcut icon"]',
      'link[rel="apple-touch-icon-precomposed"]'
    ];

    for (const selector of faviconSelectors) {
      const favicon = $(selector).attr('href');
      if (favicon) {
        const resolvedUrl = this.resolveUrl(favicon, baseUrl);
        console.log(`✅ Found favicon via ${selector}: ${resolvedUrl}`);
        return resolvedUrl;
      }
    }

    // Try default favicon location
    try {
      const defaultFavicon = this.resolveUrl('/favicon.ico', baseUrl);
      console.log(`🔄 Trying default favicon: ${defaultFavicon}`);
      return defaultFavicon;
    } catch (error) {
      console.log(`❌ No favicon found`);
      return null;
    }
  }

  resolveUrl(path, baseUrl) {
    if (!path) return null;
    
    try {
      if (path.startsWith('//')) {
        return 'https:' + path;
      } else if (path.startsWith('/')) {
        const urlObj = new URL(baseUrl);
        return `${urlObj.protocol}//${urlObj.hostname}${path}`;
      } else if (!path.startsWith('http')) {
        return new URL(path, baseUrl).href;
      }
      return path;
    } catch (error) {
      console.error(`❌ Error resolving URL: ${error.message} for path: ${path}`);
      return null;
    }
  }

  extractColors($) {
    const colors = new Set();
    
    $('style').each((i, elem) => {
      const styleContent = $(elem).html();
      this.extractColorsFromText(styleContent, colors);
    });
    
    $('[style]').each((i, elem) => {
      const style = $(elem).attr('style');
      this.extractColorsFromText(style, colors);
    });
    
    const themeColor = $('meta[name="theme-color"]').attr('content');
    if (themeColor) {
      colors.add(themeColor.toLowerCase());
    }
    
    return Array.from(colors).slice(0, 8);
  }

  extractColorsFromText(text, colorsSet) {
    if (!text) return;
    
    const colorRegex = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/g;
    const matches = text.match(colorRegex) || [];
    
    matches.forEach(color => {
      if (color.startsWith('#')) {
        if (color.length === 4) {
          color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }
      }
      colorsSet.add(color.toLowerCase());
    });
  }

  extractFonts($) {
    const fonts = new Set();
    
    $('link[rel="stylesheet"]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && (href.includes('fonts.googleapis.com') || href.includes('font'))) {
        fonts.add(href);
      }
    });
    
    $('style, [style]').each((i, elem) => {
      const styleContent = $(elem).attr('style') || $(elem).html() || '';
      const fontMatches = styleContent.match(/font-family:\s*([^;]+)/gi) || [];
      
      fontMatches.forEach(match => {
        const fontFamily = match.split(':')[1]?.trim().replace(/['"]/g, '');
        if (fontFamily) {
          fontFamily.split(',').forEach(font => {
            const cleanFont = font.trim();
            if (cleanFont && !cleanFont.includes('&')) {
              fonts.add(cleanFont);
            }
          });
        }
      });
    });
    
    return Array.from(fonts).slice(0, 5);
  }
}

export default new MetadataExtractor();