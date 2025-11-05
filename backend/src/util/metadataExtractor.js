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

  async extractMetadata(url) {
    console.log(`🔍 Starting metadata extraction for: ${url}`);
    
    try {
      // Step 1: URL normalization
      const normalizedUrl = this.normalizeUrl(url);
      console.log(`✅ Normalized URL: ${normalizedUrl}`);

      // Step 2: Quick safety check
      await this.quickSafetyCheck(normalizedUrl);
      console.log(`✅ Safety check passed`);

      // Step 3: Attempt to fetch the website
      console.log(`🌐 Fetching website content...`);
      const response = await axios.get(normalizedUrl, {
        timeout: 10000, // 10 second timeout
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AgencyMetadataBot/1.0; +https://yourdomain.com)'
        },
        validateStatus: function (status) {
          // Accept any status code - we'll handle errors manually
          return true;
        }
      });

      console.log(`📡 Response status: ${response.status}`);

      // Check for HTTP errors
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${this.getStatusText(response.status)}`);
      }

      // Check if we got HTML content
      const contentType = response.headers['content-type'] || '';
      if (!contentType.includes('text/html')) {
        throw new Error(`Expected HTML but got: ${contentType}`);
      }

      console.log(`✅ Successfully fetched HTML content`);
      
      const $ = cheerio.load(response.data);
      
      // Extract metadata
      const metadata = {
        url: normalizedUrl,
        title: $('title').text()?.trim() || '',
        favicon: this.extractFavicon($, normalizedUrl),
        logo: this.extractLogo($, normalizedUrl),
        ogImage: this.extractOgImage($, normalizedUrl),
        twitterImage: this.extractTwitterImage($, normalizedUrl),
        largeIcon: this.extractLargeIcon($, normalizedUrl),
        displayImage: null,
        colors: this.extractColors($),
        fonts: this.extractFonts($),
        description: $('meta[name="description"]').attr('content')?.trim() || '',
        keywords: $('meta[name="keywords"]').attr('content')?.trim() || '',
        viewport: $('meta[name="viewport"]').attr('content') || '',
        ogTitle: $('meta[property="og:title"]').attr('content')?.trim() || '',
        ogDescription: $('meta[property="og:description"]').attr('content')?.trim() || '',
      };

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

    getBestDisplayImage(metadata) {
    const imagePriority = [
      metadata.logo,        // Actual website logo
      metadata.ogImage,     // Open Graph image (usually high quality)
      metadata.twitterImage, // Twitter image
      metadata.largeIcon,   // Large icon
      metadata.favicon      // Regular favicon (last resort)
    ];

    for (const imageUrl of imagePriority) {
      if (imageUrl && this.isLikelyGoodImage(imageUrl)) {
        console.log(`✅ Selected display image: ${imageUrl}`);
        return imageUrl;
      }
    }

    console.log(`❌ No suitable display image found`);
    return null;
  }

  // ✅ ADD THIS MISSING METHOD:
  isLikelyGoodImage(url) {
    if (!url) return false;
    
    // Skip SVG for now (can be complex to handle)
    if (url.toLowerCase().endsWith('.svg')) {
      console.log(`🔄 Skipping SVG image: ${url}`);
      return false;
    }
    
    // Skip very small favicons
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

  getIconSizeValue(sizes) {
    if (!sizes) return 0;
    const sizeMatch = sizes.match(/(\d+)x(\d+)/);
    if (sizeMatch) {
      return Math.max(parseInt(sizeMatch[1]), parseInt(sizeMatch[2]));
    }
    
    // Handle single size values
    const singleSizeMatch = sizes.match(/(\d+)/);
    if (singleSizeMatch) {
      return parseInt(singleSizeMatch[1]);
    }
    
    return 0;
  }

  normalizeUrl(url) {
    console.log(`🔄 Normalizing URL: ${url}`);
    
    try {
      // Add protocol if missing
      if (!url.startsWith('http')) {
        url = 'https://' + url;
        console.log(`🔧 Added HTTPS protocol: ${url}`);
      }

      const urlObj = new URL(url);
      
      // Validate hostname
      if (!urlObj.hostname) {
        throw new Error('Invalid URL: No hostname found');
      }

      // Basic domain validation
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
      /\.(exe|zip|rar|jar|dmg|pkg|scr|bat|cmd)$/i, // Removed .com from patterns
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


  extractLogo($, baseUrl) {
    const logoSelectors = [
      '.logo img',
      '[class*="logo"] img',
      '.header-logo img',
      '.site-logo img',
      '.brand-logo img',
      'header img:first-child',
      'nav img:first-child',
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

  // NEW: Extract Open Graph image (usually high quality)
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

  // NEW: Extract Twitter image
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

  // NEW: Extract the largest available icon
  extractLargeIcon($, baseUrl) {
    const icons = [];
    
    // Apple touch icons (usually larger and high quality)
    $('link[rel="apple-touch-icon"]').each((i, elem) => {
      const href = $(elem).attr('href');
      const sizes = $(elem).attr('sizes');
      if (href) {
        icons.push({
          url: this.resolveUrl(href, baseUrl),
          sizes: sizes || '180x180', // Default Apple touch icon size
          priority: 1 // High priority - these are usually good quality
        });
      }
    });

    // Manifest icons
    $('link[rel="manifest"]').each(async (i, elem) => {
      const href = $(elem).attr('href');
      if (href) {
        try {
          const manifestUrl = this.resolveUrl(href, baseUrl);
          // Could fetch and parse web manifest for more icons
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
        if (sizeValue >= 32) { // Only consider icons 32px or larger
          icons.push({
            url: this.resolveUrl(href, baseUrl),
            sizes: sizes,
            priority: sizeValue >= 192 ? 2 : 3 // Higher priority for larger icons
          });
        }
      }
    });

    // Sort by priority and size, then return the best one
    if (icons.length > 0) {
      const bestIcon = icons.sort((a, b) => {
        // First by priority, then by size
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