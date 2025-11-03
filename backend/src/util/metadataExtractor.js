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
        favicon: this.extractFavicon($, url),
        colors: this.extractColors($),
        fonts: this.extractFonts($),
        description: $('meta[name="description"]').attr('content')?.trim() || '',
        keywords: $('meta[name="keywords"]').attr('content')?.trim() || '',
        viewport: $('meta[name="viewport"]').attr('content') || ''
      };

      return metadata;
    } catch (error) {
      console.error('Metadata extraction error:', error.message);
      throw new Error(`Failed to extract metadata: ${error.message}`);
    }
  }

  extractFavicon($, baseUrl) {
    let favicon = $('link[rel="icon"]').attr('href') || 
                  $('link[rel="shortcut icon"]').attr('href') ||
                  $('link[rel="apple-touch-icon"]').attr('href');
    
    if (favicon) {
      try {
        // Handle relative URLs
        if (favicon.startsWith('//')) {
          favicon = 'https:' + favicon;
        } else if (favicon.startsWith('/')) {
          const urlObj = new URL(baseUrl);
          favicon = `${urlObj.protocol}//${urlObj.hostname}${favicon}`;
        } else if (!favicon.startsWith('http')) {
          favicon = new URL(favicon, baseUrl).href;
        }
        return favicon;
      } catch (error) {
        console.error('Error processing favicon URL:', error);
      }
    }
    
    // Fallback to default favicon location
    try {
      return new URL('/favicon.ico', baseUrl).href;
    } catch (error) {
      return null;
    }
  }

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