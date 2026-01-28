// Tile Customizer - Allows URL query params to swap tile images
// Usage: ?TILE_VALUE=IMAGE_NAME (e.g., ?16=central)

(function() {
  'use strict';

  const CONFIG_PATH = 'img/custom_tiles.json';

  async function loadConfig() {
    try {
      const response = await fetch(CONFIG_PATH);
      if (!response.ok) {
        console.warn('[TileCustomizer] Could not load config:', response.status);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.warn('[TileCustomizer] Error loading config:', error);
      return null;
    }
  }

  function parseQueryParams() {
    const params = new URLSearchParams(window.location.search);
    const customizations = {};

    for (const [key, value] of params.entries()) {
      const tileValue = parseInt(key, 10);
      if (!isNaN(tileValue) && value) {
        customizations[tileValue] = value.toLowerCase();
      }
    }

    return customizations;
  }

  function injectCustomStyles(customizations, config) {
    const styleId = 'tile-customizer-styles';

    // Remove existing custom styles if any
    const existing = document.getElementById(styleId);
    if (existing) {
      existing.remove();
    }

    const cssRules = [];

    for (const [tileValue, imageName] of Object.entries(customizations)) {
      const tileValueNum = parseInt(tileValue, 10);

      // Validate tile value
      if (!config.valid_tile_values.includes(tileValueNum)) {
        console.warn(`[TileCustomizer] Invalid tile value: ${tileValue}`);
        continue;
      }

      // Validate image name is approved
      if (!config.approved_images[imageName]) {
        console.warn(`[TileCustomizer] Image not approved: ${imageName}`);
        continue;
      }

      const imageFile = config.approved_images[imageName];
      const imagePath = `img/${imageFile}`;

      // Generate CSS rule for this tile
      // Handle super tiles (>8192) differently
      if (tileValueNum > 8192) {
        cssRules.push(`
          .tile.tile-super .tile-inner {
            background: #fff url('${imagePath}') !important;
            background-size: cover !important;
          }
        `);
      } else {
        cssRules.push(`
          .tile.tile-${tileValue} .tile-inner {
            background: #fff url('${imagePath}') !important;
            background-size: cover !important;
          }
        `);
      }

      console.log(`[TileCustomizer] Tile ${tileValue} → ${imageFile}`);
    }

    if (cssRules.length > 0) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = cssRules.join('\n');
      document.head.appendChild(styleElement);
      console.log(`[TileCustomizer] Applied ${cssRules.length} customization(s)`);
    }
  }

  async function init() {
    const customizations = parseQueryParams();

    if (Object.keys(customizations).length === 0) {
      return; // No customizations requested
    }

    console.log('[TileCustomizer] Customizations requested:', customizations);

    const config = await loadConfig();
    if (!config) {
      console.warn('[TileCustomizer] No config loaded, skipping customizations');
      return;
    }

    injectCustomStyles(customizations, config);
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();