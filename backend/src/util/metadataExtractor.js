import axios from 'axios';
import * as cheerio from 'cheerio';

class MetadataExtractor {
  async extractMetadata(url) {
    try {
      // Ensure URL has protocol
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }

      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AgencyMetadataBot/1.0)'
        }
      });
      
      const $ = cheerio.load(response.data);
      
      const metadata = {
        title: $('title').text()?.trim() || '',
        // Enhanced image extraction - multiple sources
        favicon: this.extractFavicon($, url),
        logo: this.extractLogo($, url),
        ogImage: this.extractOgImage($, url),
        twitterImage: this.extractTwitterImage($, url),
        largeIcon: this.extractLargeIcon($, url),
        // Get the best available image for display
        displayImage: null, // Will be set below
        // Your existing data
        colors: this.extractColors($),
        fonts: this.extractFonts($),
        description: $('meta[name="description"]').attr('content')?.trim() || '',
        keywords: $('meta[name="keywords"]').attr('content')?.trim() || '',
        viewport: $('meta[name="viewport"]').attr('content') || '',
        // Additional metadata
        ogTitle: $('meta[property="og:title"]').attr('content')?.trim() || '',
        ogDescription: $('meta[property="og:description"]').attr('content')?.trim() || ''
      };

      // Determine the best image to use for display
      metadata.displayImage = this.getBestDisplayImage(metadata);

      return metadata;
    } catch (error) {
      console.error('Metadata extraction error:', error.message);
      throw new Error(`Failed to extract metadata: ${error.message}`);
    }
  }

  // NEW: Extract logo images from common logo elements
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
          console.log(`Found logo via ${selector}:`, resolvedUrl);
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

    return null;
  }

  // NEW: Enhanced favicon extraction with better fallbacks
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
        console.log(`Found favicon via ${selector}:`, resolvedUrl);
        return resolvedUrl;
      }
    }

    // Fallback to default favicon location
    try {
      const defaultFavicon = this.resolveUrl('/favicon.ico', baseUrl);
      console.log('Using default favicon location:', defaultFavicon);
      return defaultFavicon;
    } catch (error) {
      return null;
    }
  }

  // NEW: Determine the best image to use for display
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
        console.log('Selected display image:', imageUrl);
        return imageUrl;
      }
    }

    return null;
  }

  // NEW: Basic heuristic to filter out likely poor quality images
  isLikelyGoodImage(url) {
    if (!url) return false;
    
    // Skip SVG for now (can be complex to handle)
    if (url.toLowerCase().endsWith('.svg')) {
      console.log('Skipping SVG image:', url);
      return false;
    }
    
    // Skip very small favicons
    if (url.includes('favicon.ico')) {
      console.log('Skipping default favicon.ico');
      return false;
    }
    
    // Prefer images that look like they could be logos or proper images
    const goodIndicators = [
      'logo', 'brand', 'og-image', 'twitter-image', 
      'apple-touch', 'icon-192', 'icon-512'
    ];
    
    const urlLower = url.toLowerCase();
    return goodIndicators.some(indicator => urlLower.includes(indicator)) ||
           // Or accept if it doesn't look like a tiny favicon
           (!urlLower.includes('favicon') && !urlLower.endsWith('.ico'));
  }

  // NEW: Helper to resolve URLs properly
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
      console.error('Error resolving URL:', error, 'for path:', path);
      return null;
    }
  }

  // NEW: Helper: Get numeric value for icon size comparison
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

  // Your existing methods (keep these)
  extractColors($) {
    const colors = new Set();
    
    // Extract from style tags
    $('style').each((i, elem) => {
      const styleContent = $(elem).html();
      this.extractColorsFromText(styleContent, colors);
    });
    
    // Extract from inline styles
    $('[style]').each((i, elem) => {
      const style = $(elem).attr('style');
      this.extractColorsFromText(style, colors);
    });
    
    // Extract from meta theme-color
    const themeColor = $('meta[name="theme-color"]').attr('content');
    if (themeColor) {
      colors.add(themeColor.toLowerCase());
    }
    
    return Array.from(colors).slice(0, 8); // Limit to 8 colors
  }

  extractColorsFromText(text, colorsSet) {
    if (!text) return;
    
    const colorRegex = /#([0-9A-Fa-f]{6}|[0-9A-Fa-f]{3})|rgb\([^)]+\)|rgba\([^)]+\)|hsl\([^)]+\)|hsla\([^)]+\)/g;
    const matches = text.match(colorRegex) || [];
    
    matches.forEach(color => {
      // Normalize color format
      if (color.startsWith('#')) {
        if (color.length === 4) { // #RGB -> #RRGGBB
          color = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
        }
      }
      colorsSet.add(color.toLowerCase());
    });
  }

  extractFonts($) {
    const fonts = new Set();
    
    // Extract from Google Fonts and other font links
    $('link[rel="stylesheet"]').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && (href.includes('fonts.googleapis.com') || href.includes('font'))) {
        fonts.add(href);
      }
    });
    
    // Extract from style tags and inline styles
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