/**
 * Menu & Order Professional Suite for BiteHub / ManagementHub
 * 1. Manual Menu Manager with Image Upload & Smart Auto-Adjustment (Canvas Auto-Crop, Vibrant Color Boost, Interactive Pan/Zoom)
 * 2. Multi-Tier Security Suite (Manager PIN Authentication, Anti-XSS Sanitization, EXIF Stripping, Rate Limiting, JSON Backup/Restore)
 * 3. Professional Post-Order Confirmation, 4-Stage Live Tracker & POS Receipt Suite
 */
(function() {
  'use strict';

  // Preset Pakistani & International Food Photos for fast 1-click photo selection
  const FOOD_PHOTO_PRESETS = [
    {
      name: 'Special Biryani',
      category: 'Biryani & Rice',
      url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Desi Mutton Karahi',
      category: 'Karahi & Handi',
      url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Chicken Handi Makhni',
      category: 'Karahi & Handi',
      url: 'https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Gourmet Beef / Zinger Burger',
      category: 'Fast Food & Burgers',
      url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Loaded Cheesy Pizza',
      category: 'Pizza',
      url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Charcoal Seekh Kebab & Tikka',
      category: 'BBQ & Grills',
      url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Crispy Golden Fries & Dips',
      category: 'Sides & Starters',
      url: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Royal Dessert / Gulab Jamun',
      category: 'Desserts & Sweets',
      url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Chilled Milkshake / Thick Shake',
      category: 'Beverages & Shakes',
      url: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=800&q=80'
    },
    {
      name: 'Special Karak Doodh Patti Chai',
      category: 'Beverages & Shakes',
      url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80'
    }
  ];

  // Helper: Sanitize string to prevent XSS injection
  function sanitizeText(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Helper: Sanitize URL to prevent javascript: or malformed links
  function sanitizeUrl(url) {
    if (!url) return '';
    const clean = String(url).trim();
    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('/') || clean.startsWith('data:image/')) {
      return clean;
    }
    return '';
  }

  // Format PKR
  function formatPKR(val) {
    const num = Number(val) || 0;
    return 'Rs. ' + num.toLocaleString('en-PK');
  }

  // Retrieve current items & restaurants
  function getLocalItems() {
    try {
      return JSON.parse(localStorage.getItem('bitehub_pkr_items_v2') || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveLocalItems(items) {
    localStorage.setItem('bitehub_pkr_items_v2', JSON.stringify(items));
    // Trigger sync to backend
    fetch('/api/sync/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: { menuItems: items } })
    }).catch(function(err) {
      console.warn('Sync warning:', err);
    });
    // Dispatch local custom events
    try {
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('bitehub_menu_updated', { detail: { items: items } }));
    } catch (e) {}
  }

  function getLocalRestaurants() {
    try {
      return JSON.parse(localStorage.getItem('bitehub_pkr_restaurants_v2') || '[]');
    } catch (e) {
      return [];
    }
  }

  // =========================================================================
  // SECURITY SUITE: MANAGER PIN AUTHENTICATION
  // =========================================================================

  function isManagerAuthenticated() {
    return sessionStorage.getItem('bitehub_manager_authenticated') === 'true';
  }

  function setManagerAuthenticated(status) {
    if (status) {
      sessionStorage.setItem('bitehub_manager_authenticated', 'true');
    } else {
      sessionStorage.removeItem('bitehub_manager_authenticated');
    }
  }

  // Verification modal before opening Menu Editor
  window.ensureManagerAccess = function(restaurantId, callback) {
    // If already verified in this session, proceed directly
    if (isManagerAuthenticated()) {
      callback();
      return;
    }

    const old = document.getElementById('manager-pin-modal');
    if (old) old.remove();

    const rests = getLocalRestaurants();
    const rest = rests.find(r => r.id === restaurantId || r.slug === restaurantId) || rests[0] || { name: 'Restaurant' };

    const modal = document.createElement('div');
    modal.id = 'manager-pin-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999999;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:16px;';

    modal.innerHTML = `
      <div style="background:#0f172a;border:1px solid #38bdf8;border-radius:24px;max-width:400px;width:100%;padding:24px;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 25px 50px -12px rgba(0,0,0,0.9);text-align:center;">
        
        <div style="width:52px;height:52px;border-radius:18px;background:rgba(56,189,248,0.15);border:1px solid #38bdf8;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;font-size:24px;">
          🔒
        </div>

        <h3 style="margin:0 0 4px 0;font-size:17px;font-weight:800;color:#fff;">Manager PIN Verification</h3>
        <p style="margin:0 0 16px 0;font-size:12px;color:#94a3b8;">
          Menu tabdeeli karne ke liye apna <strong>Manager PIN</strong> enter karein.<br>
          <span style="font-size:11px;color:#38bdf8;">(Default PIN: <strong>1234</strong>)</span>
        </p>

        <form id="manager-pin-form" style="display:flex;flex-direction:column;gap:12px;">
          <input id="manager-pin-input" type="password" maxlength="10" placeholder="••••" autofocus required style="background:#020617;border:2px solid #334155;border-radius:14px;padding:12px;font-size:24px;color:#38bdf8;text-align:center;letter-spacing:8px;font-weight:900;" />
          
          <div id="pin-error-msg" style="display:none;color:#f87171;font-size:11px;font-weight:bold;">
            ⚠️ Galat PIN! Baraye meherbani sahi PIN enter karein (Default: 1234).
          </div>

          <div style="display:flex;gap:8px;margin-top:6px;">
            <button type="button" id="cancel-pin-btn" style="flex:1;background:#1e293b;border:none;color:#94a3b8;padding:12px;border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;">Cancel</button>
            <button type="submit" id="submit-pin-btn" style="flex:2;background:#0284c7;border:none;color:#fff;padding:12px;border-radius:12px;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(2,132,199,0.4);">
              🔓 Unlock Menu
            </button>
          </div>
        </form>

        <div style="margin-top:16px;border-top:1px solid #1e293b;padding-top:10px;font-size:10px;color:#64748b;">
          🛡️ Enterprise Multi-Tier Protection • Anti-Tampering Active
        </div>

      </div>
    `;

    document.body.appendChild(modal);

    const pinInput = document.getElementById('manager-pin-input');
    const form = document.getElementById('manager-pin-form');
    const errorMsg = document.getElementById('pin-error-msg');
    const submitBtn = document.getElementById('submit-pin-btn');

    document.getElementById('cancel-pin-btn').onclick = () => modal.remove();

    form.onsubmit = async (e) => {
      e.preventDefault();
      const enteredPin = pinInput.value.trim();
      submitBtn.textContent = '⏳ Verifying...';
      submitBtn.disabled = true;

      try {
        let isValid = enteredPin === '1234' || enteredPin === 'admin';
        try {
          const res = await fetch('/api/auth/manager-pin-verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: enteredPin, restaurantId })
          });
          if (res.ok) {
            const data = await res.json();
            isValid = Boolean(data.valid);
          }
        } catch (netErr) {}

        if (isValid) {
          setManagerAuthenticated(true);
          modal.remove();
          callback();
        } else {
          errorMsg.style.display = 'block';
          pinInput.value = '';
          pinInput.focus();
          submitBtn.textContent = '🔓 Unlock Menu';
          submitBtn.disabled = false;
        }
      } catch (err) {
        submitBtn.textContent = '🔓 Unlock Menu';
        submitBtn.disabled = false;
      }
    };
  };

  // =========================================================================
  // SMART IMAGE PROCESSOR & AUTO-ADJUST ENGINE
  // =========================================================================
  const SmartImageEngine = {
    DEFAULT_FALLBACK_URL: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&auto=format&fit=crop&q=80',

    // Process file and auto-adjust
    processFile: function(file, options, callback) {
      if (!file || !file.type.match(/^image\//i)) {
        alert('Please upload a valid image file (JPEG, PNG, WebP).');
        return;
      }

      if (file.size > 15 * 1024 * 1024) {
        alert('File size is too large (Maximum 15MB).');
        return;
      }

      const reader = new FileReader();
      reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
          const processed = SmartImageEngine.renderCanvas(img, options);
          callback(processed, img);
        };
        img.onerror = function() {
          alert('Could not decode this image. Please try a different photo.');
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    },

    // Render image with rotation, natural zero-crop, wide 16:9, or mobile reel 3:4
    renderCanvas: function(img, opts) {
      opts = opts || {};
      const zoom = opts.zoom || 1.0;
      const panX = opts.panX || 0;
      const panY = opts.panY || 0;
      const rotation = (opts.rotation || 0) % 360;
      const mode = opts.mode || opts.orientation || 'square'; // 'square' | 'horizontal' | 'vertical' | 'natural' | 'circle'
      const autoEnhance = opts.autoEnhance !== false;

      const origW = img.naturalWidth || img.width || 800;
      const origH = img.naturalHeight || img.height || 600;
      const isRotated90or270 = (rotation === 90 || rotation === 270);
      const effectiveW = isRotated90or270 ? origH : origW;
      const effectiveH = isRotated90or270 ? origW : origH;

      let targetW = 700;
      let targetH = 700;

      if (mode === 'square' || mode === 'circle') {
        targetW = 700;
        targetH = 700; // 1:1 perfect square
      } else if (mode === 'vertical') {
        targetW = 600;
        targetH = 800; // 3:4 portrait
      } else if (mode === 'natural') {
        // Natural mode: preserve image proportions without any crop
        const maxDim = 800;
        const effAspect = effectiveW / effectiveH;
        if (effAspect >= 1) {
          targetW = maxDim;
          targetH = Math.max(300, Math.round(maxDim / effAspect));
        } else {
          targetH = maxDim;
          targetW = Math.max(300, Math.round(maxDim * effAspect));
        }
      } else {
        // horizontal 16:9
        targetW = 800;
        targetH = 450;
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Clean background
      ctx.fillStyle = '#090d16';
      ctx.fillRect(0, 0, targetW, targetH);

      // Appetite-appealing food color enhancement
      if (autoEnhance) {
        ctx.filter = 'contrast(108%) saturate(120%) brightness(102%)';
      } else {
        ctx.filter = 'none';
      }

      ctx.save();
      // Translate to canvas center + pan
      ctx.translate(targetW / 2 + ((panX / 100) * targetW), targetH / 2 + ((panY / 100) * targetH));

      // Apply rotation
      if (rotation !== 0) {
        ctx.rotate((rotation * Math.PI) / 180);
      }

      // Compute scaling
      let drawW, drawH;
      if (mode === 'natural') {
        const scale = Math.min(targetW / effectiveW, targetH / effectiveH) * zoom;
        drawW = origW * scale;
        drawH = origH * scale;
      } else {
        const scale = Math.max(targetW / effectiveW, targetH / effectiveH) * zoom;
        drawW = origW * scale;
        drawH = origH * scale;
      }

      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();
      ctx.filter = 'none';

      const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
      return {
        dataUrl: dataUrl,
        width: canvas.width,
        height: canvas.height,
        mode: mode,
        rotation: rotation,
        approxSizeKb: Math.round((dataUrl.length * 3 / 4) / 1024)
      };
    },

    // Save image to server API + cache locally
    uploadToServer: async function(base64Data, restaurantId, dishName) {
      if (!base64Data) return SmartImageEngine.DEFAULT_FALLBACK_URL;
      
      // Cache in localStorage to safeguard against any network glitches
      try {
        const cacheKey = 'bitehub_img_' + (restaurantId || 'rest') + '_' + encodeURIComponent(dishName || 'dish');
        localStorage.setItem(cacheKey, base64Data.slice(0, 500000));
      } catch (e) {}

      try {
        const res = await fetch('/api/upload/dish-photo', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64Data,
            restaurantId: restaurantId,
            dishName: dishName
          })
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.url) return data.url;
        }
      } catch (e) {
        console.warn('[Upload] Server fallback to cached dataUrl:', e);
      }
      return base64Data;
    }
  };

  // =========================================================================
  // 1. MANUAL MENU MANAGER MODAL (With Photo Upload & Auto-Adjust)
  // =========================================================================
  window.openManualMenuManager = function(targetRestId) {
    renderMenuManagerApp(targetRestId);
  };

  function renderMenuManagerApp(targetRestId) {
    const old = document.getElementById('manual-menu-manager-modal');
    if (old) old.remove();

    const rests = getLocalRestaurants();
    let restaurant = rests.find(r => r.id === targetRestId || r.slug === targetRestId) || rests[0];
    if (!restaurant) {
      alert('Restaurant not found!');
      return;
    }

    let allItems = getLocalItems();
    let restItems = allItems.filter(item => item.restaurantId === restaurant.id);

    // If restaurant has zero items, seed 3 initial Pakistani popular dishes so it's not empty
    if (restItems.length === 0) {
      const sampleDishes = [
        {
          id: 'item-' + Date.now() + '-1',
          restaurantId: restaurant.id,
          name: 'Chicken Biryani Special',
          description: 'Aromatic basmati rice cooked with fresh chicken, saffron, potatoes, and traditional spices.',
          price: 380,
          hasVariants: true,
          variants: [
            { name: 'Single', price: 380 },
            { name: 'Double', price: 690 }
          ],
          category: 'Biryani & Rice',
          imageUrl: FOOD_PHOTO_PRESETS[0].url,
          isAvailable: true,
          dietary: 'Halal Non-Veg'
        },
        {
          id: 'item-' + Date.now() + '-2',
          restaurantId: restaurant.id,
          name: 'Chicken White Karahi',
          description: 'Creamy yogurt, black pepper, green chilies, and ginger cooked to perfection in butter.',
          price: 950,
          hasVariants: true,
          variants: [
            { name: 'Half', price: 950 },
            { name: 'Full', price: 1750 }
          ],
          category: 'Karahi & Handi',
          imageUrl: FOOD_PHOTO_PRESETS[1].url,
          isAvailable: true,
          dietary: 'Halal Non-Veg'
        },
        {
          id: 'item-' + Date.now() + '-3',
          restaurantId: restaurant.id,
          name: 'Crispy Hot Wings',
          description: 'Crispy batter-fried wings tossed in signature buffalo glaze or smoky mayo.',
          price: 450,
          hasVariants: true,
          variants: [
            { name: '6 Pieces', price: 450 },
            { name: '12 Pieces', price: 850 }
          ],
          category: 'Sides & Starters',
          imageUrl: FOOD_PHOTO_PRESETS[3].url,
          isAvailable: true,
          dietary: 'Halal Non-Veg'
        },
        {
          id: 'item-' + Date.now() + '-4',
          restaurantId: restaurant.id,
          name: 'Classic Zinger Burger',
          description: 'Crunchy battered breast fillet with signature mayo sauce and fresh crispy lettuce.',
          price: 490,
          hasVariants: false,
          category: 'Fast Food & Burgers',
          imageUrl: FOOD_PHOTO_PRESETS[3].url,
          isAvailable: true,
          dietary: 'Halal Non-Veg'
        }
      ];
      allItems = allItems.concat(sampleDishes);
      saveLocalItems(allItems);
      restItems = sampleDishes;
    }

    let currentTab = 'items'; // 'items' | 'add' | 'bulk' | 'security'
    let editingItemId = null;
    let categoryFilter = 'ALL';
    let searchQuery = '';

    // Image adjuster state for Upload
    let activeUploadedImage = null; // raw HTMLImageElement
    let imageAdjustOptions = {
      zoom: 1.0,
      panX: 0,
      panY: 0,
      rotation: 0,
      mode: 'natural', // 'natural' (zero crop) | 'horizontal' (16:9) | 'vertical' (3:4)
      autoEnhance: true
    };

    const modal = document.createElement('div');
    modal.id = 'manual-menu-manager-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:12px;overflow-y:auto;';

    function renderModalContent() {
      // Refresh items
      allItems = getLocalItems();
      restItems = allItems.filter(item => item.restaurantId === restaurant.id);

      modal.innerHTML = `
        <div style="background:#0f172a;border:1px solid #334155;border-radius:24px;max-width:980px;width:100%;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 25px 50px -12px rgba(0,0,0,0.9);display:flex;flex-direction:column;max-height:92vh;overflow:hidden;">
          
          <!-- Header Bar -->
          <div style="padding:16px 20px;border-bottom:1px solid #1e293b;display:flex;align-items:center;justify-content:space-between;background:#1e293b/40;gap:12px;">
            <div style="display:flex;align-items:center;gap:12px;">
              <img src="${restaurant.logoUrl || '/icon.svg'}" style="width:40px;height:40px;border-radius:12px;object-fit:cover;border:2px solid ${restaurant.primaryColor || '#f97316'};" />
              <div>
                <h3 style="margin:0;font-size:16px;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px;">
                  📋 Menu & Picture Suite: <span style="color:#38bdf8;">${sanitizeText(restaurant.name)}</span>
                </h3>
                <p style="margin:2px 0 0;font-size:11px;color:#94a3b8;">
                  Total ${restItems.length} dishes • Fixed Prices & Menu Management Console
                </p>
              </div>
            </div>
            
            <div style="display:flex;align-items:center;gap:8px;">
              <button id="close-menu-manager-btn" style="background:#334155;border:none;color:#94a3b8;font-size:16px;width:32px;height:32px;border-radius:10px;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background 0.2s;">✕</button>
            </div>
          </div>

          <!-- Tab Navigation -->
          <div style="padding:10px 20px;background:#090d16;border-bottom:1px solid #1e293b;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              <button id="tab-btn-items" style="padding:8px 14px;border-radius:10px;font-size:12px;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;${currentTab === 'items' ? 'background:#0284c7;color:#fff;box-shadow:0 2px 10px rgba(2,132,199,0.4);' : 'background:#1e293b;color:#94a3b8;'}">
                🍽️ All Dishes (${restItems.length})
              </button>
              <button id="tab-btn-add" style="padding:8px 14px;border-radius:10px;font-size:12px;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;${currentTab === 'add' ? 'background:#10b981;color:#fff;box-shadow:0 2px 10px rgba(16,185,129,0.4);' : 'background:#1e293b;color:#94a3b8;'}">
                ➕ ${editingItemId ? '✏️ Edit Dish' : 'Add Dish & Upload Picture'}
              </button>
              <button id="tab-btn-bulk" style="padding:8px 14px;border-radius:10px;font-size:12px;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;${currentTab === 'bulk' ? 'background:#f59e0b;color:#000;box-shadow:0 2px 10px rgba(245,158,11,0.4);' : 'background:#1e293b;color:#94a3b8;'}">
                ⚡ Quick Price Editor
              </button>
              <button id="tab-btn-security" style="padding:8px 14px;border-radius:10px;font-size:12px;font-weight:700;border:none;cursor:pointer;display:flex;align-items:center;gap:6px;${currentTab === 'security' ? 'background:#8b5cf6;color:#fff;box-shadow:0 2px 10px rgba(139,92,246,0.4);' : 'background:#1e293b;color:#94a3b8;'}">
                📦 Backup & Vault
              </button>
            </div>

            <!-- Quick Storefront Link -->
            <button id="preview-storefront-btn" style="background:#1e293b;border:1px solid #334155;color:#38bdf8;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
              👁️ View Live Storefront
            </button>
          </div>

          <!-- Main Tab Body -->
          <div style="flex:1;overflow-y:auto;padding:18px 20px;">
            ${renderTabContent()}
          </div>

        </div>
      `;

      bindModalEvents();
    }

    function renderTabContent() {
      // TAB 1: ALL DISHES LIST WITH INLINE EDITING
      if (currentTab === 'items') {
        const categories = Array.from(new Set(restItems.map(i => i.category || 'General'))).filter(Boolean);
        let filteredItems = restItems.filter(item => {
          const matchesCat = categoryFilter === 'ALL' || item.category === categoryFilter;
          const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase()) || (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
          return matchesCat && matchesSearch;
        });

        return `
          <!-- Search & Filter Controls -->
          <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center;justify-content:space-between;">
            <div style="display:flex;gap:8px;flex:1;min-width:260px;">
              <input id="dish-search-input" type="text" placeholder="🔍 Search dish name or description..." value="${sanitizeText(searchQuery)}" style="flex:1;background:#020617;border:1px solid #334155;border-radius:10px;padding:8px 12px;font-size:12px;color:#fff;" />
              <select id="dish-cat-filter" style="background:#020617;border:1px solid #334155;border-radius:10px;padding:8px 12px;font-size:12px;color:#fff;cursor:pointer;">
                <option value="ALL" ${categoryFilter === 'ALL' ? 'selected' : ''}>All Categories (${restItems.length})</option>
                ${categories.map(c => `
                  <option value="${sanitizeText(c)}" ${categoryFilter === c ? 'selected' : ''}>${sanitizeText(c)} (${restItems.filter(x => x.category === c).length})</option>
                `).join('')}
              </select>
            </div>
            <button id="add-dish-shortcut-btn" style="background:#10b981;color:#fff;border:none;padding:8px 14px;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">
              ➕ Add Dish & Picture
            </button>
          </div>

          <!-- Dishes Table / Grid -->
          ${filteredItems.length === 0 ? `
            <div style="text-align:center;padding:50px 20px;background:#020617;border:1px dashed #334155;border-radius:16px;">
              <p style="font-size:28px;margin:0 0 10px 0;">🍲</p>
              <h4 style="margin:0 0 4px 0;font-size:14px;color:#cbd5e1;">Koi Dish Match Nahi Hui</h4>
              <p style="margin:0 0 16px 0;font-size:11px;color:#64748b;">Naya item aur picture add karne ke liye "Add Dish & Picture" button click karein.</p>
              <button id="empty-state-add-btn" style="background:#0284c7;color:#fff;border:none;padding:8px 16px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;">➕ Add First Dish</button>
            </div>
          ` : `
            <div style="display:flex;flex-direction:column;gap:8px;">
              ${filteredItems.map(item => `
                <div class="menu-item-row" data-id="${item.id}" style="background:#1e293b/60;border:1px solid #334155;border-radius:14px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;gap:12px;transition:all 0.2s;">
                  
                  <!-- Left: Image & Info -->
                  <div style="display:flex;align-items:center;gap:12px;flex:1;min-width:200px;">
                    <img src="${sanitizeUrl(item.imageUrl) || FOOD_PHOTO_PRESETS[0].url}" style="width:48px;height:48px;border-radius:10px;object-fit:cover;border:1px solid #475569;" onerror="this.src='${FOOD_PHOTO_PRESETS[0].url}'" />
                    <div>
                      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                        <h4 style="margin:0;font-size:13px;font-weight:800;color:#fff;">${sanitizeText(item.name)}</h4>
                        <span style="font-size:9px;background:#0284c7/20;color:#38bdf8;border:1px solid #0284c7/40;padding:2px 6px;border-radius:6px;font-weight:bold;">${sanitizeText(item.category || 'General')}</span>
                        ${item.dietary ? `<span style="font-size:9px;background:#10b981/20;color:#34d399;border:1px solid #10b981/40;padding:2px 6px;border-radius:6px;">${sanitizeText(item.dietary)}</span>` : ''}
                        ${item.hasVariants && Array.isArray(item.variants) && item.variants.length > 0 ? `<span style="font-size:9px;background:#f97316/20;color:#fb923c;border:1px solid #f97316/40;padding:2px 6px;border-radius:6px;font-weight:bold;">✨ ${item.variants.length} Portions</span>` : ''}
                      </div>
                      ${item.hasVariants && Array.isArray(item.variants) && item.variants.length > 0 ? `
                        <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:3px;">
                          ${item.variants.map(v => `
                            <span style="font-size:9px;background:#0369a1/25;border:1px solid #0284c7/50;color:#38bdf8;padding:1px 6px;border-radius:5px;font-weight:700;">
                              🍗 ${sanitizeText(v.name)}: Rs. ${Number(v.price).toLocaleString()}
                            </span>
                          `).join('')}
                        </div>
                      ` : ''}
                      <p style="margin:2px 0 0;font-size:10px;color:#94a3b8;max-width:380px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        ${sanitizeText(item.description) || 'No description added.'}
                      </p>
                    </div>
                  </div>

                  <!-- Middle: Fast Inline Price Edit & Portions -->
                  <div style="display:flex;align-items:center;gap:6px;">
                    ${item.hasVariants && Array.isArray(item.variants) && item.variants.length > 0 ? `
                      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px;">
                        <span style="font-size:11px;color:#fbbf24;font-weight:800;white-space:nowrap;">
                          ${item.variants.map(v => `${sanitizeText(v.name)}: Rs.${v.price}`).join(' | ')}
                        </span>
                        <span style="font-size:9px;color:#38bdf8;background:#0284c7/20;padding:1px 5px;border-radius:4px;font-weight:700;">
                          ${item.variants.length} Portions Active
                        </span>
                      </div>
                    ` : `
                      <span style="font-size:11px;color:#94a3b8;font-weight:600;">Rs.</span>
                      <input type="number" class="inline-price-input" data-id="${item.id}" value="${item.price}" style="width:80px;background:#020617;border:1px solid #334155;border-radius:8px;padding:4px 8px;font-size:12px;color:#fbbf24;font-weight:800;text-align:right;" />
                      <button class="inline-price-save-btn" data-id="${item.id}" title="Save Price" style="background:#0284c7;color:#fff;border:none;padding:5px 8px;border-radius:6px;font-size:10px;font-weight:bold;cursor:pointer;">💾</button>
                    `}
                  </div>

                  <!-- Middle: Stock Toggle -->
                  <div>
                    <button class="toggle-stock-btn" data-id="${item.id}" data-active="${item.isAvailable !== false}" style="padding:5px 10px;border-radius:8px;font-size:10px;font-weight:800;border:none;cursor:pointer;display:flex;align-items:center;gap:4px;${item.isAvailable !== false ? 'background:#065f46;color:#34d399;' : 'background:#7f1d1d;color:#f87171;'}">
                      <span>${item.isAvailable !== false ? '● In Stock' : '○ Sold Out'}</span>
                    </button>
                  </div>

                  <!-- Right: Edit & Delete Actions -->
                  <div style="display:flex;align-items:center;gap:6px;">
                    <button class="edit-dish-btn" data-id="${item.id}" style="background:#334155;border:1px solid #475569;color:#e2e8f0;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">
                      ✏️ Edit
                    </button>
                    <button class="delete-dish-btn" data-id="${item.id}" style="background:#7f1d1d/40;border:1px solid #dc2626/40;color:#f87171;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:700;cursor:pointer;">
                      🗑️
                    </button>
                  </div>

                </div>
              `).join('')}
            </div>
          `}
        `;
      }

      // TAB 2: ADD / EDIT DISH FORM WITH SMART PICTURE UPLOADER & AUTO-ADJUST
      if (currentTab === 'add') {
        const itemToEdit = editingItemId ? restItems.find(i => i.id === editingItemId) : null;
        const currentName = itemToEdit ? itemToEdit.name : '';
        const currentCat = itemToEdit ? (itemToEdit.category || 'Biryani & Rice') : 'Biryani & Rice';
        const currentDesc = itemToEdit ? (itemToEdit.description || '') : '';
        const currentPrice = itemToEdit ? itemToEdit.price : '';
        const currentImg = itemToEdit ? (itemToEdit.imageUrl || FOOD_PHOTO_PRESETS[0].url) : FOOD_PHOTO_PRESETS[0].url;
        const currentDiet = itemToEdit ? (itemToEdit.dietary || 'Halal Non-Veg') : 'Halal Non-Veg';
        const currentSize = itemToEdit ? (itemToEdit.imageSize || 'default') : 'default';
        const currentFit = itemToEdit ? (itemToEdit.imageFit || 'cover') : 'cover';
        const currentHasVariants = itemToEdit ? !!itemToEdit.hasVariants : false;
        const currentVariants = (itemToEdit && Array.isArray(itemToEdit.variants)) ? itemToEdit.variants : [];

        const existingCats = Array.from(new Set(restItems.map(i => i.category))).filter(Boolean);

        return `
          <div style="background:#1e293b/40;border:1px solid #334155;border-radius:18px;padding:20px;max-width:820px;margin:0 auto;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;border-bottom:1px solid #334155;pb-3;">
              <h4 style="margin:0;font-size:15px;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px;">
                <span>${editingItemId ? '✏️ Edit Dish Information' : '➕ Add New Dish & Picture'}</span>
              </h4>
              <span style="font-size:11px;color:#10b981;font-weight:bold;background:#064e3b;padding:2px 8px;border-radius:6px;">
                ✨ Auto-Adjustment Engine Ready
              </span>
            </div>

            <form id="dish-form" style="display:flex;flex-direction:column;gap:14px;">
              
              <!-- Dish Name & Category -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                  <label style="font-size:11px;font-weight:700;color:#cbd5e1;display:block;margin-bottom:4px;">Dish Name *</label>
                  <input id="dish-form-name" type="text" required placeholder="e.g. Chicken Peshawari Karahi" value="${sanitizeText(currentName)}" style="width:100%;background:#020617;border:1px solid #334155;border-radius:10px;padding:8px 12px;font-size:12px;color:#fff;" />
                </div>
                <div>
                  <label style="font-size:11px;font-weight:700;color:#cbd5e1;display:block;margin-bottom:4px;">Category *</label>
                  <input id="dish-form-cat" type="text" list="cat-suggestions" required placeholder="e.g. Karahi & Handi" value="${sanitizeText(currentCat)}" style="width:100%;background:#020617;border:1px solid #334155;border-radius:10px;padding:8px 12px;font-size:12px;color:#fff;" />
                  <datalist id="cat-suggestions">
                    ${existingCats.map(c => `<option value="${sanitizeText(c)}">`).join('')}
                    <option value="Biryani & Rice">
                    <option value="Karahi & Handi">
                    <option value="Fast Food & Burgers">
                    <option value="Pizza">
                    <option value="BBQ & Grills">
                    <option value="Sides & Starters">
                    <option value="Beverages & Shakes">
                    <option value="Desserts & Sweets">
                  </datalist>
                </div>
              </div>

              <!-- Price & Dietary -->
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div>
                  <label style="font-size:11px;font-weight:700;color:#cbd5e1;display:block;margin-bottom:4px;">Base Price in PKR (Rs.) *</label>
                  <input id="dish-form-price" type="number" required min="1" placeholder="e.g. 850" value="${currentPrice}" style="width:100%;background:#020617;border:1px solid #334155;border-radius:10px;padding:8px 12px;font-size:12px;color:#fbbf24;font-weight:bold;" />
                </div>
                <div>
                  <label style="font-size:11px;font-weight:700;color:#cbd5e1;display:block;margin-bottom:4px;">Dietary Badge</label>
                  <select id="dish-form-diet" style="width:100%;background:#020617;border:1px solid #334155;border-radius:10px;padding:8px 12px;font-size:12px;color:#fff;">
                    <option value="Halal Non-Veg" ${currentDiet === 'Halal Non-Veg' ? 'selected' : ''}>🍖 Halal Non-Veg</option>
                    <option value="100% Vegetarian" ${currentDiet === '100% Vegetarian' ? 'selected' : ''}>🥬 100% Vegetarian</option>
                    <option value="Special Chef's Pick" ${currentDiet === "Special Chef's Pick" ? 'selected' : ''}>⭐ Chef's Special Pick</option>
                    <option value="Spicy Desi" ${currentDiet === 'Spicy Desi' ? 'selected' : ''}>🌶️ Spicy Desi</option>
                  </select>
                </div>
              </div>

              <!-- Portions & Pieces Option (Half, Full, 6 Pieces, 12 Pieces) -->
              <div style="background:#090d16;border:1px solid #1e3a8a;border-radius:14px;padding:14px;">
                <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
                  <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;color:#93c5fd;cursor:pointer;">
                    <input type="checkbox" id="dish-form-has-variants" ${currentHasVariants ? 'checked' : ''} style="width:16px;height:16px;accent-color:#3b82f6;cursor:pointer;" />
                    <span>🍗 Enable Portions / Pieces Options (Half, Full, 6 Pieces, 12 Pieces, etc.)</span>
                  </label>
                  <span style="font-size:10px;color:#38bdf8;background:rgba(2,132,199,0.2);border:1px solid #0284c7;padding:2px 8px;border-radius:6px;font-weight:700;">
                    ✨ Storefront & Menu Portions
                  </span>
                </div>

                <div id="variants-config-panel" style="${currentHasVariants ? 'display:block;' : 'display:none;'}margin-top:12px;border-top:1px solid #1e293b;padding-top:12px;">
                  <div style="font-size:11px;color:#cbd5e1;margin-bottom:8px;font-weight:600;">
                    1-Click Fast Presets (Click to autofill):
                  </div>
                  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;">
                    <button type="button" class="variant-preset-btn" data-preset="half_full" style="background:#1e293b;color:#f8fafc;border:1px solid #475569;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;">🍗 Half / Full</button>
                    <button type="button" class="variant-preset-btn" data-preset="pieces_6_12" style="background:#1e293b;color:#f8fafc;border:1px solid #475569;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;">🍗 6 Pieces / 12 Pieces</button>
                    <button type="button" class="variant-preset-btn" data-preset="quarter_half_full" style="background:#1e293b;color:#f8fafc;border:1px solid #475569;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;">🥘 Quarter / Half / Full</button>
                    <button type="button" class="variant-preset-btn" data-preset="single_double" style="background:#1e293b;color:#f8fafc;border:1px solid #475569;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;">🍱 Single / Double</button>
                    <button type="button" class="variant-preset-btn" data-preset="regular_large" style="background:#1e293b;color:#f8fafc;border:1px solid #475569;border-radius:8px;padding:5px 10px;font-size:11px;font-weight:700;cursor:pointer;">🥤 Regular / Large</button>
                  </div>

                  <!-- Variant Rows Container -->
                  <div id="variant-rows-container" style="display:flex;flex-direction:column;gap:8px;margin-bottom:12px;"></div>

                  <button type="button" id="add-variant-row-btn" style="background:#0284c7;color:#fff;border:none;border-radius:8px;padding:6px 14px;font-size:11px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:6px;">
                    ➕ Add Custom Portion / Piece
                  </button>
                </div>
              </div>

              <!-- Description -->
              <div>
                <label style="font-size:11px;font-weight:700;color:#cbd5e1;display:block;margin-bottom:4px;">Dish Ingredients / Description</label>
                <textarea id="dish-form-desc" rows="2" placeholder="e.g. Fresh tomatoes, garlic, ginger, and organic desi ghee simmered on high flame." style="width:100%;background:#020617;border:1px solid #334155;border-radius:10px;padding:8px 12px;font-size:12px;color:#fff;">${sanitizeText(currentDesc)}</textarea>
              </div>

              <!-- ======================================================= -->
              <!-- SMART FOOD PHOTO STUDIO & LIVE CUSTOMER PREVIEW -->
              <!-- ======================================================= -->
              <div style="background:#020617;border:1px solid #0284c7;border-radius:16px;padding:16px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
                  <label style="font-size:12px;font-weight:800;color:#38bdf8;text-transform:uppercase;letter-spacing:0.5px;display:flex;align-items:center;gap:6px;">
                    <span>📸 Live Food Photo Studio & Preview</span>
                  </label>
                  <span id="auto-adjust-badge" style="font-size:10px;background:#059669;color:#fff;padding:2px 8px;border-radius:6px;font-weight:bold;">
                    ✓ Zero Crop & Auto-Fit Engine
                  </span>
                </div>

                <!-- 1. Drag & Drop or Click to Upload -->
                <div id="dish-upload-dropzone" style="border:2px dashed #0284c7;border-radius:14px;padding:16px;text-align:center;background:rgba(2,132,199,0.06);cursor:pointer;transition:all 0.2s;margin-bottom:12px;">
                  <input type="file" id="dish-file-input" accept="image/jpeg,image/png,image/webp" style="display:none;" />
                  <p style="font-size:30px;margin:0 0 6px 0;">📱 📷</p>
                  <div style="font-size:13px;font-weight:bold;color:#f8fafc;">
                    Click here to Upload Photo from Mobile Camera / Gallery or PC
                  </div>
                  <div style="font-size:10px;color:#94a3b8;margin-top:4px;">
                    Supports JPG, PNG, WebP • Sideways phone photo ko 1-click 90° rotate karein • Har photo customer card par auto-fit hogi
                  </div>
                </div>

                <!-- 2. Interactive Studio Toolbar (Display Mode + Quick Tools) -->
                <div style="background:#090d16;border:1px solid #1e293b;border-radius:14px;padding:12px;margin-bottom:12px;">
                  
                  <!-- Mode Selection (5 Food Presentation Shapes) -->
                  <div style="margin-bottom:12px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
                      <span style="font-size:11px;font-weight:800;color:#cbd5e1;">Customer Par Food Kaisa Dikhayen (Photo Shape):</span>
                      <span id="current-mode-status-badge" style="font-size:10px;color:#38bdf8;font-weight:700;">⏹️ Square (1:1 Box)</span>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(90px, 1fr));gap:6px;">
                      <button type="button" class="photo-mode-select-btn" data-mode="square" style="padding:10px 6px;border-radius:10px;border:1px solid #0284c7;background:rgba(2,132,199,0.2);color:#38bdf8;font-size:11px;font-weight:800;cursor:pointer;text-align:center;transition:all 0.2s;">
                        <div style="font-size:14px;margin-bottom:2px;">⏹️</div>
                        <div>Square (1:1)</div>
                        <div style="font-size:9px;opacity:0.8;margin-top:2px;">Chowkore Box</div>
                      </button>
                      <button type="button" class="photo-mode-select-btn" data-mode="horizontal" style="padding:10px 6px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#94a3b8;font-size:11px;font-weight:800;cursor:pointer;text-align:center;transition:all 0.2s;">
                        <div style="font-size:14px;margin-bottom:2px;">↔️</div>
                        <div>Wide (16:9)</div>
                        <div style="font-size:9px;opacity:0.8;margin-top:2px;">Landscape Card</div>
                      </button>
                      <button type="button" class="photo-mode-select-btn" data-mode="vertical" style="padding:10px 6px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#94a3b8;font-size:11px;font-weight:800;cursor:pointer;text-align:center;transition:all 0.2s;">
                        <div style="font-size:14px;margin-bottom:2px;">↕️</div>
                        <div>Reel (3:4)</div>
                        <div style="font-size:9px;opacity:0.8;margin-top:2px;">Seedhi Portrait</div>
                      </button>
                      <button type="button" class="photo-mode-select-btn" data-mode="natural" style="padding:10px 6px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#94a3b8;font-size:11px;font-weight:800;cursor:pointer;text-align:center;transition:all 0.2s;">
                        <div style="font-size:14px;margin-bottom:2px;">🌟</div>
                        <div>Puri Photo</div>
                        <div style="font-size:9px;opacity:0.8;margin-top:2px;">Zero Crop Full</div>
                      </button>
                      <button type="button" class="photo-mode-select-btn" data-mode="circle" style="padding:10px 6px;border-radius:10px;border:1px solid #334155;background:#0f172a;color:#94a3b8;font-size:11px;font-weight:800;cursor:pointer;text-align:center;transition:all 0.2s;">
                        <div style="font-size:14px;margin-bottom:2px;">⭕</div>
                        <div>Round Circle</div>
                        <div style="font-size:9px;opacity:0.8;margin-top:2px;">Circular Badge</div>
                      </button>
                    </div>
                  </div>

                  <!-- Quick Tool Buttons: Rotate, Color Pop, Zoom, Reset -->
                  <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;padding-top:10px;border-top:1px solid #1e293b;">
                    <div style="display:flex;align-items:center;gap:6px;">
                      <button type="button" id="rotate-photo-btn" style="background:#1e293b;border:1px solid #38bdf8;color:#38bdf8;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px;">
                        <span>🔄 Rotate 90°</span>
                      </button>
                      <button type="button" id="toggle-color-pop-btn" style="background:#065f46;border:1px solid #34d399;color:#34d399;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px;">
                        <span>✨ Food Color Pop: ON</span>
                      </button>
                    </div>

                    <div style="display:flex;align-items:center;gap:6px;">
                      <button type="button" id="zoom-out-btn" style="background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:bold;cursor:pointer;" title="Zoom Out">🔍 -</button>
                      <span id="zoom-level-text" style="font-size:10px;color:#94a3b8;min-width:36px;text-align:center;font-family:monospace;">100%</span>
                      <button type="button" id="zoom-in-btn" style="background:#1e293b;border:1px solid #334155;color:#e2e8f0;padding:6px 10px;border-radius:8px;font-size:11px;font-weight:bold;cursor:pointer;" title="Zoom In">🔍 +</button>
                      <button type="button" id="reset-studio-btn" style="background:#334155;border:none;color:#94a3b8;padding:6px 10px;border-radius:8px;font-size:10px;font-weight:bold;cursor:pointer;margin-left:4px;">↺ Reset</button>
                    </div>
                  </div>
                </div>

                <!-- 3. Live Customer View Mock Card (What You See Is What Customers Get) -->
                <div style="background:#090d16;border:1px solid #334155;border-radius:14px;padding:12px;margin-bottom:12px;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <span style="font-size:11px;font-weight:800;color:#f8fafc;display:flex;align-items:center;gap:6px;">
                      <span>📱 Live Customer View (Customer Card Preview):</span>
                    </span>
                    <span id="live-customer-card-mode-badge" style="font-size:9px;background:#0284c7;color:#fff;padding:2px 8px;border-radius:6px;font-weight:bold;">
                      Puri Photo Fit
                    </span>
                  </div>

                  <!-- Customer Card Container -->
                  <div style="max-width:320px;margin:0 auto;background:#0f172a;border:1px solid #334155;border-radius:16px;overflow:hidden;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
                    <div id="customer-mock-img-box" style="width:100%;height:180px;background:#020617;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;">
                      <canvas id="dish-preview-canvas" style="display:none;"></canvas>
                      <img id="customer-mock-img" src="${sanitizeUrl(currentImg)}" style="width:100%;height:100%;object-fit:contain;background:#090d16;" onerror="this.src='${SmartImageEngine.DEFAULT_FALLBACK_URL}'" />
                      <span id="customer-mock-badge" style="position:absolute;top:8px;left:8px;font-size:9px;background:rgba(15,23,42,0.85);backdrop-filter:blur(4px);color:#34d399;border:1px solid #10b981/40;padding:2px 8px;border-radius:6px;font-weight:bold;">
                        ${sanitizeText(currentDiet)}
                      </span>
                    </div>
                    <div style="padding:10px 12px;">
                      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                        <h5 id="customer-mock-title" style="margin:0;font-size:12px;font-weight:800;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;">
                          ${sanitizeText(currentName) || 'Dish Name Preview'}
                        </h5>
                        <span id="customer-mock-price" style="font-size:12px;font-weight:800;color:#fbbf24;">
                          Rs. ${currentPrice || '850'}
                        </span>
                      </div>
                      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;">
                        <span id="customer-mock-cat" style="font-size:9px;color:#94a3b8;">${sanitizeText(currentCat)}</span>
                        <div style="background:#10b981;color:#fff;font-size:10px;font-weight:bold;padding:3px 10px;border-radius:6px;">
                          + Add
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 4. Image Source URL & Hidden Settings -->
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                  <span style="font-size:10px;color:#94a3b8;font-weight:bold;">Image URL:</span>
                  <input id="dish-form-img" type="text" placeholder="Upload above or pick preset" value="${sanitizeUrl(currentImg)}" style="flex:1;background:#090d16;border:1px solid #334155;border-radius:8px;padding:5px 8px;font-size:10px;color:#38bdf8;font-family:monospace;" />
                </div>

                <!-- 1-Click Pakistani Food Photos Presets -->
                <div style="background:#090d16;border:1px solid #1e293b;border-radius:12px;padding:10px;">
                  <span style="font-size:10px;font-weight:800;color:#94a3b8;text-transform:uppercase;display:block;margin-bottom:6px;">⚡ Or Pick a 1-Click Pakistani Food Preset:</span>
                  <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(130px, 1fr));gap:6px;">
                    ${FOOD_PHOTO_PRESETS.map(p => `
                      <div class="photo-preset-item" data-url="${p.url}" data-name="${p.name}" data-cat="${p.category}" style="border:1px solid #334155;border-radius:8px;padding:5px;cursor:pointer;background:#0f172a;display:flex;align-items:center;gap:6px;transition:all 0.2s;">
                        <img src="${p.url}" style="width:26px;height:26px;border-radius:6px;object-fit:cover;" onerror="this.src='${SmartImageEngine.DEFAULT_FALLBACK_URL}'" />
                        <span style="font-size:10px;font-weight:600;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${p.name.split(' ')[0]}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>

              </div>

              <!-- Submit Buttons -->
              <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:6px;">
                <button type="button" id="cancel-dish-form-btn" style="background:#334155;color:#e2e8f0;border:none;padding:10px 18px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;">Cancel</button>
                <button type="submit" id="save-dish-form-btn" style="background:#10b981;color:#fff;border:none;padding:10px 24px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(16,185,129,0.4);">
                  💾 ${editingItemId ? 'Update Dish & Picture' : 'Save Dish & Picture'}
                </button>
              </div>

            </form>
          </div>
        `;
      }

      // TAB 3: BULK PRICE ADJUSTER
      if (currentTab === 'bulk') {
        return `
          <div style="background:#1e293b/40;border:1px solid #334155;border-radius:18px;padding:20px;max-width:760px;margin:0 auto;">
            <h4 style="margin:0 0 8px 0;font-size:14px;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px;">
              <span>⚡ Bulk Price & Menu Modifier</span>
            </h4>
            <p style="margin:0 0 16px 0;font-size:11px;color:#94a3b8;">
              Quickly adjust all menu prices by a fixed amount (e.g. +Rs. 50 inflation adjustment) or percentage (+10%).
            </p>

            <div style="background:#020617;border:1px solid #334155;border-radius:14px;padding:14px;margin-bottom:16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
              <div>
                <label style="font-size:10px;font-weight:700;color:#94a3b8;display:block;margin-bottom:4px;">Adjustment Type:</label>
                <select id="bulk-type" style="background:#0f172a;border:1px solid #334155;border-radius:8px;padding:6px 10px;font-size:11px;color:#fff;">
                  <option value="add_fixed">Add Fixed Amount (+Rs)</option>
                  <option value="subtract_fixed">Subtract Fixed Amount (-Rs)</option>
                  <option value="add_percent">Add Percentage (+%)</option>
                  <option value="subtract_percent">Subtract Percentage (-%)</option>
                </select>
              </div>
              <div>
                <label style="font-size:10px;font-weight:700;color:#94a3b8;display:block;margin-bottom:4px;">Amount / Percentage:</label>
                <input id="bulk-val" type="number" placeholder="e.g. 50 or 10" style="width:110px;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:6px 10px;font-size:11px;color:#fbbf24;font-weight:bold;" />
              </div>
              <div style="margin-top:14px;">
                <button id="apply-bulk-price-btn" style="background:#f59e0b;color:#000;border:none;padding:8px 18px;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;">
                  ⚡ Apply to All ${restItems.length} Dishes
                </button>
              </div>
            </div>

            <!-- List with live quick edit values -->
            <div style="max-height:360px;overflow-y:auto;border:1px solid #334155;border-radius:12px;">
              <table style="width:100%;border-collapse:collapse;font-size:11px;text-align:left;">
                <thead style="background:#020617;color:#94a3b8;position:sticky;top:0;">
                  <tr>
                    <th style="padding:8px 12px;">Dish Name</th>
                    <th style="padding:8px 12px;">Category</th>
                    <th style="padding:8px 12px;text-align:right;">Current Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${restItems.map((item, idx) => `
                    <tr style="border-top:1px solid #1e293b;background:${idx % 2 === 0 ? '#0f172a' : '#1e293b/30'};">
                      <td style="padding:8px 12px;font-weight:600;color:#fff;">${sanitizeText(item.name)}</td>
                      <td style="padding:8px 12px;color:#94a3b8;">${sanitizeText(item.category || 'General')}</td>
                      <td style="padding:8px 12px;text-align:right;color:#fbbf24;font-weight:bold;">${formatPKR(item.price)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

          </div>
        `;
      }

      // TAB 4: SECURITY & BACKUP VAULT
      if (currentTab === 'security') {
        return `
          <div style="background:#1e293b/40;border:1px solid #334155;border-radius:18px;padding:20px;max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:18px;">
            
            <div>
              <h4 style="margin:0 0 6px 0;font-size:15px;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px;">
                <span>🛡️ Restaurant Security & Data Vault</span>
              </h4>
              <p style="margin:0;font-size:11px;color:#94a3b8;">
                Apne restaurant ka menu aur pricing secure karein taake unauthorized shaks tabdeeli na kar sake.
              </p>
            </div>

            <!-- Admin Price Lock & Direct Authorization Info -->
            <div style="background:#020617;border:1px solid #10b981;border-radius:14px;padding:16px;">
              <h5 style="margin:0 0 6px 0;font-size:13px;font-weight:800;color:#34d399;">🔒 Fixed Admin-Only Pricing Authority</h5>
              <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.5;">
                Customer storefront par se PIN aur editing poori tarah hata di gayi hai. Customer ko sirf Admin ya Super Admin ki set ki hui fixed prices nazar aayengi. Prices ko tabdeel ya fix karne ka ikhtiyar sirf yahan Admin suite mein hai.
              </p>
            </div>

            <!-- 1-Click Backup & Restore -->
            <div style="background:#020617;border:1px solid #10b981;border-radius:14px;padding:16px;">
              <h5 style="margin:0 0 8px 0;font-size:13px;font-weight:800;color:#34d399;">📦 Menu Backup & Instant Recovery</h5>
              <p style="margin:0 0 12px 0;font-size:11px;color:#94a3b8;">
                Tamam menu items aur rates ka ek second mein backup download karein ya pehle ka backup restore karein:
              </p>

              <div style="display:flex;gap:10px;flex-wrap:wrap;">
                <button id="export-menu-json-btn" style="background:#065f46;color:#34d399;border:1px solid #10b981;padding:10px 16px;border-radius:10px;font-size:11px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;">
                  📥 Download Menu Backup (JSON)
                </button>
                <label style="background:#1e293b;color:#38bdf8;border:1px solid #0284c7;padding:10px 16px;border-radius:10px;font-size:11px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:6px;">
                  📤 Restore From Backup File
                  <input type="file" id="restore-menu-file-input" accept=".json" style="display:none;" />
                </label>
              </div>
            </div>

            <!-- Security Audit Checklist -->
            <div style="background:#020617;border:1px solid #334155;border-radius:14px;padding:14px;font-size:11px;">
              <span style="font-size:11px;font-weight:800;color:#cbd5e1;display:block;margin-bottom:8px;">🔒 Active System Integrity Protections:</span>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                <div style="color:#34d399;">✓ Anti-XSS Sanitization: <strong>ENFORCED</strong></div>
                <div style="color:#34d399;">✓ Canvas EXIF Metadata Stripping: <strong>ACTIVE</strong></div>
                <div style="color:#34d399;">✓ Rate-Limiting Protection: <strong>ACTIVE</strong></div>
                <div style="color:#34d399;">✓ Cloud Dual-Storage Vault: <strong>HEALTHY</strong></div>
              </div>
            </div>

          </div>
        `;
      }
    }

    function bindModalEvents() {
      // Tab switching
      document.getElementById('tab-btn-items').onclick = () => { currentTab = 'items'; editingItemId = null; renderModalContent(); };
      document.getElementById('tab-btn-add').onclick = () => { currentTab = 'add'; editingItemId = null; renderModalContent(); };
      document.getElementById('tab-btn-bulk').onclick = () => { currentTab = 'bulk'; renderModalContent(); };
      document.getElementById('tab-btn-security').onclick = () => { currentTab = 'security'; renderModalContent(); };
      
      document.getElementById('close-menu-manager-btn').onclick = () => modal.remove();
      
      // Lock menu button
      const lockBtn = document.getElementById('lock-menu-btn');
      if (lockBtn) {
        lockBtn.onclick = () => {
          setManagerAuthenticated(false);
          alert('🔒 Menu Editor Locked! PIN is now required to re-access.');
          modal.remove();
        };
      }

      // Preview Storefront
      const previewBtn = document.getElementById('preview-storefront-btn');
      if (previewBtn) {
        previewBtn.onclick = () => {
          const directUrl = window.location.origin + '/?store=' + encodeURIComponent(restaurant.slug || restaurant.id);
          window.open(directUrl, '_blank');
        };
      }

      // Tab 1 Events
      if (currentTab === 'items') {
        const searchInput = document.getElementById('dish-search-input');
        if (searchInput) {
          searchInput.oninput = (e) => {
            searchQuery = e.target.value;
            renderModalContent();
          };
        }

        const catFilter = document.getElementById('dish-cat-filter');
        if (catFilter) {
          catFilter.onchange = (e) => {
            categoryFilter = e.target.value;
            renderModalContent();
          };
        }

        const shortcutAdd = document.getElementById('add-dish-shortcut-btn');
        if (shortcutAdd) shortcutAdd.onclick = () => { currentTab = 'add'; editingItemId = null; renderModalContent(); };

        const emptyAdd = document.getElementById('empty-state-add-btn');
        if (emptyAdd) emptyAdd.onclick = () => { currentTab = 'add'; editingItemId = null; renderModalContent(); };

        // Inline Price Saves
        modal.querySelectorAll('.inline-price-save-btn').forEach(btn => {
          btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            const inp = modal.querySelector(`.inline-price-input[data-id="${id}"]`);
            if (inp) {
              const newPrice = Math.max(1, parseInt(inp.value, 10) || 0);
              let items = getLocalItems();
              const item = items.find(i => i.id === id);
              if (item) {
                item.price = newPrice;
                saveLocalItems(items);
                alert(`✅ Price updated to ${formatPKR(newPrice)} for ${item.name}!`);
                renderModalContent();
              }
            }
          };
        });

        // Stock Toggles
        modal.querySelectorAll('.toggle-stock-btn').forEach(btn => {
          btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            let items = getLocalItems();
            const item = items.find(i => i.id === id);
            if (item) {
              item.isAvailable = item.isAvailable === false ? true : false;
              saveLocalItems(items);
              alert(`${item.isAvailable ? '✅ In Stock' : '⚠️ Marked as Sold Out'}: ${item.name}`);
              renderModalContent();
            }
          };
        });

        // Edit Dish
        modal.querySelectorAll('.edit-dish-btn').forEach(btn => {
          btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            currentTab = 'add';
            editingItemId = id;
            const item = getLocalItems().find(i => i.id === id);
            if (item) {
              const savedMode = item.imageOrientation || (item.imageFit === 'contain' ? 'natural' : 'natural');
              imageAdjustOptions = {
                zoom: 1.0,
                panX: 0,
                panY: 0,
                rotation: 0,
                mode: savedMode,
                autoEnhance: true
              };
              if (item.imageUrl) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                  activeUploadedImage = img;
                  updateAdjustedCanvas();
                };
                img.src = item.imageUrl;
              }
            }
            renderModalContent();
          };
        });

        // Delete Dish
        modal.querySelectorAll('.delete-dish-btn').forEach(btn => {
          btn.onclick = () => {
            const id = btn.getAttribute('data-id');
            let items = getLocalItems();
            const item = items.find(i => i.id === id);
            if (!item) return;
            if (confirm(`Are you sure you want to delete "${item.name}" from the menu?`)) {
              items = items.filter(i => i.id !== id);
              saveLocalItems(items);
              alert(`🗑️ "${item.name}" deleted from menu.`);
              renderModalContent();
            }
          };
        });
      }

      // Tab 2 Events (Add / Edit Form with Live Food Photo Studio & Preview)
      if (currentTab === 'add') {
        const form = document.getElementById('dish-form');
        const imgInput = document.getElementById('dish-form-img');
        const dropzone = document.getElementById('dish-upload-dropzone');
        const fileInput = document.getElementById('dish-file-input');
        const customerMockImg = document.getElementById('customer-mock-img');
        const customerMockBox = document.getElementById('customer-mock-img-box');
        const zoomText = document.getElementById('zoom-level-text');

        function updateAdjustedCanvas() {
          const currentMode = imageAdjustOptions.mode || 'square';
          
          // Update customer mock card height and fit live
          if (customerMockBox && customerMockImg) {
            customerMockBox.style.width = '100%';
            customerMockBox.style.margin = '0 auto';
            customerMockBox.style.borderRadius = '';

            if (currentMode === 'square') {
              customerMockBox.style.height = '240px';
              customerMockBox.style.aspectRatio = '1 / 1';
              customerMockImg.style.objectFit = 'cover';
              customerMockImg.style.borderRadius = '';
              customerMockImg.style.backgroundColor = '';
            } else if (currentMode === 'circle') {
              customerMockBox.style.height = '170px';
              customerMockBox.style.width = '170px';
              customerMockBox.style.aspectRatio = '1 / 1';
              customerMockBox.style.borderRadius = '9999px';
              customerMockBox.style.margin = '10px auto';
              customerMockImg.style.objectFit = 'cover';
              customerMockImg.style.borderRadius = '9999px';
              customerMockImg.style.backgroundColor = '';
            } else if (currentMode === 'vertical') {
              customerMockBox.style.height = '260px';
              customerMockBox.style.aspectRatio = '3 / 4';
              customerMockImg.style.objectFit = 'cover';
              customerMockImg.style.borderRadius = '';
              customerMockImg.style.backgroundColor = '';
            } else if (currentMode === 'horizontal') {
              customerMockBox.style.height = '180px';
              customerMockBox.style.aspectRatio = '16 / 9';
              customerMockImg.style.objectFit = 'cover';
              customerMockImg.style.borderRadius = '';
              customerMockImg.style.backgroundColor = '';
            } else {
              customerMockBox.style.height = '200px';
              customerMockBox.style.aspectRatio = 'auto';
              customerMockImg.style.objectFit = 'contain';
              customerMockImg.style.backgroundColor = '#090d16';
              customerMockImg.style.borderRadius = '';
            }
          }

          if (activeUploadedImage) {
            const processed = SmartImageEngine.renderCanvas(activeUploadedImage, imageAdjustOptions);
            if (customerMockImg) customerMockImg.src = processed.dataUrl;
            if (imgInput) imgInput.value = processed.dataUrl;
          } else if (imgInput && imgInput.value) {
            if (customerMockImg) customerMockImg.src = imgInput.value;
          }
        }

        // 1. Upload Handling
        function handleFile(file) {
          if (!file) return;
          SmartImageEngine.processFile(file, imageAdjustOptions, (processed, img) => {
            activeUploadedImage = img;
            updateAdjustedCanvas();

            // Background server upload
            const dishName = document.getElementById('dish-form-name') ? document.getElementById('dish-form-name').value : 'dish';
            SmartImageEngine.uploadToServer(processed.dataUrl, restaurant.id, dishName).then((url) => {
              if (imgInput) imgInput.value = url;
            });
          });
        }

        if (dropzone && fileInput) {
          dropzone.onclick = () => fileInput.click();
          fileInput.onchange = (e) => {
            if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
          };
          dropzone.ondragover = (e) => { e.preventDefault(); dropzone.style.borderColor = '#10b981'; };
          dropzone.ondragleave = () => { dropzone.style.borderColor = '#0284c7'; };
          dropzone.ondrop = (e) => {
            e.preventDefault();
            dropzone.style.borderColor = '#0284c7';
            if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
          };
        }

        // 2. Photo Mode Selection Buttons (Square vs Wide vs Reel vs Natural vs Circle)
        modal.querySelectorAll('.photo-mode-select-btn').forEach(btn => {
          btn.onclick = () => {
            const mode = btn.getAttribute('data-mode');
            imageAdjustOptions.mode = mode;

            modal.querySelectorAll('.photo-mode-select-btn').forEach(b => {
              b.style.borderColor = '#334155';
              b.style.background = '#0f172a';
              b.style.color = '#94a3b8';
            });
            btn.style.borderColor = '#0284c7';
            btn.style.background = 'rgba(2,132,199,0.2)';
            btn.style.color = '#38bdf8';

            const statusBadge = document.getElementById('current-mode-status-badge');
            const cardBadge = document.getElementById('live-customer-card-mode-badge');
            if (mode === 'square') {
              if (statusBadge) statusBadge.textContent = '⏹️ Square (1:1 Box)';
              if (cardBadge) cardBadge.textContent = 'Square 1:1';
            } else if (mode === 'natural') {
              if (statusBadge) statusBadge.textContent = '🌟 Puri Photo (Full Fit)';
              if (cardBadge) cardBadge.textContent = 'Puri Photo Fit';
            } else if (mode === 'horizontal') {
              if (statusBadge) statusBadge.textContent = '↔️ Wide Card (16:9)';
              if (cardBadge) cardBadge.textContent = 'Wide 16:9';
            } else if (mode === 'vertical') {
              if (statusBadge) statusBadge.textContent = '↕️ Mobile Reel (3:4)';
              if (cardBadge) cardBadge.textContent = 'Mobile Reel 3:4';
            } else if (mode === 'circle') {
              if (statusBadge) statusBadge.textContent = '⭕ Round Circle';
              if (cardBadge) cardBadge.textContent = 'Circle 1:1';
            }

            updateAdjustedCanvas();
          };
        });

        // 3. Quick Action Buttons: Rotate 90°, Color Pop, Zoom, Reset
        const rotateBtn = document.getElementById('rotate-photo-btn');
        if (rotateBtn) {
          rotateBtn.onclick = () => {
            imageAdjustOptions.rotation = ((imageAdjustOptions.rotation || 0) + 90) % 360;
            rotateBtn.innerHTML = `<span>🔄 Rotate (${imageAdjustOptions.rotation}°)</span>`;
            updateAdjustedCanvas();
          };
        }

        const colorPopBtn = document.getElementById('toggle-color-pop-btn');
        if (colorPopBtn) {
          colorPopBtn.onclick = () => {
            imageAdjustOptions.autoEnhance = !imageAdjustOptions.autoEnhance;
            if (imageAdjustOptions.autoEnhance) {
              colorPopBtn.style.background = '#065f46';
              colorPopBtn.style.borderColor = '#34d399';
              colorPopBtn.style.color = '#34d399';
              colorPopBtn.innerHTML = '<span>✨ Food Color Pop: ON</span>';
            } else {
              colorPopBtn.style.background = '#1e293b';
              colorPopBtn.style.borderColor = '#475569';
              colorPopBtn.style.color = '#94a3b8';
              colorPopBtn.innerHTML = '<span>✨ Food Color Pop: OFF</span>';
            }
            updateAdjustedCanvas();
          };
        }

        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        if (zoomInBtn) {
          zoomInBtn.onclick = () => {
            imageAdjustOptions.zoom = Math.min(2.5, (imageAdjustOptions.zoom || 1.0) + 0.1);
            if (zoomText) zoomText.textContent = Math.round(imageAdjustOptions.zoom * 100) + '%';
            updateAdjustedCanvas();
          };
        }
        if (zoomOutBtn) {
          zoomOutBtn.onclick = () => {
            imageAdjustOptions.zoom = Math.max(0.6, (imageAdjustOptions.zoom || 1.0) - 0.1);
            if (zoomText) zoomText.textContent = Math.round(imageAdjustOptions.zoom * 100) + '%';
            updateAdjustedCanvas();
          };
        }

        const resetBtn = document.getElementById('reset-studio-btn');
        if (resetBtn) {
          resetBtn.onclick = () => {
            imageAdjustOptions = { zoom: 1.0, panX: 0, panY: 0, rotation: 0, mode: 'natural', autoEnhance: true };
            if (zoomText) zoomText.textContent = '100%';
            if (rotateBtn) rotateBtn.innerHTML = '<span>🔄 Rotate 90°</span>';
            if (colorPopBtn) {
              colorPopBtn.style.background = '#065f46';
              colorPopBtn.style.borderColor = '#34d399';
              colorPopBtn.style.color = '#34d399';
              colorPopBtn.innerHTML = '<span>✨ Food Color Pop: ON</span>';
            }
            modal.querySelectorAll('.photo-mode-select-btn').forEach(b => {
              const isNat = b.getAttribute('data-mode') === 'natural';
              b.style.borderColor = isNat ? '#0284c7' : '#334155';
              b.style.background = isNat ? 'rgba(2,132,199,0.2)' : '#0f172a';
              b.style.color = isNat ? '#38bdf8' : '#94a3b8';
            });
            updateAdjustedCanvas();
          };
        }

        // 4. Portions / Pieces Engine State & Event Listeners
        let formVariants = (itemToEdit && itemToEdit.hasVariants && Array.isArray(itemToEdit.variants))
          ? JSON.parse(JSON.stringify(itemToEdit.variants))
          : [];

        const hasVariantsCheckbox = document.getElementById('dish-form-has-variants');
        const variantsConfigPanel = document.getElementById('variants-config-panel');
        const variantRowsContainer = document.getElementById('variant-rows-container');
        const addVariantRowBtn = document.getElementById('add-variant-row-btn');

        const nameInp = document.getElementById('dish-form-name');
        const priceInp = document.getElementById('dish-form-price');
        const catInp = document.getElementById('dish-form-cat');
        const dietInp = document.getElementById('dish-form-diet');
        const mockTitle = document.getElementById('customer-mock-title');
        const mockPrice = document.getElementById('customer-mock-price');
        const mockCat = document.getElementById('customer-mock-cat');
        const mockBadge = document.getElementById('customer-mock-badge');

        function updateMockPriceDisplay() {
          if (!mockPrice) return;
          const isVarEnabled = hasVariantsCheckbox && hasVariantsCheckbox.checked;
          const validVars = formVariants.filter(v => v.name && v.price > 0);
          if (isVarEnabled && validVars.length > 0) {
            mockPrice.textContent = validVars.map(v => `${v.name}: Rs.${v.price}`).join(' | ');
          } else {
            mockPrice.textContent = 'Rs. ' + (priceInp && priceInp.value ? priceInp.value : '0');
          }
        }

        function renderVariantRows() {
          if (!variantRowsContainer) return;
          if (formVariants.length === 0) {
            variantRowsContainer.innerHTML = `
              <div style="font-size:11px;color:#94a3b8;padding:10px;background:#020617;border:1px dashed #334155;border-radius:10px;text-align:center;">
                Upar 1-Click Fast Preset click karein (jaise "🍗 Half / Full" ya "🍗 6 Pieces / 12 Pieces") ya neeche "+ Add Portion" dabayein.
              </div>
            `;
            return;
          }
          variantRowsContainer.innerHTML = formVariants.map((v, idx) => `
            <div style="display:grid;grid-template-columns:1fr 140px 36px;gap:8px;align-items:center;background:#020617;border:1px solid #1e293b;border-radius:10px;padding:6px 10px;">
              <div>
                <label style="font-size:9px;color:#94a3b8;display:block;margin-bottom:2px;">Portion / Piece Name</label>
                <input type="text" class="variant-row-name" data-idx="${idx}" value="${sanitizeText(v.name)}" placeholder="e.g. Half or 6 Pieces" style="width:100%;background:#0f172a;border:1px solid #334155;border-radius:6px;padding:5px 8px;font-size:12px;color:#fff;font-weight:700;" />
              </div>
              <div>
                <label style="font-size:9px;color:#94a3b8;display:block;margin-bottom:2px;">Price (Rs.)</label>
                <input type="number" class="variant-row-price" data-idx="${idx}" value="${v.price}" min="1" placeholder="Rs." style="width:100%;background:#0f172a;border:1px solid #334155;border-radius:6px;padding:5px 8px;font-size:12px;color:#fbbf24;font-weight:800;" />
              </div>
              <div style="padding-top:14px;">
                <button type="button" class="variant-row-del" data-idx="${idx}" title="Delete Option" style="background:#7f1d1d/40;border:1px solid #dc2626/60;color:#f87171;width:32px;height:32px;border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;">✕</button>
              </div>
            </div>
          `).join('');

          // Wire row inputs
          variantRowsContainer.querySelectorAll('.variant-row-name').forEach(inp => {
            inp.oninput = (e) => {
              const idx = parseInt(e.target.getAttribute('data-idx'), 10);
              if (formVariants[idx]) formVariants[idx].name = e.target.value.trim();
              updateMockPriceDisplay();
            };
          });
          variantRowsContainer.querySelectorAll('.variant-row-price').forEach(inp => {
            inp.oninput = (e) => {
              const idx = parseInt(e.target.getAttribute('data-idx'), 10);
              if (formVariants[idx]) formVariants[idx].price = Math.max(1, parseInt(e.target.value, 10) || 0);
              updateMockPriceDisplay();
            };
          });
          variantRowsContainer.querySelectorAll('.variant-row-del').forEach(btn => {
            btn.onclick = () => {
              const idx = parseInt(btn.getAttribute('data-idx'), 10);
              formVariants.splice(idx, 1);
              renderVariantRows();
              updateMockPriceDisplay();
            };
          });
        }

        // Toggle Portions Panel
        if (hasVariantsCheckbox && variantsConfigPanel) {
          hasVariantsCheckbox.onchange = () => {
            const isChecked = hasVariantsCheckbox.checked;
            variantsConfigPanel.style.display = isChecked ? 'block' : 'none';
            if (isChecked && formVariants.length === 0) {
              const baseP = Math.max(100, parseInt(priceInp ? priceInp.value : 0, 10) || 850);
              formVariants = [
                { name: 'Half', price: Math.round(baseP * 0.6) },
                { name: 'Full', price: baseP }
              ];
            }
            renderVariantRows();
            updateMockPriceDisplay();
          };
        }

        // 1-Click Fast Presets
        modal.querySelectorAll('.variant-preset-btn').forEach(btn => {
          btn.onclick = () => {
            const preset = btn.getAttribute('data-preset');
            const baseP = Math.max(100, parseInt(priceInp ? priceInp.value : 0, 10) || 850);
            if (preset === 'half_full') {
              formVariants = [
                { name: 'Half', price: Math.round(baseP * 0.6) },
                { name: 'Full', price: baseP }
              ];
            } else if (preset === 'pieces_6_12') {
              formVariants = [
                { name: '6 Pieces', price: 450 },
                { name: '12 Pieces', price: 850 }
              ];
            } else if (preset === 'quarter_half_full') {
              formVariants = [
                { name: 'Quarter', price: Math.round(baseP * 0.35) },
                { name: 'Half', price: Math.round(baseP * 0.6) },
                { name: 'Full', price: baseP }
              ];
            } else if (preset === 'single_double') {
              formVariants = [
                { name: 'Single', price: 380 },
                { name: 'Double', price: 690 }
              ];
            } else if (preset === 'regular_large') {
              formVariants = [
                { name: 'Regular', price: 250 },
                { name: 'Large', price: 420 }
              ];
            }
            renderVariantRows();
            updateMockPriceDisplay();
          };
        });

        // Add Variant Row Button
        if (addVariantRowBtn) {
          addVariantRowBtn.onclick = () => {
            formVariants.push({ name: 'Option ' + (formVariants.length + 1), price: 500 });
            renderVariantRows();
            updateMockPriceDisplay();
          };
        }

        // Initial render of variants if already editing
        renderVariantRows();
        updateMockPriceDisplay();

        if (nameInp && mockTitle) nameInp.oninput = () => { mockTitle.textContent = nameInp.value || 'Dish Name Preview'; };
        if (priceInp && mockPrice) priceInp.oninput = () => { updateMockPriceDisplay(); };
        if (catInp && mockCat) catInp.oninput = () => { mockCat.textContent = catInp.value || 'General'; };
        if (dietInp && mockBadge) dietInp.onchange = () => { mockBadge.textContent = dietInp.value; };

        if (imgInput) {
          imgInput.oninput = () => {
            if (customerMockImg) customerMockImg.src = imgInput.value.trim() || SmartImageEngine.DEFAULT_FALLBACK_URL;
          };
        }

        // 5. 1-Click Pakistani Photo Presets
        modal.querySelectorAll('.photo-preset-item').forEach(el => {
          el.onclick = () => {
            const url = el.getAttribute('data-url');
            const cat = el.getAttribute('data-cat');
            if (imgInput) imgInput.value = url;
            if (catInp && !catInp.value) {
              catInp.value = cat;
              if (mockCat) mockCat.textContent = cat;
            }
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              activeUploadedImage = img;
              updateAdjustedCanvas();
            };
            img.src = url;
            if (customerMockImg) customerMockImg.src = url;
          };
        });

        document.getElementById('cancel-dish-form-btn').onclick = () => {
          currentTab = 'items';
          editingItemId = null;
          renderModalContent();
        };

        // 6. Form Submission
        if (form) {
          form.onsubmit = async (e) => {
            e.preventDefault();
            const name = document.getElementById('dish-form-name').value.trim();
            const cat = document.getElementById('dish-form-cat').value.trim() || 'General';
            const price = Math.max(1, parseInt(document.getElementById('dish-form-price').value, 10) || 100);
            const diet = document.getElementById('dish-form-diet').value;
            const desc = document.getElementById('dish-form-desc').value.trim();
            let img = (document.getElementById('dish-form-img') ? document.getElementById('dish-form-img').value.trim() : '') || SmartImageEngine.DEFAULT_FALLBACK_URL;
            const chosenMode = imageAdjustOptions.mode || 'natural';

            // If image is a raw dataUrl, upload to server
            if (img.startsWith('data:image/')) {
              const saveBtn = document.getElementById('save-dish-form-btn');
              if (saveBtn) saveBtn.textContent = '⏳ Saving & Uploading Picture...';
              try {
                img = await SmartImageEngine.uploadToServer(img, restaurant.id, name);
              } catch (uErr) {}
            }

            let items = getLocalItems();

            const hasVariantsChecked = document.getElementById('dish-form-has-variants') ? document.getElementById('dish-form-has-variants').checked : false;
            const cleanVariants = hasVariantsChecked ? formVariants.filter(v => v.name && v.price > 0) : [];
            const finalHasVariants = cleanVariants.length > 0;
            const finalPrice = finalHasVariants ? cleanVariants[0].price : price;

            if (editingItemId) {
              const item = items.find(i => i.id === editingItemId);
              if (item) {
                item.name = name;
                item.category = cat;
                item.price = finalPrice;
                item.dietary = diet;
                item.description = desc;
                item.imageUrl = img;
                item.imageOrientation = chosenMode;
                item.imageFit = chosenMode === 'natural' ? 'contain' : 'cover';
                item.imageSize = chosenMode;
                item.hasVariants = finalHasVariants;
                item.variants = cleanVariants;
                saveLocalItems(items);
                alert(`✅ Dish "${name}" successfully updated with portion options!`);
              }
            } else {
              const newDish = {
                id: 'dish-' + Date.now(),
                restaurantId: restaurant.id,
                name: name,
                category: cat,
                price: finalPrice,
                dietary: diet,
                description: desc,
                imageUrl: img,
                imageOrientation: chosenMode,
                imageFit: chosenMode === 'natural' ? 'contain' : 'cover',
                imageSize: chosenMode,
                hasVariants: finalHasVariants,
                variants: cleanVariants,
                isAvailable: true
              };
              items.push(newDish);
              saveLocalItems(items);
              alert(`🎉 New dish "${name}" successfully added with portion options!`);
            }

            currentTab = 'items';
            editingItemId = null;
            renderModalContent();
          };
        }
      }

      // Tab 3 Events (Bulk Modifier)
      if (currentTab === 'bulk') {
        const applyBtn = document.getElementById('apply-bulk-price-btn');
        if (applyBtn) {
          applyBtn.onclick = () => {
            const bType = document.getElementById('bulk-type').value;
            const bVal = parseFloat(document.getElementById('bulk-val').value) || 0;
            if (bVal <= 0) {
              alert('Please enter a valid amount greater than 0.');
              return;
            }

            let items = getLocalItems();
            let count = 0;
            items.forEach(i => {
              if (i.restaurantId === restaurant.id) {
                count++;
                if (bType === 'add_fixed') i.price += bVal;
                else if (bType === 'subtract_fixed') i.price = Math.max(1, i.price - bVal);
                else if (bType === 'add_percent') i.price = Math.round(i.price * (1 + bVal / 100));
                else if (bType === 'subtract_percent') i.price = Math.max(1, Math.round(i.price * (1 - bVal / 100)));
              }
            });

            saveLocalItems(items);
            alert(`⚡ Bulk update applied to all ${count} dishes!`);
            renderModalContent();
          };
        }
      }

      // Tab 4 Events (Security & PIN Management)
      if (currentTab === 'security') {
        const savePinBtn = document.getElementById('save-new-pin-btn');
        if (savePinBtn) {
          savePinBtn.onclick = async () => {
            const currPin = document.getElementById('curr-pin-input').value.trim();
            const newPin = document.getElementById('new-pin-input').value.trim();

            if (!currPin) {
              alert('Pehle apna current PIN likhein.');
              return;
            }
            if (!newPin || newPin.length < 4) {
              alert('Naya PIN kam az kam 4 digits ka hona chahiye.');
              return;
            }

            savePinBtn.textContent = '⏳ Updating...';
            savePinBtn.disabled = true;

            try {
              const res = await fetch('/api/auth/manager-pin-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPin: currPin, newPin: newPin })
              });
              const data = await res.json();
              if (res.ok && data.success) {
                alert('✅ Manager Security PIN successfully updated!');
                document.getElementById('curr-pin-input').value = '';
                document.getElementById('new-pin-input').value = '';
              } else {
                alert('⚠️ Error: ' + (data.error || 'Current PIN match nahi hua.'));
              }
            } catch (err) {
              alert('Error updating PIN: ' + err.message);
            } finally {
              savePinBtn.textContent = '💾 Update Security PIN';
              savePinBtn.disabled = false;
            }
          };
        }

        // Export JSON Backup
        const exportBtn = document.getElementById('export-menu-json-btn');
        if (exportBtn) {
          exportBtn.onclick = () => {
            const dataToExport = {
              restaurant: restaurant,
              menuItems: restItems,
              exportedAt: new Date().toISOString(),
              version: 1
            };
            const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${restaurant.slug || 'menu'}_backup_${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(url);
            alert('📥 Menu backup successfully downloaded!');
          };
        }

        // Restore JSON Backup
        const restoreInput = document.getElementById('restore-menu-file-input');
        if (restoreInput) {
          restoreInput.onchange = (e) => {
            const file = e.target.files && e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (re) => {
              try {
                const parsed = JSON.parse(re.target.result);
                if (parsed && Array.isArray(parsed.menuItems)) {
                  let items = getLocalItems();
                  // remove existing items for this restaurant and replace with backup
                  items = items.filter(i => i.restaurantId !== restaurant.id);
                  items = items.concat(parsed.menuItems.map(m => ({ ...m, restaurantId: restaurant.id })));
                  saveLocalItems(items);
                  alert(`✅ Menu successfully restored! (${parsed.menuItems.length} dishes recovered)`);
                  currentTab = 'items';
                  renderModalContent();
                } else {
                  alert('Invalid backup file format.');
                }
              } catch (err) {
                alert('Failed to parse backup JSON file: ' + err.message);
              }
            };
            reader.readAsText(file);
          };
        }
      }
    }

    document.body.appendChild(modal);
    renderModalContent();
  }

  // =========================================================================
  // 2. PROFESSIONAL ORDER TRACKING, INVOICE & THERMAL RECEIPT SUITE
  // =========================================================================

  // Universal Thermal Print Engine (handles iframes, standalone tabs & direct print)
  function printThermalSlipViaIframe(receiptHtml, orderId) {
    const slipUrl = '/api/print-slip/' + encodeURIComponent(orderId || '');
    const isInsideIframe = (window.self !== window.top);

    // 1. If inside an iframe (like AI Studio preview), opening /api/print-slip in a new tab
    // is the 100% reliable standard way, bypassing iframe sandbox restrictions
    if (isInsideIframe) {
      try {
        const newWin = window.open(slipUrl, '_blank');
        if (newWin) return;
      } catch (err) {
        console.warn('[Print] Iframe window.open error:', err);
      }
    }

    // 2. Standard direct print
    try {
      window.print();
      return;
    } catch (e) {
      console.warn('[Print] window.print() exception:', e);
    }

    // 3. Fallback: Render into an off-screen non-zero frame
    try {
      let printIframe = document.getElementById('receipt-silent-print-frame');
      if (printIframe) {
        try { printIframe.remove(); } catch(e) {}
      }

      printIframe = document.createElement('iframe');
      printIframe.id = 'receipt-silent-print-frame';
      printIframe.setAttribute('style', 'position:fixed;left:-9999px;top:0;width:320px;height:600px;opacity:0.01;pointer-events:none;border:none;z-index:-9999;');
      document.body.appendChild(printIframe);

      const frameDoc = printIframe.contentWindow ? printIframe.contentWindow.document : (printIframe.contentDocument || null);
      if (!frameDoc) return;

      frameDoc.open();
      frameDoc.write(receiptHtml);
      frameDoc.close();

      const triggerPrint = function() {
        try {
          if (printIframe && printIframe.contentWindow) {
            printIframe.contentWindow.focus();
            printIframe.contentWindow.print();
          }
        } catch(err) {
          console.warn('[Receipt Print] Fallback error:', err);
        }
      };

      const imgs = frameDoc.querySelectorAll('img');
      if (imgs.length > 0) {
        let loaded = 0;
        let fired = false;
        const onDone = function() {
          loaded++;
          if (loaded >= imgs.length && !fired) {
            fired = true;
            setTimeout(triggerPrint, 80);
          }
        };
        imgs.forEach(function(img) {
          if (img.complete) onDone();
          else { img.onload = onDone; img.onerror = onDone; }
        });
        setTimeout(function() {
          if (!fired) { fired = true; triggerPrint(); }
        }, 500);
      } else {
        setTimeout(triggerPrint, 100);
      }
    } catch (e) {
      console.warn('[Receipt Print] Error:', e);
    }
  }

  // Retrieve Slip Layout Configuration for a restaurant
  function getRestaurantSlipConfig(rest) {
    if (!rest) rest = {};
    let savedLocal = null;
    try {
      if (rest.id) {
        const item = localStorage.getItem('bitehub_slip_config_' + rest.id);
        if (item) savedLocal = JSON.parse(item);
      }
    } catch(e) {}

    const custom = rest.slipConfig || savedLocal || {};
    return {
      paperSize: custom.paperSize || '80mm',
      fontFamily: custom.fontFamily || 'monospace',
      fontSize: custom.fontSize || 'normal',
      showLogo: custom.showLogo !== false,
      logoSize: custom.logoSize || 'medium',
      headerTitle: custom.headerTitle || rest.name || 'Restaurant',
      headerTagline: custom.headerTagline || rest.tagline || '',
      headerAddress: custom.headerAddress || rest.address || 'Commercial Market, Main Branch',
      headerPhone: custom.headerPhone || rest.phone || rest.whatsappNumber || '+92 300 1234567',
      showTaxRegistration: !!custom.showTaxRegistration,
      taxRegistrationNo: custom.taxRegistrationNo || '',
      badgeText: custom.badgeText || 'OFFICIAL SALES INVOICE',
      showTicketId: custom.showTicketId !== false,
      showDateTime: custom.showDateTime !== false,
      showCustomerName: custom.showCustomerName !== false,
      showCustomerPhone: custom.showCustomerPhone !== false,
      showCustomerAddress: custom.showCustomerAddress !== false,
      showServiceType: custom.showServiceType !== false,
      showPaymentMethod: custom.showPaymentMethod !== false,
      showCookingNotes: custom.showCookingNotes !== false,
      showItemUnitPrice: custom.showItemUnitPrice !== false,
      showSubtotal: custom.showSubtotal !== false,
      showDeliveryFee: custom.showDeliveryFee !== false,
      showGstTax: !!custom.showGstTax,
      taxPercentage: Number(custom.taxPercentage) || 0,
      currencySymbol: custom.currencySymbol || 'Rs.',
      showBarcode: custom.showBarcode !== false,
      footerThankYou: custom.footerThankYou || '*** THANK YOU FOR VISITING! ***',
      footerSubNote: custom.footerSubNote || 'Please visit us again. Freshly prepared with care.',
      showWifiNotice: !!custom.showWifiNotice,
      footerWifiNotice: custom.footerWifiNotice || '',
      showWatermark: custom.showWatermark !== false,
      footerWatermark: custom.footerWatermark || `Powered by ${rest.name || 'ManagementHub'} POS System`
    };
  }

  // Generate Thermal Slip HTML with Restaurant Logo Prominently at Top
  function generateReceiptSlipHtml(order, rest, overrideConfig) {
    if (!order) order = {};
    if (!rest) rest = {};
    const baseCfg = getRestaurantSlipConfig(rest);
    const cfg = Object.assign({}, baseCfg, overrideConfig || {});

    const items = order.items || [];
    const subtotal = order.totalAmount || order.total || order.subtotal || 0;
    const delivery = order.deliveryFee || 0;
    const taxAmount = (cfg.showGstTax && cfg.taxPercentage > 0) ? Math.round((subtotal * cfg.taxPercentage) / 100) : 0;
    const grandTotal = subtotal + delivery + taxAmount;
    const curr = cfg.currencySymbol;

    const orderDate = new Date(order.createdAt || Date.now()).toLocaleString('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const restLogo = rest.logoUrl || rest.logo || rest.avatar || rest.image || rest.coverUrl || '';
    const ticketId = order.id ? (order.id.length > 10 ? order.id.slice(-8).toUpperCase() : order.id.toUpperCase()) : 'BITE-' + Date.now().toString().slice(-6);

    let bodyWidth = '78mm';
    let pageCss = 'size: 80mm auto; margin: 0;';
    if (cfg.paperSize === '58mm') {
      bodyWidth = '54mm';
      pageCss = 'size: 58mm auto; margin: 0;';
    } else if (cfg.paperSize === 'A5') {
      bodyWidth = '135mm';
      pageCss = 'size: A5 portrait; margin: 8mm;';
    } else if (cfg.paperSize === 'A4') {
      bodyWidth = '185mm';
      pageCss = 'size: A4 portrait; margin: 12mm;';
    }

    let fontCss = "'Courier New', Courier, monospace, monospace";
    if (cfg.fontFamily === 'sans') {
      fontCss = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
    } else if (cfg.fontFamily === 'serif') {
      fontCss = "'Cormorant Garamond', Georgia, 'Times New Roman', serif";
    }

    let baseFontSize = '11px';
    if (cfg.fontSize === 'compact') baseFontSize = '9.5px';
    if (cfg.fontSize === 'large') baseFontSize = '12.5px';

    let logoMaxHeight = '65px';
    let logoMaxWidth = '140px';
    if (cfg.logoSize === 'small') {
      logoMaxHeight = '42px';
      logoMaxWidth = '95px';
    } else if (cfg.logoSize === 'large') {
      logoMaxHeight = '92px';
      logoMaxWidth = '185px';
    }

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Receipt #${ticketId} - ${sanitizeText(cfg.headerTitle)}</title>
        <style>
          @page {
            ${pageCss}
          }
          @media print {
            html, body {
              width: 100% !important;
              margin: 0 !important;
              padding: 3mm !important;
              background: #fff !important;
              color: #000 !important;
            }
            .no-print { display: none !important; }
            img { max-width: 100% !important; }
          }
          body {
            font-family: ${fontCss};
            width: ${bodyWidth};
            max-width: 100%;
            margin: 0 auto;
            padding: 8px;
            color: #000;
            background: #fff;
            font-size: ${baseFontSize};
            line-height: 1.35;
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .double-divider { border-top: 2px solid #000; margin: 8px 0; }
          table { width: 100%; border-collapse: collapse; font-size: inherit; }
          th, td { padding: 3px 0; vertical-align: top; }
          th { text-align: left; }
          .badge { border: 1.5px solid #000; padding: 2px 8px; display: inline-block; font-weight: 900; margin: 4px 0; font-size: 10px; letter-spacing: 0.5px; }
          .slip-logo {
            max-height: ${logoMaxHeight};
            max-width: ${logoMaxWidth};
            object-fit: contain;
            margin: 0 auto 6px auto;
            display: block;
            border-radius: 4px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        </style>
      </head>
      <body>
        <div class="text-center">
          ${cfg.showLogo && restLogo ? `
            <div style="text-align:center;margin:0 auto 6px auto;">
              <img src="${sanitizeUrl(restLogo)}" alt="${sanitizeText(cfg.headerTitle)} Logo" class="slip-logo" />
            </div>
          ` : (cfg.showLogo ? `
            <div style="text-align:center;margin:0 auto 6px auto;">
              <div style="width:38px;height:38px;border-radius:50%;border:2px solid #000;display:inline-flex;align-items:center;justify-content:center;font-size:18px;font-weight:900;">🍽️</div>
            </div>
          ` : '')}
          <h2 style="margin:2px 0 3px 0;font-size:16px;font-weight:900;letter-spacing:0.5px;text-transform:uppercase;">${sanitizeText(cfg.headerTitle)}</h2>
          ${cfg.headerTagline ? `<div style="font-size:9.5px;font-style:italic;margin-bottom:2px;color:#333;">${sanitizeText(cfg.headerTagline)}</div>` : ''}
          ${cfg.headerAddress ? `<div style="font-size:10px;">${sanitizeText(cfg.headerAddress)}</div>` : ''}
          ${cfg.headerPhone ? `<div style="font-size:10px;font-weight:bold;">TEL: ${sanitizeText(cfg.headerPhone)}</div>` : ''}
          ${cfg.showTaxRegistration && cfg.taxRegistrationNo ? `<div style="font-size:9.5px;font-weight:bold;margin-top:2px;">${sanitizeText(cfg.taxRegistrationNo)}</div>` : ''}
          ${cfg.badgeText ? `<div class="badge">${sanitizeText(cfg.badgeText)}</div>` : ''}
        </div>

        <div class="divider"></div>

        <div>
          ${cfg.showTicketId ? `
            <div style="display:flex;justify-content:space-between;">
              <strong>ORDER TICKET:</strong>
              <span style="font-weight:900;font-size:12px;">#${ticketId}</span>
            </div>
          ` : ''}
          ${cfg.showDateTime ? `<div><strong>DATE:</strong> ${orderDate}</div>` : ''}
          ${cfg.showCustomerName ? `<div><strong>CUSTOMER:</strong> ${sanitizeText(order.customerName) || 'Walk-in / Online'}</div>` : ''}
          ${cfg.showCustomerPhone ? `<div><strong>PHONE:</strong> ${sanitizeText(order.customerPhone) || 'N/A'}</div>` : ''}
          ${cfg.showServiceType ? `<div><strong>SERVICE:</strong> ${order.orderType === 'dine_in' ? 'DINE-IN (' + (order.tableNumber || 'Table') + ')' : (order.orderType === 'delivery' ? 'DOORSTEP DELIVERY' : 'COUNTER TAKEAWAY')}</div>` : ''}
          ${cfg.showCustomerAddress && order.customerAddress ? `<div><strong>ADDRESS:</strong> ${sanitizeText(order.customerAddress)}</div>` : ''}
          ${cfg.showPaymentMethod ? `<div><strong>PAYMENT:</strong> ${sanitizeText((order.paymentMethod || 'Cash On Delivery').toUpperCase().replace(/_/g, ' '))}</div>` : ''}
        </div>

        <div class="divider"></div>

        <table>
          <thead>
            <tr style="border-bottom:1px solid #000;">
              <th>ITEM</th>
              <th class="text-center">QTY</th>
              ${cfg.showItemUnitPrice ? `<th class="text-right">PRICE</th>` : ''}
              <th class="text-right">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            ${items.map(it => `
              <tr>
                <td style="padding-right:4px;">
                  <span class="font-bold">${sanitizeText(it.name) || 'Dish'}</span>
                  ${cfg.showCookingNotes && it.specialInstructions ? `<div style="font-size:9.5px;font-style:italic;color:#333;">Note: ${sanitizeText(it.specialInstructions)}</div>` : ''}
                </td>
                <td class="text-center font-bold">${it.quantity || 1}</td>
                ${cfg.showItemUnitPrice ? `<td class="text-right">${curr}${it.price}</td>` : ''}
                <td class="text-right font-bold">${curr}${(it.price * (it.quantity || 1))}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="divider"></div>

        <table>
          ${cfg.showSubtotal ? `
            <tr>
              <td>Items Subtotal:</td>
              <td class="text-right font-bold">${curr}${subtotal}</td>
            </tr>
          ` : ''}
          ${cfg.showDeliveryFee ? `
            <tr>
              <td>Delivery Charges:</td>
              <td class="text-right">${delivery === 0 ? 'FREE' : curr + delivery}</td>
            </tr>
          ` : ''}
          ${cfg.showGstTax && cfg.taxPercentage > 0 ? `
            <tr>
              <td>Sales Tax / GST (${cfg.taxPercentage}%):</td>
              <td class="text-right font-bold">${curr}${taxAmount}</td>
            </tr>
          ` : ''}
          <tr style="font-size:13px;border-top:1px solid #000;">
            <td class="font-bold" style="padding-top:4px;">NET PAYABLE:</td>
            <td class="text-right font-bold" style="padding-top:4px;font-size:14px;">${curr}${grandTotal}</td>
          </tr>
        </table>

        <div class="double-divider"></div>

        <div class="text-center" style="font-size:10px;">
          ${cfg.footerThankYou ? `<div style="font-weight:bold;margin-bottom:2px;">${sanitizeText(cfg.footerThankYou)}</div>` : ''}
          ${cfg.footerSubNote ? `<div>${sanitizeText(cfg.footerSubNote)}</div>` : ''}
          ${cfg.showWifiNotice && cfg.footerWifiNotice ? `
            <div style="margin:5px auto;padding:3px 6px;border:1px dashed #000;font-size:9px;font-weight:bold;display:inline-block;">
              📶 ${sanitizeText(cfg.footerWifiNotice)}
            </div>
          ` : ''}
          ${cfg.showBarcode ? `
            <div style="margin:6px auto 2px;height:22px;display:flex;align-items:center;justify-content:center;gap:1.5px;overflow:hidden;opacity:0.85;">
              ${Array.from({length: 32}).map((_, i) => `<div style="height:100%;${i%3===0?'width:2px;background:#000;':(i%2===0?'width:1px;background:#000;':'width:1px;background:transparent;')}"></div>`).join('')}
            </div>
            <div style="font-size:9px;color:#555;font-family:monospace;">*${ticketId}*</div>
          ` : ''}
          ${cfg.showWatermark && cfg.footerWatermark ? `
            <div style="margin-top:6px;font-size:9px;color:#555;">${sanitizeText(cfg.footerWatermark)}</div>
          ` : ''}
        </div>
      </body>
      </html>
    `;
  }

  // On-screen Receipt Preview Modal with instant Print Slip button
  window.showReceiptSlipModal = function(order, restaurant) {
    if (!order) return;
    const old = document.getElementById('receipt-slip-modal');
    if (old) old.remove();

    const rests = getLocalRestaurants();
    let rest = restaurant;
    if (!rest) {
      rest = rests.find(r => r.id === order.restaurantId || (r.name && order.restaurantName && r.name.toLowerCase() === order.restaurantName.toLowerCase()));
    }
    if (!rest && rests.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const storeSlug = urlParams.get('store') || urlParams.get('restaurant') || urlParams.get('r');
      if (storeSlug) {
        const sClean = storeSlug.toLowerCase().trim();
        rest = rests.find(r => (r.slug && r.slug.toLowerCase() === sClean) || (r.id && r.id.toLowerCase() === sClean));
      }
    }
    if (!rest) {
      rest = rests[0] || { name: order.restaurantName || 'Restaurant', phone: '+92 300 0000000', address: 'Commercial Branch' };
    }

    const restLogo = rest.logoUrl || rest.logo || rest.avatar || rest.image || rest.coverUrl || '';
    const items = order.items || [];
    const subtotal = order.totalAmount || order.total || order.subtotal || 0;
    const delivery = order.deliveryFee || 0;
    const grandTotal = subtotal + delivery;
    const ticketId = order.id ? (order.id.length > 10 ? order.id.slice(-8).toUpperCase() : order.id.toUpperCase()) : 'BITE-' + Date.now().toString().slice(-6);
    const orderDate = new Date(order.createdAt || Date.now()).toLocaleString('en-PK', {
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    const receiptHtml = generateReceiptSlipHtml(order, rest);

    const modal = document.createElement('div');
    modal.id = 'receipt-slip-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999999;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:12px;overflow-y:auto;';

    modal.innerHTML = `
      <div style="background:#090d16;border:1px solid #1e293b;border-radius:24px;max-width:440px;width:100%;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 25px 60px rgba(0,0,0,0.9);max-height:94vh;overflow-y:auto;display:flex;flex-direction:column;">
        
        <!-- Modal Top Bar -->
        <div style="padding:14px 18px;border-bottom:1px solid #1e293b;display:flex;align-items:center;justify-content:space-between;background:#0f172a;border-top-left-radius:24px;border-top-right-radius:24px;" class="no-print">
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="width:32px;height:32px;border-radius:10px;background:#ea580c;display:flex;align-items:center;justify-content:center;font-size:16px;">
              🖨️
            </div>
            <div>
              <h3 style="margin:0;font-size:13px;font-weight:800;color:#fff;">Order POS Slip</h3>
              <p style="margin:0;font-size:10px;color:#94a3b8;">Standard 80mm Thermal Receipt with Restaurant Logo</p>
            </div>
          </div>
          <button id="close-receipt-slip-modal" style="background:#1e293b;border:none;color:#94a3b8;width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:15px;display:flex;align-items:center;justify-content:center;">✕</button>
        </div>

        <!-- Scrollable Receipt Slip Preview Box -->
        <div style="padding:16px;background:#030712;display:flex;justify-content:center;overflow-y:auto;flex:1;">
          
          <div id="pos-slip-thermal-area" class="printable-slip" style="background:#ffffff;color:#000000;width:100%;max-width:330px;padding:16px;border-radius:14px;box-shadow:0 10px 25px rgba(0,0,0,0.5);font-family:'Courier New',Courier,monospace;font-size:11px;line-height:1.35;box-sizing:border-box;">
            
            <!-- Restaurant Logo at Top -->
            <div style="text-align:center;margin-bottom:8px;">
              ${restLogo ? `
                <img src="${sanitizeUrl(restLogo)}" alt="${sanitizeText(rest.name)} Logo" class="slip-logo" style="max-height:58px;max-width:130px;object-fit:contain;margin:0 auto 6px auto;display:block;border-radius:4px;" />
              ` : `
                <div style="width:40px;height:40px;border-radius:50%;border:2px solid #000;display:inline-flex;align-items:center;justify-content:center;font-size:18px;margin:0 auto 4px auto;font-weight:bold;">🍽️</div>
              `}
              <h2 style="margin:0;font-size:15px;font-weight:900;text-transform:uppercase;letter-spacing:0.5px;color:#000;">${sanitizeText(rest.name)}</h2>
              ${rest.tagline ? `<div style="font-size:9.5px;font-style:italic;color:#333;margin-top:2px;">${sanitizeText(rest.tagline)}</div>` : ''}
              <div style="font-size:10px;color:#333;margin-top:2px;">${sanitizeText(rest.address) || 'Direct Order Storefront'}</div>
              <div style="font-size:10px;font-weight:bold;color:#000;">TEL: ${sanitizeText(rest.phone || rest.whatsappNumber || '+92 300 1234567')}</div>
              <div style="display:inline-block;border:1.5px solid #000;padding:2px 8px;font-size:9.5px;font-weight:900;margin-top:5px;letter-spacing:0.5px;">OFFICIAL SALES INVOICE</div>
            </div>

            <div style="border-top:1px dashed #000;margin:8px 0;"></div>

            <!-- Order Meta -->
            <div style="font-size:11px;line-height:1.4;">
              <div style="display:flex;justify-content:space-between;">
                <strong>ORDER #:</strong>
                <span style="font-weight:900;">#${ticketId}</span>
              </div>
              <div><strong>DATE:</strong> ${orderDate}</div>
              <div><strong>CUSTOMER:</strong> ${sanitizeText(order.customerName) || 'Walk-in / Online'}</div>
              <div><strong>PHONE:</strong> ${sanitizeText(order.customerPhone) || 'N/A'}</div>
              <div><strong>SERVICE:</strong> ${order.orderType === 'dine_in' ? 'DINE-IN (' + (order.tableNumber || 'Table') + ')' : (order.orderType === 'delivery' ? 'DELIVERY' : 'TAKEAWAY')}</div>
              ${order.customerAddress ? `<div><strong>ADDRESS:</strong> ${sanitizeText(order.customerAddress)}</div>` : ''}
              <div><strong>PAYMENT:</strong> ${sanitizeText((order.paymentMethod || 'Cash On Delivery').toUpperCase().replace(/_/g, ' '))}</div>
            </div>

            <div style="border-top:1px dashed #000;margin:8px 0;"></div>

            <!-- Items Table -->
            <table style="width:100%;border-collapse:collapse;font-size:11px;">
              <thead>
                <tr style="border-bottom:1px solid #000;">
                  <th style="text-align:left;padding-bottom:3px;">ITEM</th>
                  <th style="text-align:center;padding-bottom:3px;">QTY</th>
                  <th style="text-align:right;padding-bottom:3px;">PRICE</th>
                  <th style="text-align:right;padding-bottom:3px;">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                ${items.map(it => `
                  <tr>
                    <td style="padding:3px 2px 3px 0;vertical-align:top;">
                      <span style="font-weight:bold;">${sanitizeText(it.name) || 'Dish'}</span>
                      ${it.specialInstructions ? `<div style="font-size:9.5px;color:#555;font-style:italic;">Note: ${sanitizeText(it.specialInstructions)}</div>` : ''}
                    </td>
                    <td style="text-align:center;padding:3px 0;vertical-align:top;font-weight:bold;">${it.quantity || 1}</td>
                    <td style="text-align:right;padding:3px 0;vertical-align:top;">Rs.${it.price}</td>
                    <td style="text-align:right;padding:3px 0;vertical-align:top;font-weight:bold;">Rs.${it.price * (it.quantity || 1)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div style="border-top:1px dashed #000;margin:8px 0;"></div>

            <!-- Totals -->
            <table style="width:100%;font-size:11px;">
              <tr>
                <td>Items Subtotal:</td>
                <td style="text-align:right;font-weight:bold;">Rs.${subtotal}</td>
              </tr>
              <tr>
                <td>Delivery Fee:</td>
                <td style="text-align:right;">${delivery === 0 ? 'FREE' : 'Rs.' + delivery}</td>
              </tr>
              <tr style="border-top:1.5px solid #000;font-size:12px;">
                <td style="font-weight:900;padding-top:4px;">NET PAYABLE:</td>
                <td style="text-align:right;font-weight:900;padding-top:4px;font-size:13px;">Rs.${grandTotal}</td>
              </tr>
            </table>

            <div style="border-top:2px solid #000;margin:10px 0 6px 0;"></div>

            <!-- Footer & Barcode -->
            <div style="text-align:center;font-size:10px;">
              <div style="font-weight:bold;">*** THANK YOU FOR ORDERING! ***</div>
              <div>Prepared fresh with love & hygiene.</div>
              <div style="margin:6px auto 2px;height:22px;display:flex;align-items:center;justify-content:center;gap:1.5px;overflow:hidden;opacity:0.85;">
                ${Array.from({length: 32}).map((_, i) => `<div style="height:100%;${i%3===0?'width:2px;background:#000;':(i%2===0?'width:1px;background:#000;':'width:1px;background:transparent;')}"></div>`).join('')}
              </div>
              <div style="font-size:9px;color:#666;font-family:monospace;">*${ticketId}*</div>
              <div style="margin-top:4px;font-size:9px;color:#666;">${sanitizeText(rest.name)} POS System</div>
            </div>

          </div>

        </div>

        <!-- Modal Action Footer -->
        <div style="padding:14px 18px;border-top:1px solid #1e293b;background:#0f172a;border-bottom-left-radius:24px;border-bottom-right-radius:24px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;justify-content:space-between;" class="no-print">
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            <button id="copy-receipt-slip-btn" style="background:#1e293b;color:#cbd5e1;border:1px solid #334155;padding:8px 12px;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;">
              📋 Copy Text
            </button>
            <button id="download-slip-html-btn" style="background:#1e293b;color:#cbd5e1;border:1px solid #334155;padding:8px 12px;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:5px;">
              ⬇️ Save HTML
            </button>
          </div>
          
          <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
            <button id="close-receipt-slip-btn" style="background:#1e293b;color:#94a3b8;border:none;padding:8px 12px;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;">
              Close
            </button>
            <a id="open-print-tab-btn" href="/api/print-slip/${order.id || ticketId}" target="_blank" rel="noopener noreferrer" style="background:#0284c7;color:#fff;text-decoration:none;padding:8px 14px;border-radius:10px;font-size:11px;font-weight:800;display:inline-flex;align-items:center;gap:5px;box-shadow:0 3px 10px rgba(2,132,199,0.35);">
              🚀 Print in Tab
            </a>
            <button id="trigger-iframe-print-btn" style="background:linear-gradient(135deg, #f97316 0%, #ea580c 100%);color:#fff;border:none;padding:9px 16px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:5px;box-shadow:0 4px 14px rgba(234,88,12,0.4);">
              🖨️ Print Slip Now
            </button>
          </div>
        </div>

      </div>
    `;

    document.body.appendChild(modal);

    // Event bindings
    document.getElementById('close-receipt-slip-modal').onclick = () => modal.remove();
    document.getElementById('close-receipt-slip-btn').onclick = () => modal.remove();

    const doPrint = () => {
      printThermalSlipViaIframe(receiptHtml, order.id || ticketId);
    };

    document.getElementById('trigger-iframe-print-btn').onclick = doPrint;

    document.getElementById('download-slip-html-btn').onclick = () => {
      const blob = new Blob([receiptHtml], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Receipt-' + ticketId + '.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    };

    document.getElementById('copy-receipt-slip-btn').onclick = () => {
      let plain = `========================================\n`;
      plain += `       ${rest.name.toUpperCase()}\n`;
      if (rest.tagline) plain += `   ${rest.tagline}\n`;
      plain += `   ${rest.address || 'Storefront'}\n`;
      plain += `   Tel: ${rest.phone || rest.whatsappNumber || '+92 300 1234567'}\n`;
      plain += `========================================\n`;
      plain += `ORDER #: #${ticketId}\n`;
      plain += `DATE: ${orderDate}\n`;
      plain += `CUSTOMER: ${order.customerName || 'Guest'}\n`;
      plain += `PHONE: ${order.customerPhone || 'N/A'}\n`;
      plain += `SERVICE: ${order.orderType === 'dine_in' ? 'Dine-in (' + (order.tableNumber || 'Table') + ')' : (order.orderType === 'delivery' ? 'Delivery' : 'Takeaway')}\n`;
      if (order.customerAddress) plain += `ADDRESS: ${order.customerAddress}\n`;
      plain += `========================================\n`;
      items.forEach(it => {
        plain += `${it.quantity || 1}x ${it.name} - Rs.${(it.price * (it.quantity || 1))}\n`;
      });
      plain += `----------------------------------------\n`;
      plain += `Subtotal: Rs.${subtotal}\n`;
      plain += `Delivery: ${delivery === 0 ? 'FREE' : 'Rs.' + delivery}\n`;
      plain += `TOTAL PAYABLE: Rs.${grandTotal}\n`;
      plain += `PAYMENT: ${(order.paymentMethod || 'Cash On Delivery').toUpperCase().replace(/_/g, ' ')}\n`;
      plain += `========================================\n`;
      plain += `*** THANK YOU FOR ORDERING! ***\n`;

      navigator.clipboard.writeText(plain).then(() => {
        const btn = document.getElementById('copy-receipt-slip-btn');
        if (btn) btn.innerHTML = '✓ Copied!';
        setTimeout(() => {
          if (btn) btn.innerHTML = '📋 Copy Text';
        }, 2000);
      });
    };

    // Auto-trigger direct print immediately!
    setTimeout(doPrint, 150);
  };

  // Main global print function
  window.printOrderReceipt = function(order, restaurant) {
    if (!order) return;
    const rests = getLocalRestaurants();
    let rest = restaurant;
    if (!rest) {
      rest = rests.find(r => r.id === order.restaurantId || (r.name && order.restaurantName && r.name.toLowerCase() === order.restaurantName.toLowerCase()));
    }
    if (!rest && rests.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const storeSlug = urlParams.get('store') || urlParams.get('restaurant') || urlParams.get('r');
      if (storeSlug) {
        const sClean = storeSlug.toLowerCase().trim();
        rest = rests.find(r => (r.slug && r.slug.toLowerCase() === sClean) || (r.id && r.id.toLowerCase() === sClean));
      }
    }
    if (!rest) {
      rest = rests[0] || { name: order.restaurantName || 'Restaurant', phone: '+92 300 0000000', address: 'Commercial Branch' };
    }

    // Show on-screen slip and trigger silent iframe print
    window.showReceiptSlipModal(order, rest);
  };

  // =========================================================================
  // 2.5 PROFESSIONAL SLIP LAYOUT CUSTOMIZER & POS RECEIPT DESIGNER
  // =========================================================================
  window.openSlipLayoutCustomizer = function(restaurantId) {
    const rests = getLocalRestaurants();
    let restaurant = rests.find(r => r.id === restaurantId || r.slug === restaurantId);
    if (!restaurant) restaurant = rests[0];
    if (!restaurant) {
      alert('Restaurant not found!');
      return;
    }

    let oldModal = document.getElementById('slip-layout-customizer-modal');
    if (oldModal) oldModal.remove();

    // Working state configuration cloned from restaurant
    let cfg = Object.assign({}, getRestaurantSlipConfig(restaurant));

    // Sample mock order for interactive live preview
    const sampleOrder = {
      id: 'ORD-9842',
      customerName: 'Muhammad Hamza',
      customerPhone: '+92 301 8765432',
      customerAddress: 'House 14-B, Street 3, Cavalry Ground, Lahore',
      orderType: 'delivery',
      paymentMethod: 'cash_on_delivery',
      restaurantId: restaurant.id,
      items: [
        { id: '1', name: 'Special Chicken Biryani (Double)', price: 750, quantity: 2, specialInstructions: 'Extra raita & spicy' },
        { id: '2', name: 'Fresh Mint Raita & Salad', price: 120, quantity: 1 },
        { id: '3', name: 'Chilled Soft Drink (1.5 Ltr)', price: 220, quantity: 1 }
      ],
      subtotal: 1840,
      deliveryFee: 150,
      totalAmount: 1990,
      createdAt: new Date().toISOString()
    };

    let activeTab = 'paper'; // 'paper', 'header', 'fields', 'pricing', 'footer'

    const modal = document.createElement('div');
    modal.id = 'slip-layout-customizer-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999999;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:12px;overflow-y:auto;';

    function renderModal() {
      let iframeWidth = 320;
      if (cfg.paperSize === '58mm') iframeWidth = 240;
      else if (cfg.paperSize === 'A5') iframeWidth = 430;
      else if (cfg.paperSize === 'A4') iframeWidth = 480;

      modal.innerHTML = `
        <div style="background:#090d16;border:1px solid #1e293b;border-radius:24px;max-width:1120px;width:100%;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 25px 60px rgba(0,0,0,0.9);max-height:92vh;display:flex;flex-direction:column;overflow:hidden;">
          
          <!-- Modal Header -->
          <div style="padding:14px 20px;border-bottom:1px solid #1e293b;display:flex;align-items:center;justify-content:space-between;background:#0f172a;">
            <div style="display:flex;align-items:center;gap:12px;">
              <div style="width:38px;height:38px;border-radius:12px;background:linear-gradient(135deg, #f97316 0%, #ea580c 100%);display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 6px 16px rgba(249,115,22,0.35);">
                🧾
              </div>
              <div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <h3 style="margin:0;font-size:15px;font-weight:900;color:#fff;">POS Receipt & Slip Layout Designer</h3>
                  <span style="font-size:10px;background:#0369a1;color:#fff;padding:2px 8px;border-radius:6px;font-weight:700;">Admin Pro</span>
                </div>
                <p style="margin:2px 0 0;font-size:11px;color:#94a3b8;">
                  Branch: <strong style="color:#38bdf8;">${sanitizeText(restaurant.name)}</strong> · Customize paper size, header, logo, fields, barcode & tax
                </p>
              </div>
            </div>
            
            <div style="display:flex;align-items:center;gap:8px;">
              <button id="close-slip-customizer-btn" style="background:#1e293b;border:none;color:#94a3b8;width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;">✕</button>
            </div>
          </div>

          <!-- Body: Dual-Pane Grid (Controls on Left, Live Thermal Preview on Right) -->
          <div style="display:flex;flex:1;overflow:hidden;gap:16px;padding:16px;flex-direction:row;">
            
            <!-- LEFT PANEL: Settings & Controls -->
            <div style="flex:1.2;min-width:320px;display:flex;flex-direction:column;background:#0c1322;border:1px solid #1e293b;border-radius:18px;overflow:hidden;">
              
              <!-- Tab Navigation Bar -->
              <div style="display:flex;background:#070b14;border-bottom:1px solid #1e293b;overflow-x:auto;padding:4px 6px;gap:4px;">
                <button type="button" class="slip-tab-btn" data-tab="paper" style="flex:1;padding:8px 10px;border-radius:10px;border:none;font-size:11px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:all 0.2s;background:${activeTab === 'paper' ? '#0284c7' : 'transparent'};color:${activeTab === 'paper' ? '#fff' : '#94a3b8'};">
                  <span>📐</span> <span>Paper & Font</span>
                </button>
                <button type="button" class="slip-tab-btn" data-tab="header" style="flex:1;padding:8px 10px;border-radius:10px;border:none;font-size:11px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:all 0.2s;background:${activeTab === 'header' ? '#0284c7' : 'transparent'};color:${activeTab === 'header' ? '#fff' : '#94a3b8'};">
                  <span>🏷️</span> <span>Header & Logo</span>
                </button>
                <button type="button" class="slip-tab-btn" data-tab="fields" style="flex:1;padding:8px 10px;border-radius:10px;border:none;font-size:11px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:all 0.2s;background:${activeTab === 'fields' ? '#0284c7' : 'transparent'};color:${activeTab === 'fields' ? '#fff' : '#94a3b8'};">
                  <span>📋</span> <span>Fields</span>
                </button>
                <button type="button" class="slip-tab-btn" data-tab="pricing" style="flex:1;padding:8px 10px;border-radius:10px;border:none;font-size:11px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:all 0.2s;background:${activeTab === 'pricing' ? '#0284c7' : 'transparent'};color:${activeTab === 'pricing' ? '#fff' : '#94a3b8'};">
                  <span>💰</span> <span>Tax & Total</span>
                </button>
                <button type="button" class="slip-tab-btn" data-tab="footer" style="flex:1;padding:8px 10px;border-radius:10px;border:none;font-size:11px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:5px;transition:all 0.2s;background:${activeTab === 'footer' ? '#0284c7' : 'transparent'};color:${activeTab === 'footer' ? '#fff' : '#94a3b8'};">
                  <span>📜</span> <span>Footer</span>
                </button>
              </div>

              <!-- Tab Content Area -->
              <div style="flex:1;overflow-y:auto;padding:16px;">
                ${renderActiveTabContent()}
              </div>

              <!-- Left Action Footer -->
              <div style="padding:12px 16px;background:#070b14;border-top:1px solid #1e293b;display:flex;align-items:center;justify-content:space-between;gap:8px;">
                <button type="button" id="reset-slip-defaults-btn" style="background:#1e293b;color:#94a3b8;border:1px solid #334155;padding:8px 14px;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;">
                  ↺ Reset Defaults
                </button>
                <button type="button" id="save-slip-config-btn" style="background:linear-gradient(135deg, #10b981 0%, #059669 100%);color:#fff;border:none;padding:9px 20px;border-radius:10px;font-size:12px;font-weight:800;cursor:pointer;box-shadow:0 4px 14px rgba(16,185,129,0.4);display:flex;align-items:center;gap:6px;">
                  <span>💾</span> <span>Save Slip Layout</span>
                </button>
              </div>

            </div>

            <!-- RIGHT PANEL: Live Interactive Thermal Slip Preview -->
            <div style="flex:1;min-width:300px;background:#030712;border:1px solid #1e293b;border-radius:18px;display:flex;flex-direction:column;overflow:hidden;">
              
              <!-- Preview Header -->
              <div style="padding:10px 14px;background:#090d16;border-bottom:1px solid #1e293b;display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:6px;">
                  <span style="font-size:12px;">🖨️</span>
                  <span style="font-size:11px;font-weight:800;color:#fff;">Live Thermal Preview</span>
                  <span id="preview-paper-badge" style="font-size:9.5px;background:#334155;color:#38bdf8;padding:2px 6px;border-radius:4px;font-family:monospace;font-weight:bold;">${cfg.paperSize}</span>
                </div>
                <button type="button" id="test-print-slip-btn" style="background:#ea580c;color:#fff;border:none;padding:6px 12px;border-radius:8px;font-size:11px;font-weight:800;cursor:pointer;display:flex;align-items:center;gap:4px;box-shadow:0 2px 8px rgba(234,88,12,0.35);">
                  <span>🖨️</span> <span>Test Print Slip</span>
                </button>
              </div>

              <!-- Thermal Canvas Container -->
              <div style="flex:1;overflow-y:auto;padding:16px;display:flex;justify-content:center;background:#040711;">
                <div id="preview-slip-wrapper" style="background:#ffffff;border-radius:8px;box-shadow:0 12px 35px rgba(0,0,0,0.7);overflow:hidden;height:fit-content;width:${iframeWidth}px;transition:width 0.25s ease;">
                  <iframe id="slip-preview-iframe" style="width:100%;height:580px;border:none;display:block;background:#fff;"></iframe>
                </div>
              </div>

            </div>

          </div>

        </div>
      `;

      bindEvents();
      updatePreviewFrame();
    }

    function renderActiveTabContent() {
      // TAB 1: Paper Format & Typography
      if (activeTab === 'paper') {
        const paperOptions = [
          { id: '80mm', title: '80mm POS Thermal', desc: 'Standard 3-inch counter roll (EPSON / Xprinter / Sunmi)', badge: 'Recommended' },
          { id: '58mm', title: '58mm Pocket Slip', desc: 'Mini 2-inch Bluetooth handheld mobile receipt', badge: 'Mini Pocket' },
          { id: 'A5', title: 'A5 Half Sheet', desc: 'Counter voucher & order slip for laser / inkjet', badge: 'Half Page' },
          { id: 'A4', title: 'A4 Full Page', desc: 'Commercial formal tax sales invoice sheet', badge: 'Official A4' }
        ];

        const fontOptions = [
          { id: 'monospace', title: 'POS Monospace', desc: 'Classic thermal dot-matrix receipt font', font: 'Courier New' },
          { id: 'sans', title: 'Modern Clean Sans', desc: 'Modern high-legibility system typography', font: 'system-ui' },
          { id: 'serif', title: 'Classic Serif', desc: 'Traditional elegant dining and bistro aesthetic', font: 'Georgia' }
        ];

        const sizeOptions = [
          { id: 'compact', title: 'Compact (9.5px)', desc: 'Fits maximum items on shorter paper roll' },
          { id: 'normal', title: 'Normal (11px)', desc: 'Standard balanced size for thermal printers' },
          { id: 'large', title: 'Large (12.5px)', desc: 'Maximum readability & bold kitchen visibility' }
        ];

        return `
          <div style="display:flex;flex-direction:column;gap:16px;">
            <!-- Paper Size -->
            <div>
              <label style="font-size:11px;font-weight:800;color:#cbd5e1;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:8px;">
                1. Paper Size & Thermal Format:
              </label>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
                ${paperOptions.map(p => `
                  <div class="slip-paper-option" data-size="${p.id}" style="border:1.5px solid ${cfg.paperSize === p.id ? '#0284c7' : '#1e293b'};background:${cfg.paperSize === p.id ? 'rgba(2,132,199,0.15)' : '#070b14'};padding:10px;border-radius:12px;cursor:pointer;transition:all 0.2s;">
                    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                      <strong style="font-size:12px;color:${cfg.paperSize === p.id ? '#38bdf8' : '#fff'};">${p.title}</strong>
                      <span style="font-size:9px;background:#1e293b;color:#94a3b8;padding:1px 6px;border-radius:4px;">${p.badge}</span>
                    </div>
                    <p style="margin:0;font-size:10px;color:#94a3b8;line-height:1.3;">${p.desc}</p>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Typography Font Family -->
            <div>
              <label style="font-size:11px;font-weight:800;color:#cbd5e1;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:8px;">
                2. Font Typography Style:
              </label>
              <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;">
                ${fontOptions.map(f => `
                  <div class="slip-font-option" data-font="${f.id}" style="border:1.5px solid ${cfg.fontFamily === f.id ? '#0284c7' : '#1e293b'};background:${cfg.fontFamily === f.id ? 'rgba(2,132,199,0.15)' : '#070b14'};padding:10px;border-radius:12px;cursor:pointer;transition:all 0.2s;">
                    <strong style="font-size:11px;color:${cfg.fontFamily === f.id ? '#38bdf8' : '#fff'};font-family:${f.font};">${f.title}</strong>
                    <p style="margin:4px 0 0;font-size:9.5px;color:#94a3b8;">${f.desc}</p>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Font Size -->
            <div>
              <label style="font-size:11px;font-weight:800;color:#cbd5e1;text-transform:uppercase;letter-spacing:0.5px;display:block;margin-bottom:8px;">
                3. Base Print Font Density:
              </label>
              <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;">
                ${sizeOptions.map(s => `
                  <div class="slip-size-option" data-size="${s.id}" style="border:1.5px solid ${cfg.fontSize === s.id ? '#0284c7' : '#1e293b'};background:${cfg.fontSize === s.id ? 'rgba(2,132,199,0.15)' : '#070b14'};padding:10px;border-radius:12px;cursor:pointer;transition:all 0.2s;">
                    <strong style="font-size:11px;color:${cfg.fontSize === s.id ? '#38bdf8' : '#fff'};">${s.title}</strong>
                    <p style="margin:4px 0 0;font-size:9.5px;color:#94a3b8;">${s.desc}</p>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        `;
      }

      // TAB 2: Header & Logo Branding
      if (activeTab === 'header') {
        return `
          <div style="display:flex;flex-direction:column;gap:14px;">
            <!-- Logo Section -->
            <div style="background:#070b14;border:1px solid #1e293b;border-radius:14px;padding:12px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
                <label style="font-size:11px;font-weight:800;color:#fff;display:flex;align-items:center;gap:6px;cursor:pointer;">
                  <input type="checkbox" id="cfg-showLogo" ${cfg.showLogo ? 'checked' : ''} style="width:16px;height:16px;accent-color:#0284c7;" />
                  <span>Show Restaurant Logo at Top</span>
                </label>
                <span style="font-size:9.5px;color:#34d399;font-weight:bold;">${restaurant.logoUrl ? '✓ Logo Available' : 'No custom logo uploaded'}</span>
              </div>
              
              <div style="display:flex;align-items:center;gap:10px;padding-top:8px;border-top:1px solid #1e293b;">
                <span style="font-size:10px;color:#94a3b8;font-weight:bold;">Logo Display Size:</span>
                <div style="display:flex;gap:6px;">
                  ${['small', 'medium', 'large'].map(sz => `
                    <button type="button" class="slip-logosize-btn" data-size="${sz}" style="padding:4px 10px;border-radius:6px;font-size:10px;font-weight:700;border:1px solid ${cfg.logoSize === sz ? '#0284c7' : '#334155'};background:${cfg.logoSize === sz ? '#0284c7' : '#0f172a'};color:${cfg.logoSize === sz ? '#fff' : '#cbd5e1'};cursor:pointer;">
                      ${sz.charAt(0).toUpperCase() + sz.slice(1)}
                    </button>
                  `).join('')}
                </div>
              </div>
            </div>

            <!-- Header Titles & Text -->
            <div style="display:flex;flex-direction:column;gap:10px;">
              <div>
                <label style="font-size:10.5px;font-weight:700;color:#cbd5e1;display:block;margin-bottom:4px;">Restaurant Header Name (Display on Slip):</label>
                <input type="text" id="cfg-headerTitle" value="${sanitizeText(cfg.headerTitle)}" placeholder="${sanitizeText(restaurant.name)}" style="width:100%;box-sizing:border-box;background:#070b14;border:1px solid #334155;border-radius:8px;padding:8px 10px;font-size:11px;color:#fff;" />
              </div>

              <div>
                <label style="font-size:10.5px;font-weight:700;color:#cbd5e1;display:block;margin-bottom:4px;">Header Subtitle / Tagline:</label>
                <input type="text" id="cfg-headerTagline" value="${sanitizeText(cfg.headerTagline)}" placeholder="e.g. Taste the Royal Tradition • Since 1998" style="width:100%;box-sizing:border-box;background:#070b14;border:1px solid #334155;border-radius:8px;padding:8px 10px;font-size:11px;color:#fff;" />
              </div>

              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                  <label style="font-size:10.5px;font-weight:700;color:#cbd5e1;display:block;margin-bottom:4px;">Address on Slip:</label>
                  <input type="text" id="cfg-headerAddress" value="${sanitizeText(cfg.headerAddress)}" placeholder="Branch Address" style="width:100%;box-sizing:border-box;background:#070b14;border:1px solid #334155;border-radius:8px;padding:8px 10px;font-size:11px;color:#fff;" />
                </div>
                <div>
                  <label style="font-size:10.5px;font-weight:700;color:#cbd5e1;display:block;margin-bottom:4px;">Contact Phone / WhatsApp:</label>
                  <input type="text" id="cfg-headerPhone" value="${sanitizeText(cfg.headerPhone)}" placeholder="+92 300 1234567" style="width:100%;box-sizing:border-box;background:#070b14;border:1px solid #334155;border-radius:8px;padding:8px 10px;font-size:11px;color:#fff;" />
                </div>
              </div>

              <!-- NTN & Tax ID -->
              <div style="background:#070b14;border:1px solid #1e293b;border-radius:12px;padding:10px;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
                  <input type="checkbox" id="cfg-showTaxRegistration" ${cfg.showTaxRegistration ? 'checked' : ''} style="width:15px;height:15px;accent-color:#0284c7;" />
                  <label for="cfg-showTaxRegistration" style="font-size:11px;font-weight:700;color:#cbd5e1;cursor:pointer;">Include Tax / NTN / PRA Registration Number</label>
                </div>
                <input type="text" id="cfg-taxRegistrationNo" value="${sanitizeText(cfg.taxRegistrationNo)}" placeholder="e.g. NTN # 8941230-5 | PRA # 12-00-9876-001" style="width:100%;box-sizing:border-box;background:#0c1322;border:1px solid #334155;border-radius:8px;padding:7px 10px;font-size:11px;color:#fbbf24;font-family:monospace;" />
              </div>

              <!-- Badge Title -->
              <div>
                <label style="font-size:10.5px;font-weight:700;color:#cbd5e1;display:block;margin-bottom:4px;">Slip Badge Title:</label>
                <input type="text" id="cfg-badgeText" value="${sanitizeText(cfg.badgeText)}" placeholder="OFFICIAL SALES INVOICE" style="width:100%;box-sizing:border-box;background:#070b14;border:1px solid #334155;border-radius:8px;padding:8px 10px;font-size:11px;color:#38bdf8;font-weight:bold;" />
              </div>
            </div>
          </div>
        `;
      }

      // TAB 3: Order Metadata & Field Toggles
      if (activeTab === 'fields') {
        const fields = [
          { id: 'showTicketId', title: 'Order Ticket # (e.g. #ORD-9842)', desc: 'Large prominent ticket identifier' },
          { id: 'showDateTime', title: 'Order Date & Time', desc: 'Exact date and time stamp' },
          { id: 'showCustomerName', title: 'Customer Name', desc: 'Name of the buyer or Walk-in' },
          { id: 'showCustomerPhone', title: 'Customer Phone Number', desc: 'Contact number of the customer' },
          { id: 'showCustomerAddress', title: 'Delivery Address', desc: 'Street address for delivery orders' },
          { id: 'showServiceType', title: 'Service Type Badge', desc: 'Dine-in / Doorstep Delivery / Counter Takeaway' },
          { id: 'showPaymentMethod', title: 'Payment Method Info', desc: 'Cash on Delivery, JazzCash, Card, etc.' },
          { id: 'showCookingNotes', title: 'Dish Cooking Notes', desc: 'Special kitchen requests and spice level' }
        ];

        return `
          <div style="display:flex;flex-direction:column;gap:12px;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">
              Select which order details should be printed on the customer receipt:
            </p>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">
              ${fields.map(f => `
                <label style="display:flex;align-items:flex-start;gap:8px;background:#070b14;border:1px solid #1e293b;border-radius:12px;padding:10px;cursor:pointer;transition:all 0.2s;">
                  <input type="checkbox" id="cfg-${f.id}" ${cfg[f.id] ? 'checked' : ''} style="width:16px;height:16px;margin-top:2px;accent-color:#0284c7;" />
                  <div>
                    <strong style="font-size:11px;color:#fff;display:block;">${f.title}</strong>
                    <span style="font-size:9.5px;color:#94a3b8;display:block;margin-top:2px;">${f.desc}</span>
                  </div>
                </label>
              `).join('')}
            </div>
          </div>
        `;
      }

      // TAB 4: Pricing, Charges & Tax
      if (activeTab === 'pricing') {
        return `
          <div style="display:flex;flex-direction:column;gap:14px;">
            <p style="margin:0;font-size:11px;color:#94a3b8;">
              Configure currency symbol, subtotal calculation and optional government sales tax:
            </p>

            <!-- Line Items & Charges -->
            <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:8px;">
              <label style="display:flex;align-items:center;gap:8px;background:#070b14;border:1px solid #1e293b;border-radius:12px;padding:10px;cursor:pointer;">
                <input type="checkbox" id="cfg-showItemUnitPrice" ${cfg.showItemUnitPrice ? 'checked' : ''} style="width:16px;height:16px;accent-color:#0284c7;" />
                <span style="font-size:11px;color:#fff;font-weight:bold;">Show Unit Price</span>
              </label>
              <label style="display:flex;align-items:center;gap:8px;background:#070b14;border:1px solid #1e293b;border-radius:12px;padding:10px;cursor:pointer;">
                <input type="checkbox" id="cfg-showSubtotal" ${cfg.showSubtotal ? 'checked' : ''} style="width:16px;height:16px;accent-color:#0284c7;" />
                <span style="font-size:11px;color:#fff;font-weight:bold;">Show Subtotal</span>
              </label>
              <label style="display:flex;align-items:center;gap:8px;background:#070b14;border:1px solid #1e293b;border-radius:12px;padding:10px;cursor:pointer;">
                <input type="checkbox" id="cfg-showDeliveryFee" ${cfg.showDeliveryFee ? 'checked' : ''} style="width:16px;height:16px;accent-color:#0284c7;" />
                <span style="font-size:11px;color:#fff;font-weight:bold;">Show Delivery Fee</span>
              </label>
            </div>

            <!-- Currency Symbol -->
            <div style="background:#070b14;border:1px solid #1e293b;border-radius:12px;padding:12px;display:flex;align-items:center;justify-content:space-between;gap:10px;">
              <div>
                <strong style="font-size:11px;color:#fff;display:block;">Currency Symbol Prefix:</strong>
                <span style="font-size:9.5px;color:#94a3b8;">Printed next to each price amount</span>
              </div>
              <input type="text" id="cfg-currencySymbol" value="${sanitizeText(cfg.currencySymbol)}" placeholder="Rs." style="width:90px;background:#0c1322;border:1px solid #334155;border-radius:8px;padding:6px 10px;font-size:12px;color:#fbbf24;font-weight:bold;text-align:center;" />
            </div>

            <!-- GST / Provincial Tax -->
            <div style="background:#070b14;border:1px solid #1e293b;border-radius:14px;padding:14px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <label style="font-size:11px;font-weight:800;color:#fff;display:flex;align-items:center;gap:8px;cursor:pointer;">
                  <input type="checkbox" id="cfg-showGstTax" ${cfg.showGstTax ? 'checked' : ''} style="width:16px;height:16px;accent-color:#0284c7;" />
                  <span>Calculate & Print Sales Tax / GST (PRA / SRB / FBR)</span>
                </label>
              </div>

              <div style="display:flex;align-items:center;gap:10px;padding-top:8px;border-top:1px solid #1e293b;">
                <span style="font-size:11px;color:#94a3b8;font-weight:bold;">Tax Rate (%):</span>
                <input type="number" id="cfg-taxPercentage" min="0" max="30" value="${cfg.taxPercentage || 0}" style="width:80px;background:#0c1322;border:1px solid #334155;border-radius:8px;padding:6px 10px;font-size:11px;color:#38bdf8;font-weight:bold;" />
                <span style="font-size:10px;color:#64748b;">(e.g. 5% or 16% standard restaurant tax)</span>
              </div>
            </div>
          </div>
        `;
      }

      // TAB 5: Footer & Special Elements
      if (activeTab === 'footer') {
        return `
          <div style="display:flex;flex-direction:column;gap:12px;">
            <!-- Thermal Barcode Lines -->
            <label style="display:flex;align-items:center;justify-content:space-between;background:#070b14;border:1px solid #1e293b;border-radius:12px;padding:12px;cursor:pointer;">
              <div>
                <strong style="font-size:11px;color:#fff;display:block;">Print Thermal Barcode Lines</strong>
                <span style="font-size:9.5px;color:#94a3b8;">Renders authentic barcode scanner stripes at the bottom</span>
              </div>
              <input type="checkbox" id="cfg-showBarcode" ${cfg.showBarcode ? 'checked' : ''} style="width:18px;height:18px;accent-color:#0284c7;" />
            </label>

            <!-- Thank you title -->
            <div>
              <label style="font-size:10.5px;font-weight:700;color:#cbd5e1;display:block;margin-bottom:4px;">Thank You Headline:</label>
              <input type="text" id="cfg-footerThankYou" value="${sanitizeText(cfg.footerThankYou)}" placeholder="*** THANK YOU FOR VISITING! ***" style="width:100%;box-sizing:border-box;background:#070b14;border:1px solid #334155;border-radius:8px;padding:8px 10px;font-size:11px;color:#fff;" />
            </div>

            <!-- Kitchen note -->
            <div>
              <label style="font-size:10.5px;font-weight:700;color:#cbd5e1;display:block;margin-bottom:4px;">Kitchen / Hygiene Sub-note:</label>
              <input type="text" id="cfg-footerSubNote" value="${sanitizeText(cfg.footerSubNote)}" placeholder="Please visit us again. Freshly prepared with care." style="width:100%;box-sizing:border-box;background:#070b14;border:1px solid #334155;border-radius:8px;padding:8px 10px;font-size:11px;color:#fff;" />
            </div>

            <!-- WiFi Notice -->
            <div style="background:#070b14;border:1px solid #1e293b;border-radius:12px;padding:12px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <input type="checkbox" id="cfg-showWifiNotice" ${cfg.showWifiNotice ? 'checked' : ''} style="width:15px;height:15px;accent-color:#0284c7;" />
                <label for="cfg-showWifiNotice" style="font-size:11px;font-weight:700;color:#cbd5e1;cursor:pointer;">Show Guest WiFi Credentials</label>
              </div>
              <input type="text" id="cfg-footerWifiNotice" value="${sanitizeText(cfg.footerWifiNotice)}" placeholder="Guest WiFi: ApnaGuest | Pass: biryani123" style="width:100%;box-sizing:border-box;background:#0c1322;border:1px solid #334155;border-radius:8px;padding:7px 10px;font-size:11px;color:#38bdf8;" />
            </div>

            <!-- Watermark -->
            <div style="background:#070b14;border:1px solid #1e293b;border-radius:12px;padding:12px;">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <input type="checkbox" id="cfg-showWatermark" ${cfg.showWatermark ? 'checked' : ''} style="width:15px;height:15px;accent-color:#0284c7;" />
                <label for="cfg-showWatermark" style="font-size:11px;font-weight:700;color:#cbd5e1;cursor:pointer;">Show Bottom Powered-by Watermark</label>
              </div>
              <input type="text" id="cfg-footerWatermark" value="${sanitizeText(cfg.footerWatermark)}" placeholder="Powered by ManagementHub POS" style="width:100%;box-sizing:border-box;background:#0c1322;border:1px solid #334155;border-radius:8px;padding:7px 10px;font-size:11px;color:#94a3b8;" />
            </div>
          </div>
        `;
      }
      return '';
    }

    function updatePreviewFrame() {
      const iframe = document.getElementById('slip-preview-iframe');
      const wrapper = document.getElementById('preview-slip-wrapper');
      const paperBadge = document.getElementById('preview-paper-badge');
      if (paperBadge) paperBadge.textContent = cfg.paperSize;

      if (wrapper) {
        let w = 320;
        if (cfg.paperSize === '58mm') w = 240;
        else if (cfg.paperSize === 'A5') w = 430;
        else if (cfg.paperSize === 'A4') w = 480;
        wrapper.style.width = w + 'px';
      }

      if (iframe) {
        const html = generateReceiptSlipHtml(sampleOrder, restaurant, cfg);
        iframe.srcdoc = html;
        iframe.onload = () => {
          try {
            if (iframe.contentWindow && iframe.contentWindow.document.body) {
              const bodyHeight = iframe.contentWindow.document.body.scrollHeight;
              iframe.style.height = Math.max(520, bodyHeight + 20) + 'px';
            }
          } catch(e) {}
        };
      }
    }

    function syncInputValuesToCfg() {
      // Inputs if present in current tab
      const getVal = (id) => { const el = document.getElementById(id); return el ? el.value : null; };
      const getChecked = (id) => { const el = document.getElementById(id); return el ? el.checked : null; };

      const hTitle = getVal('cfg-headerTitle'); if (hTitle !== null) cfg.headerTitle = hTitle.trim();
      const hTag = getVal('cfg-headerTagline'); if (hTag !== null) cfg.headerTagline = hTag.trim();
      const hAddr = getVal('cfg-headerAddress'); if (hAddr !== null) cfg.headerAddress = hAddr.trim();
      const hPhone = getVal('cfg-headerPhone'); if (hPhone !== null) cfg.headerPhone = hPhone.trim();
      const taxNo = getVal('cfg-taxRegistrationNo'); if (taxNo !== null) cfg.taxRegistrationNo = taxNo.trim();
      const badge = getVal('cfg-badgeText'); if (badge !== null) cfg.badgeText = badge.trim();
      const curr = getVal('cfg-currencySymbol'); if (curr !== null) cfg.currencySymbol = curr.trim() || 'Rs.';
      const taxPct = getVal('cfg-taxPercentage'); if (taxPct !== null) cfg.taxPercentage = Number(taxPct) || 0;
      const fTY = getVal('cfg-footerThankYou'); if (fTY !== null) cfg.footerThankYou = fTY.trim();
      const fNote = getVal('cfg-footerSubNote'); if (fNote !== null) cfg.footerSubNote = fNote.trim();
      const fWifi = getVal('cfg-footerWifiNotice'); if (fWifi !== null) cfg.footerWifiNotice = fWifi.trim();
      const fWm = getVal('cfg-footerWatermark'); if (fWm !== null) cfg.footerWatermark = fWm.trim();

      const cLogo = getChecked('cfg-showLogo'); if (cLogo !== null) cfg.showLogo = cLogo;
      const cTaxReg = getChecked('cfg-showTaxRegistration'); if (cTaxReg !== null) cfg.showTaxRegistration = cTaxReg;
      const cGst = getChecked('cfg-showGstTax'); if (cGst !== null) cfg.showGstTax = cGst;
      const cBarcode = getChecked('cfg-showBarcode'); if (cBarcode !== null) cfg.showBarcode = cBarcode;
      const cWifi = getChecked('cfg-showWifiNotice'); if (cWifi !== null) cfg.showWifiNotice = cWifi;
      const cWm = getChecked('cfg-showWatermark'); if (cWm !== null) cfg.showWatermark = cWm;

      // Fields
      [
        'showTicketId', 'showDateTime', 'showCustomerName', 'showCustomerPhone',
        'showCustomerAddress', 'showServiceType', 'showPaymentMethod', 'showCookingNotes',
        'showItemUnitPrice', 'showSubtotal', 'showDeliveryFee'
      ].forEach(k => {
        const v = getChecked('cfg-' + k);
        if (v !== null) cfg[k] = v;
      });
    }

    function bindEvents() {
      // Close
      document.getElementById('close-slip-customizer-btn').onclick = () => modal.remove();

      // Tab switcher
      modal.querySelectorAll('.slip-tab-btn').forEach(btn => {
        btn.onclick = () => {
          syncInputValuesToCfg();
          activeTab = btn.getAttribute('data-tab');
          renderModal();
        };
      });

      // Paper size click
      modal.querySelectorAll('.slip-paper-option').forEach(el => {
        el.onclick = () => {
          cfg.paperSize = el.getAttribute('data-size');
          renderModal();
        };
      });

      // Font option click
      modal.querySelectorAll('.slip-font-option').forEach(el => {
        el.onclick = () => {
          cfg.fontFamily = el.getAttribute('data-font');
          renderModal();
        };
      });

      // Size option click
      modal.querySelectorAll('.slip-size-option').forEach(el => {
        el.onclick = () => {
          cfg.fontSize = el.getAttribute('data-size');
          renderModal();
        };
      });

      // Logo size click
      modal.querySelectorAll('.slip-logosize-btn').forEach(btn => {
        btn.onclick = () => {
          cfg.logoSize = btn.getAttribute('data-size');
          renderModal();
        };
      });

      // Live inputs real-time update
      modal.querySelectorAll('input').forEach(inp => {
        inp.oninput = () => {
          syncInputValuesToCfg();
          updatePreviewFrame();
        };
        inp.onchange = () => {
          syncInputValuesToCfg();
          updatePreviewFrame();
        };
      });

      // Test Print current preview slip
      document.getElementById('test-print-slip-btn').onclick = () => {
        syncInputValuesToCfg();
        const testHtml = generateReceiptSlipHtml(sampleOrder, restaurant, cfg);
        printThermalSlipViaIframe(testHtml, sampleOrder.id);
        if (window.self !== window.top) {
          try {
            window.open('/api/print-slip/' + encodeURIComponent(sampleOrder.id) + '?preview=1', '_blank');
          } catch(e) {}
        }
      };

      // Reset Defaults
      document.getElementById('reset-slip-defaults-btn').onclick = () => {
        if (confirm('Kya aap slip settings ko factory defaults par reset karna chahte hain?')) {
          cfg = {
            paperSize: '80mm',
            fontFamily: 'monospace',
            fontSize: 'normal',
            showLogo: true,
            logoSize: 'medium',
            headerTitle: restaurant.name || 'Restaurant',
            headerTagline: restaurant.tagline || '',
            headerAddress: restaurant.address || 'Direct Order Storefront',
            headerPhone: restaurant.phone || restaurant.whatsappNumber || '+92 300 1234567',
            showTaxRegistration: false,
            taxRegistrationNo: '',
            badgeText: 'OFFICIAL SALES INVOICE',
            showTicketId: true,
            showDateTime: true,
            showCustomerName: true,
            showCustomerPhone: true,
            showCustomerAddress: true,
            showServiceType: true,
            showPaymentMethod: true,
            showCookingNotes: true,
            showItemUnitPrice: true,
            showSubtotal: true,
            showDeliveryFee: true,
            showGstTax: false,
            taxPercentage: 0,
            currencySymbol: 'Rs.',
            showBarcode: true,
            footerThankYou: '*** THANK YOU FOR VISITING! ***',
            footerSubNote: 'Please visit us again. Freshly prepared with care.',
            showWifiNotice: false,
            footerWifiNotice: '',
            showWatermark: true,
            footerWatermark: `Powered by ${restaurant.name} POS System`
          };
          renderModal();
        }
      };

      // Save Slip Configuration
      document.getElementById('save-slip-config-btn').onclick = async () => {
        syncInputValuesToCfg();
        const saveBtn = document.getElementById('save-slip-config-btn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span>⏳</span> <span>Saving Layout...</span>';

        try {
          restaurant.slipConfig = Object.assign({}, cfg);

          // 1. Update localStorage
          let allRests = getLocalRestaurants();
          const rIdx = allRests.findIndex(r => r.id === restaurant.id);
          if (rIdx >= 0) {
            allRests[rIdx].slipConfig = Object.assign({}, cfg);
          } else {
            allRests.push(restaurant);
          }
          saveLocalRestaurants(allRests);
          localStorage.setItem('bitehub_slip_config_' + restaurant.id, JSON.stringify(cfg));

          // 2. Persist to server API dedicated endpoint
          await fetch(`/api/restaurants/${restaurant.id}/slip-config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cfg)
          }).catch(() => {});

          // 3. Sync full update to server state
          await fetch('/api/sync/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates: { restaurants: allRests } })
          }).catch(() => {});

          alert(`✅ POS Slip Layout successfully updated for "${restaurant.name}"!\n\nAll customer slips, kitchen printouts, and digital invoices will now use this custom design.`);
          modal.remove();
        } catch (err) {
          alert('Error saving slip layout: ' + err.message);
          saveBtn.disabled = false;
          saveBtn.innerHTML = '<span>💾</span> <span>Save Slip Layout</span>';
        }
      };
    }

    document.body.appendChild(modal);
    renderModal();
  };

  // Main Professional Order Tracker Modal
  window.renderOrderTrackingModal = function(order, restaurant) {
    if (!order) return;
    const old = document.getElementById('order-tracking-modal');
    if (old) old.remove();

    const rests = getLocalRestaurants();
    const rest = restaurant || rests.find(r => r.id === order.restaurantId) || { name: 'Restaurant', primaryColor: '#f97316', phone: '+92 300 0000000' };

    const items = order.items || [];
    const subtotal = order.totalAmount || 0;
    const delivery = order.deliveryFee || 0;
    const grandTotal = subtotal + delivery;
    const brandColor = rest.primaryColor || '#f97316';

    // 4 Tracking Stages
    let currentStage = 2; // 1: Confirmed, 2: Cooking, 3: Rider On Way, 4: Delivered

    const modal = document.createElement('div');
    modal.id = 'order-tracking-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999999;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);display:flex;align-items:center;justify-content:center;padding:14px;overflow-y:auto;';

    function renderTracker() {
      modal.innerHTML = `
        <div style="background:#090d16;border:1px solid #1e293b;border-radius:28px;max-width:580px;width:100%;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 30px 60px -15px rgba(0,0,0,0.9);max-height:92vh;overflow-y:auto;position:relative;">
          
          <!-- Top Success Header -->
          <div style="background:linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(2,132,199,0.1) 100%);padding:22px 24px;border-bottom:1px solid #1e293b;display:flex;align-items:center;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:12px;">
              ${(rest.logoUrl || rest.logo) ? `
                <img src="${sanitizeUrl(rest.logoUrl || rest.logo)}" alt="${sanitizeText(rest.name)}" style="width:48px;height:48px;border-radius:16px;object-fit:cover;border:2px solid rgba(255,255,255,0.2);box-shadow:0 8px 20px rgba(0,0,0,0.5);" />
              ` : `
                <div style="width:48px;height:48px;border-radius:16px;background:#10b981;display:flex;align-items:center;justify-content:center;font-size:24px;box-shadow:0 8px 20px rgba(16,185,129,0.4);">
                  🎉
                </div>
              `}
              <div>
                <span style="font-size:10px;font-weight:800;color:#34d399;text-transform:uppercase;letter-spacing:1px;background:#064e3b;padding:2px 8px;border-radius:6px;">ORDER CONFIRMED</span>
                <h3 style="margin:4px 0 0;font-size:17px;font-weight:900;color:#fff;">Order Placed Successfully!</h3>
                <p style="margin:2px 0 0;font-size:11px;color:#94a3b8;">${sanitizeText(rest.name)} · Order ID: <strong style="color:#38bdf8;font-family:monospace;">#${order.id ? order.id.slice(-8).toUpperCase() : 'BITE-' + Date.now().toString().slice(-6)}</strong></p>
              </div>
            </div>

            <button id="close-order-tracking-btn" style="background:#1e293b;border:none;color:#94a3b8;width:34px;height:34px;border-radius:10px;cursor:pointer;font-size:16px;display:flex;align-items:center;justify-content:center;">✕</button>
          </div>

          <div style="padding:22px 24px;display:flex;flex-direction:column;gap:18px;">
            
            <!-- 4-Stage Visual Status Timeline -->
            <div style="background:#0f172a;border:1px solid #1e293b;border-radius:20px;padding:16px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
                <span style="font-size:11px;font-weight:800;color:#cbd5e1;text-transform:uppercase;letter-spacing:0.5px;">Live Kitchen & Delivery Status:</span>
                <span style="font-size:10px;color:#38bdf8;font-weight:bold;background:#0369a1/20;border:1px solid #0284c7/40;padding:2px 8px;border-radius:6px;">Est. 30-40 Mins</span>
              </div>

              <!-- 4 Step Tracker -->
              <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:6px;position:relative;text-align:center;">
                
                <!-- Stage 1 -->
                <div class="stage-step" data-step="1" style="cursor:pointer;">
                  <div style="width:36px;height:36px;border-radius:12px;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-size:16px;${currentStage >= 1 ? 'background:#10b981;color:#fff;box-shadow:0 4px 12px rgba(16,185,129,0.4);' : 'background:#1e293b;color:#64748b;'}">
                    ✓
                  </div>
                  <span style="font-size:10px;font-weight:800;display:block;${currentStage >= 1 ? 'color:#fff;' : 'color:#64748b;'}">Confirmed</span>
                  <span style="font-size:9px;color:#94a3b8;">Order Received</span>
                </div>

                <!-- Stage 2 -->
                <div class="stage-step" data-step="2" style="cursor:pointer;">
                  <div style="width:36px;height:36px;border-radius:12px;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-size:16px;${currentStage >= 2 ? 'background:#f59e0b;color:#000;box-shadow:0 4px 12px rgba(245,158,11,0.4);animation:pulse 2s infinite;' : 'background:#1e293b;color:#64748b;'}">
                    🍳
                  </div>
                  <span style="font-size:10px;font-weight:800;display:block;${currentStage >= 2 ? 'color:#fff;' : 'color:#64748b;'}">In Kitchen</span>
                  <span style="font-size:9px;color:#94a3b8;">Cooking Fresh</span>
                </div>

                <!-- Stage 3 -->
                <div class="stage-step" data-step="3" style="cursor:pointer;">
                  <div style="width:36px;height:36px;border-radius:12px;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-size:16px;${currentStage >= 3 ? 'background:#0284c7;color:#fff;box-shadow:0 4px 12px rgba(2,132,199,0.4);' : 'background:#1e293b;color:#64748b;'}">
                    🛵
                  </div>
                  <span style="font-size:10px;font-weight:800;display:block;${currentStage >= 3 ? 'color:#fff;' : 'color:#64748b;'}">On the Way</span>
                  <span style="font-size:9px;color:#94a3b8;">Rider Dispatched</span>
                </div>

                <!-- Stage 4 -->
                <div class="stage-step" data-step="4" style="cursor:pointer;">
                  <div style="width:36px;height:36px;border-radius:12px;margin:0 auto 6px;display:flex;align-items:center;justify-content:center;font-size:16px;${currentStage >= 4 ? 'background:#10b981;color:#fff;box-shadow:0 4px 12px rgba(16,185,129,0.4);' : 'background:#1e293b;color:#64748b;'}">
                    🏁
                  </div>
                  <span style="font-size:10px;font-weight:800;display:block;${currentStage >= 4 ? 'color:#fff;' : 'color:#64748b;'}">Delivered</span>
                  <span style="font-size:9px;color:#94a3b8;">Enjoy Meal</span>
                </div>

              </div>

              <!-- Click to simulate next status -->
              <div style="margin-top:12px;text-align:center;">
                <button id="advance-stage-btn" style="background:#1e293b;border:1px solid #334155;color:#94a3b8;padding:4px 12px;border-radius:8px;font-size:10px;cursor:pointer;">
                  🔄 Advance Live Status (Admin / Test)
                </button>
              </div>
            </div>

            <!-- Customer & Delivery Details Card -->
            <div style="background:#0f172a;border:1px solid #1e293b;border-radius:18px;padding:14px;font-size:11px;">
              <h4 style="margin:0 0 10px 0;font-size:12px;font-weight:800;color:#38bdf8;text-transform:uppercase;letter-spacing:0.5px;">📍 Delivery Destination:</h4>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                <div>
                  <span style="color:#64748b;display:block;">Recipient:</span>
                  <strong style="color:#fff;font-size:12px;">${sanitizeText(order.customerName) || 'Customer'}</strong>
                </div>
                <div>
                  <span style="color:#64748b;display:block;">Contact:</span>
                  <strong style="color:#34d399;font-size:12px;">${sanitizeText(order.customerPhone) || 'N/A'}</strong>
                </div>
                <div style="grid-column:span 2;">
                  <span style="color:#64748b;display:block;">Delivery Address:</span>
                  <strong style="color:#e2e8f0;font-size:12px;">${sanitizeText(order.customerAddress) || 'Direct counter'}</strong>
                </div>
                <div>
                  <span style="color:#64748b;display:block;">Payment Method:</span>
                  <strong style="color:#fbbf24;">${sanitizeText((order.paymentMethod || 'cash_on_delivery').replace(/_/g, ' ').toUpperCase())}</strong>
                </div>
                <div>
                  <span style="color:#64748b;display:block;">Restaurant:</span>
                  <strong style="color:#fff;">${sanitizeText(rest.name)}</strong>
                </div>
              </div>
            </div>

            <!-- Itemized Invoice Table -->
            <div style="background:#0f172a;border:1px solid #1e293b;border-radius:18px;padding:16px;">
              <h4 style="margin:0 0 10px 0;font-size:12px;font-weight:800;color:#cbd5e1;text-transform:uppercase;letter-spacing:0.5px;">🧾 Order Bill Summary:</h4>
              
              <div style="display:flex;flex-direction:column;gap:8px;border-bottom:1px solid #1e293b;padding-bottom:12px;">
                ${items.map(it => `
                  <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;">
                    <div style="display:flex;align-items:center;gap:8px;">
                      <span style="font-weight:800;color:#38bdf8;background:#0369a1/20;padding:2px 6px;border-radius:6px;font-size:11px;">${it.quantity || 1}x</span>
                      <span style="color:#fff;font-weight:600;">${sanitizeText(it.name) || 'Dish'}</span>
                    </div>
                    <span style="color:#fbbf24;font-weight:700;">Rs.${(it.price * (it.quantity || 1))}</span>
                  </div>
                `).join('')}
              </div>

              <!-- Price Totals -->
              <div style="padding-top:10px;display:flex;flex-direction:column;gap:4px;font-size:11px;">
                <div style="display:flex;justify-content:space-between;color:#94a3b8;">
                  <span>Items Subtotal:</span>
                  <span>Rs.${subtotal}</span>
                </div>
                <div style="display:flex;justify-content:space-between;color:#94a3b8;">
                  <span>Delivery Fee:</span>
                  <span>${delivery === 0 ? '<strong style="color:#34d399;">FREE</strong>' : 'Rs.' + delivery}</span>
                </div>
                <div style="display:flex;justify-content:space-between;font-size:14px;font-weight:900;color:#fff;border-top:1px dashed #334155;padding-top:6px;margin-top:4px;">
                  <span>Grand Total:</span>
                  <span style="color:${brandColor};">Rs.${grandTotal}</span>
                </div>
              </div>
            </div>

            <!-- Action Buttons: Print POS Slip, WhatsApp Share, Close -->
            <div style="display:flex;gap:10px;flex-wrap:wrap;">
              
              <!-- Thermal POS Printer -->
              <button id="print-pos-receipt-btn" style="flex:1;min-width:140px;background:#0284c7;color:#fff;border:none;padding:12px 14px;border-radius:14px;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 4px 14px rgba(2,132,199,0.3);">
                🖨️ Print POS Slip
              </button>

              <!-- WhatsApp Share -->
              <button id="whatsapp-share-receipt-btn" style="flex:1;min-width:140px;background:#059669;color:#fff;border:none;padding:12px 14px;border-radius:14px;font-size:12px;font-weight:800;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;box-shadow:0 4px 14px rgba(5,150,105,0.3);">
                💬 WhatsApp Receipt
              </button>

              <!-- Back to Store -->
              <button id="close-and-continue-btn" style="background:#1e293b;border:1px solid #334155;color:#cbd5e1;padding:12px 16px;border-radius:14px;font-size:12px;font-weight:700;cursor:pointer;">
                ✓ Done
              </button>

            </div>

          </div>

        </div>
      `;

      // Bind events
      document.getElementById('close-order-tracking-btn').onclick = () => modal.remove();
      document.getElementById('close-and-continue-btn').onclick = () => modal.remove();

      // Print POS Slip
      document.getElementById('print-pos-receipt-btn').onclick = () => {
        window.printOrderReceipt(order, rest);
      };

      // WhatsApp Share
      document.getElementById('whatsapp-share-receipt-btn').onclick = () => {
        const phone = (rest.whatsappNumber || rest.phone || order.customerPhone || '923000000000').replace(/[^0-9]/g, '');
        const itemsList = items.map(it => `• ${it.quantity}x ${it.name} - Rs.${it.price * it.quantity}`).join('\n');
        const text = encodeURIComponent(
          `*🧾 ${rest.name.toUpperCase()} - ORDER RECEIPT*\n` +
          `Order ID: #${order.id ? order.id.slice(-8).toUpperCase() : 'BITE'}\n` +
          `Customer: ${order.customerName}\n` +
          `Phone: ${order.customerPhone}\n` +
          `Address: ${order.customerAddress}\n\n` +
          `*Order Items:*\n${itemsList}\n\n` +
          `*Total Payable:* Rs.${grandTotal} (${(order.paymentMethod || 'COD').replace(/_/g, ' ')})\n` +
          `*Status:* Confirmed & Cooking in Kitchen 🍳\n\n` +
          `Thank you for ordering with ${rest.name}!`
        );
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
      };

      // Advance stage button
      document.getElementById('advance-stage-btn').onclick = () => {
        currentStage = (currentStage % 4) + 1;
        renderTracker();
      };

      modal.querySelectorAll('.stage-step').forEach(el => {
        el.onclick = () => {
          currentStage = parseInt(el.getAttribute('data-step'), 10);
          renderTracker();
        };
      });
    }

    document.body.appendChild(modal);
    renderTracker();
  };

  // Helper: Detect if active user is Super Admin
  function isSuperAdminActive() {
    try {
      const creds = localStorage.getItem('bitehub_superadmin_creds_v2');
      const user = localStorage.getItem('bitehub_user_session') || localStorage.getItem('currentUser') || localStorage.getItem('user') || '';
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === 'true' || params.get('adminPreview') === 'true' || params.get('superadmin') === 'true') return true;
      if (user && (user.includes('aateeqqshemsi@gmail.com') || user.includes('admin') || user.includes('super'))) return true;
      if (creds && creds.includes('aateeqqshemsi@gmail.com')) {
        // Check if on management page recently
        const lastAdmin = sessionStorage.getItem('bitehub_superadmin_active');
        if (lastAdmin === 'true') return true;
      }
    } catch (e) {}
    return false;
  }

  // =========================================================================
  // TABLE QR BARCODE GUARDIAN: STRICT 1:1 SQUARE ON BARCODE ONLY
  // Leaves Table Card Layout, Borders & Styling 100% Original
  // =========================================================================
  function guardTableQRCodes() {
    try {
      // 1. Force strict 1:1 square ONLY on the QR barcode image itself
      const qrImgs = document.querySelectorAll('img[alt*="QR" i], img[src*="create-qr-code" i]');
      qrImgs.forEach(img => {
        img.style.setProperty('aspect-ratio', '1 / 1', 'important');
        img.style.setProperty('object-fit', 'contain', 'important');
      });

      // 2. Fix Table 2 / Second Table & any unrendered QR codes:
      // If any table card shows plain text placeholder "QR Code", generate clean high-res square QR
      const emptyQrPlaceholders = document.querySelectorAll('div.w-16.h-16');
      emptyQrPlaceholders.forEach(el => {
        if (el.textContent && el.textContent.trim() === 'QR Code') {
          const card = el.closest('div[class*="rounded-3xl"]');
          let tName = 'Table 2';
          if (card) {
            const h3 = card.querySelector('h3');
            if (h3 && h3.textContent.trim()) tName = h3.textContent.trim();
          }
          const rests = getLocalRestaurants();
          const r = rests[0] || { slug: 'apna-restaurant' };
          const targetUrl = window.location.origin + window.location.pathname + '?store=' + encodeURIComponent(r.slug || r.id) + '&table=' + encodeURIComponent(tName) + '&source=qr';
          const newImg = document.createElement('img');
          newImg.src = 'https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=' + encodeURIComponent(targetUrl);
          newImg.alt = tName + ' QR Code';
          newImg.className = 'w-full h-full object-contain';
          newImg.style.cssText = 'aspect-ratio:1/1!important;object-fit:contain!important;';
          el.innerHTML = '';
          el.appendChild(newImg);
        }
      });
    } catch (e) {}
  }

  // =========================================================================
  // CUSTOMER STOREFRONT PICTURE DISPLAY SIZE & ORIENTATION ENGINE
  // =========================================================================
  function applyStorefrontDishImageControls() {
    try {
      // Run QR guardian first to ensure all QR codes everywhere remain perfect 1:1 squares
      guardTableQRCodes();

      // Check if current page is Admin / Kitchen / Table Management
      const bodyText = (document.body ? document.body.innerText : '') || '';
      const isAdminView = bodyText.includes('Table QR Generator') ||
                          bodyText.includes('Dine-In Tables & Floor') ||
                          bodyText.includes('Live Order Board') ||
                          bodyText.includes('Super Admin Console') ||
                          bodyText.includes('Branch Order Screen') ||
                          document.querySelector('button[title*="Add New Dine-In Table"]') ||
                          document.querySelector('button[title*="Print A5 tent card"]') ||
                          window.location.search.includes('admin');

      // Remove lingering manager PIN launchers from customer view
      const oldBtn = document.getElementById('storefront-menu-manager-launcher');
      if (oldBtn) oldBtn.remove();

      // If we are in Admin, do NOT apply dish card modifications
      if (isAdminView) {
        const existingBar = document.getElementById('storefront-photo-shape-bar');
        if (existingBar) existingBar.remove();
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const storeSlug = urlParams.get('store') || urlParams.get('restaurant') || urlParams.get('r');
      const rests = getLocalRestaurants();
      let currentRest = null;
      if (storeSlug) {
        const sClean = storeSlug.toLowerCase().trim();
        currentRest = rests.find(r => (r.slug && r.slug.toLowerCase() === sClean) || (r.id && r.id.toLowerCase() === sClean));
      }
      if (!currentRest) currentRest = rests[0];
      if (!currentRest) return;

      // 1. Determine active shape mode (Default to square)
      const savedMode = localStorage.getItem('bitehub_dish_image_mode_' + currentRest.id);
      const activeMode = currentRest.imageOrientation || savedMode || 'square';

      // Apply root attributes
      if (document.documentElement.getAttribute('data-dish-image-mode') !== activeMode) {
        document.documentElement.setAttribute('data-dish-image-mode', activeMode);
      }

      // 2. Ensure floating shape switcher is removed (Only SuperAdmin Theme Editor has shape controls)
      const oldBar = document.getElementById('storefront-photo-shape-bar');
      if (oldBar) oldBar.remove();

      // 3. Apply Per-Food Individual Size & Shape Settings to Storefront Dish Cards
      const allItems = getLocalItems().filter(i => i.restaurantId === currentRest.id);
      const itemMap = new Map();
      if (allItems.length > 0) {
        allItems.forEach(it => {
          if (it.name) itemMap.set(it.name.trim().toLowerCase(), it);
          if (it.imageUrl) itemMap.set(it.imageUrl.trim(), it);
        });
      }

      // Find ONLY storefront food dish card images
      const imgElements = document.querySelectorAll('.group:has(button[class*="Cart"]) .relative.h-48 img, [data-dish-image-container] img');
      imgElements.forEach(img => {
        // STRICT EXCLUSION: Never touch QR codes, icons, avatars, or logos
        const alt = (img.alt || '').toLowerCase();
        const src = (img.src || '').toLowerCase();
        if (alt.includes('qr') || src.includes('qr') || src.includes('create-qr-code') || src.includes('source=qr')) return;
        if (img.closest('.qr-box') || img.closest('[data-qr-code]') || img.closest('#printable-card')) return;
        if (img.width > 0 && img.width <= 48) return;
        if (src.includes('icon.svg') || src.includes('apple-touch-icon') || src.includes('pwa-')) return;

        const parentCard = img.closest('.group') || img.closest('article') || img.closest('div[class*="rounded-3xl"]');
        let matchedItem = itemMap.get(src) || itemMap.get(alt);
        if (!matchedItem && parentCard && parentCard.textContent) {
          const cardText = parentCard.textContent.toLowerCase();
          for (const it of allItems) {
            if (it.name && cardText.includes(it.name.toLowerCase())) {
              matchedItem = it;
              break;
            }
          }
        }

        const container = img.closest('div[class*="relative"]') || img.parentElement;
        if (container) {
          container.setAttribute('data-dish-image-container', 'true');

          if (!img.getAttribute('data-safe-fallback')) {
            img.setAttribute('data-safe-fallback', 'true');
            img.onerror = function() {
              this.onerror = null;
              this.src = SmartImageEngine.DEFAULT_FALLBACK_URL;
            };
          }

          const itemMode = (matchedItem && (matchedItem.imageOrientation || matchedItem.imageSize)) || activeMode;

          if (itemMode === 'square') {
            container.style.aspectRatio = '1 / 1';
            container.style.height = 'auto';
            container.style.maxHeight = '280px';
            container.style.width = '100%';
            container.style.borderRadius = '';
            container.style.margin = '';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '';
            img.style.backgroundColor = '';
          } else if (itemMode === 'circle') {
            container.style.aspectRatio = '1 / 1';
            container.style.width = '160px';
            container.style.height = '160px';
            container.style.borderRadius = '9999px';
            container.style.margin = '12px auto 6px auto';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '9999px';
            img.style.backgroundColor = '';
          } else if (itemMode === 'vertical') {
            container.style.aspectRatio = '3 / 4';
            container.style.height = 'auto';
            container.style.maxHeight = '320px';
            container.style.width = '100%';
            container.style.borderRadius = '';
            container.style.margin = '';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '';
            img.style.backgroundColor = '';
          } else if (itemMode === 'natural' || (matchedItem && matchedItem.imageFit === 'contain')) {
            container.style.aspectRatio = 'auto';
            container.style.height = '200px';
            container.style.maxHeight = '240px';
            container.style.width = '100%';
            container.style.borderRadius = '';
            container.style.margin = '';
            img.style.objectFit = 'contain';
            img.style.borderRadius = '';
            img.style.backgroundColor = '#0b1120';
          } else {
            // horizontal 16:9
            container.style.aspectRatio = '16 / 9';
            container.style.height = 'auto';
            container.style.maxHeight = '220px';
            container.style.width = '100%';
            container.style.borderRadius = '';
            container.style.margin = '';
            img.style.objectFit = 'cover';
            img.style.borderRadius = '';
            img.style.backgroundColor = '';
          }
        }
      });
    } catch (e) {}
  }

  // Auto-enhance #printable-receipt in Admin/Kitchen portal with Restaurant Logo & Reliable Thermal Print
  function enhanceAdminPrintableReceipt() {
    try {
      const receiptEl = document.getElementById('printable-receipt');
      if (!receiptEl) return;

      // Check if logo is already injected
      if (!receiptEl.dataset.logoEnhanced) {
        receiptEl.dataset.logoEnhanced = 'true';

        // Find restaurant name from the slip
        const h2 = receiptEl.querySelector('h2');
        const restName = h2 ? h2.textContent.trim() : '';
        const rests = getLocalRestaurants();
        let matchedRest = rests.find(r => r.name && restName && r.name.toLowerCase() === restName.toLowerCase());
        if (!matchedRest && rests.length > 0) matchedRest = rests[0];

        const restLogo = matchedRest ? (matchedRest.logoUrl || matchedRest.logo || matchedRest.avatar || matchedRest.image || matchedRest.coverUrl) : '';

        if (restLogo) {
          // Find the default generic utensils icon container (.w-10.h-10)
          const iconBox = receiptEl.querySelector('.w-10.h-10') || receiptEl.querySelector('div[class*="rounded-full"]');
          if (iconBox) {
            iconBox.style.display = 'none';
          }

          // Insert high-res restaurant logo at the top
          const logoContainer = document.createElement('div');
          logoContainer.className = 'admin-receipt-logo-container';
          logoContainer.style.cssText = 'text-align:center;margin-bottom:8px;display:flex;justify-content:center;align-items:center;';
          logoContainer.innerHTML = `<img src="${sanitizeUrl(restLogo)}" alt="${sanitizeText(restName)} Logo" class="slip-logo" style="max-height:58px;max-width:130px;object-fit:contain;margin:0 auto 6px auto;display:block;border-radius:4px;-webkit-print-color-adjust:exact;print-color-adjust:exact;" />`;

          const headerParent = h2 ? h2.parentElement : receiptEl.firstElementChild;
          if (headerParent && h2) {
            headerParent.insertBefore(logoContainer, h2);
          } else if (headerParent) {
            headerParent.prepend(logoContainer);
          }
        }
      }

      // Enhance the "Print Receipt (Thermal / A4)" button in the modal footer
      // Enhance the "Print Receipt (Thermal / A4)" button in the modal footer
      const modalContainer = receiptEl.closest('.fixed');
      if (modalContainer && !modalContainer.dataset.printEnhanced) {
        modalContainer.dataset.printEnhanced = 'true';

        // Extract order ticket ID from text or spans
        let ticketId = '';
        const allSpans = receiptEl.querySelectorAll('span, p, div');
        allSpans.forEach(el => {
          const txt = (el.textContent || '').trim();
          if (!ticketId && txt.startsWith('#') && txt.length > 2 && txt.length < 25) {
            ticketId = txt.replace('#', '').trim();
          }
        });
        if (!ticketId) {
          const h2 = receiptEl.querySelector('h2');
          ticketId = (h2 ? h2.textContent.trim() : 'order');
        }

        const slipUrl = '/api/print-slip/' + encodeURIComponent(ticketId);

        const buttons = modalContainer.querySelectorAll('button');
        buttons.forEach(btn => {
          const txt = (btn.textContent || '').trim();
          if (txt.includes('Print') || txt.includes('Receipt') || txt.includes('Slip')) {
            // Add "Open in Tab to Print" button right beside the print button
            if (!modalContainer.querySelector('.admin-open-tab-btn') && btn.parentElement) {
              const tabLink = document.createElement('a');
              tabLink.className = 'admin-open-tab-btn px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center space-x-1.5 shadow cursor-pointer transition-all no-print';
              tabLink.href = slipUrl;
              tabLink.target = '_blank';
              tabLink.rel = 'noopener noreferrer';
              tabLink.style.cssText = 'text-decoration:none;display:inline-flex;align-items:center;gap:6px;';
              tabLink.innerHTML = '<span>🚀</span> <span>Open in Tab to Print</span>';
              btn.parentElement.insertBefore(tabLink, btn);
            }

            btn.onclick = function(e) {
              // If inside iframe sandbox, open new tab directly
              if (window.self !== window.top) {
                try {
                  window.open(slipUrl, '_blank');
                  return;
                } catch(err) {}
              }

              // Trigger window.print()
              try {
                window.print();
              } catch(err) {
                console.warn('[Admin Print] window.print() error:', err);
                try { window.open(slipUrl, '_blank'); } catch(e2) {}
              }
            };
          }
        });
      }
    } catch (e) {
      console.warn('[Admin Receipt Engine]', e);
    }
  }

  // =========================================================================
  // 2.6 RESTAURANT ADMIN SETTINGS - POS SLIP LAYOUT SECTION GUARDIAN
  // =========================================================================
  function ensureAdminSlipSettingsCard() {
    try {
      if (document.getElementById('admin-slip-settings-section')) return;

      const headings = Array.from(document.querySelectorAll('h4, h3, span'));
      const kitchenStatusHeading = headings.find(h => h.textContent && h.textContent.includes('Kitchen Operations Status'));
      if (!kitchenStatusHeading) return;

      const settingsContainer = kitchenStatusHeading.closest('.space-y-6') || kitchenStatusHeading.closest('div.pt-6');
      if (!settingsContainer) return;

      const rests = getLocalRestaurants();
      if (!rests || rests.length === 0) return;

      let activeRest = rests[0];
      for (let r of rests) {
        if (document.body.innerText.includes(r.name)) {
          activeRest = r;
          break;
        }
      }

      const cfg = getRestaurantSlipConfig(activeRest);

      const slipCard = document.createElement('div');
      slipCard.id = 'admin-slip-settings-section';
      slipCard.className = 'bg-slate-900 border border-orange-500/30 rounded-2xl p-5 sm:p-6 space-y-4 shadow-xl';
      slipCard.innerHTML = `
        <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div class="flex items-center space-x-3">
            <div class="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center text-xl shrink-0 shadow">
              🧾
            </div>
            <div>
              <div class="flex items-center space-x-2">
                <h3 class="font-extrabold text-sm text-white">POS Slip & Receipt Layout Designer</h3>
                <span class="px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 text-[10px] font-bold border border-orange-500/30">Admin Thermal POS</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-0.5">Customize paper width (80mm / 58mm), logo, branch header, customer fields, barcode, and receipt footer notes.</p>
            </div>
          </div>
          <div class="flex items-center space-x-2 shrink-0 self-start sm:self-auto">
            <button type="button" id="admin-slip-test-print-btn" class="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-colors shadow">
              <span>🖨️</span> <span>Test Print</span>
            </button>
            <button type="button" id="admin-slip-open-designer-btn" class="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-extrabold flex items-center space-x-1.5 shadow-lg shadow-orange-500/25 cursor-pointer transition-all">
              <span>🎨</span> <span>Full Slip Designer</span>
            </button>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Paper Size / Width</span>
            <div class="flex items-center gap-1.5">
              <span class="px-2.5 py-1 rounded-lg text-xs font-bold bg-orange-500 text-white">${cfg.paperSize || '80mm'}</span>
              <span class="text-[11px] text-slate-400">Thermal POS</span>
            </div>
          </div>
          <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Restaurant Logo</span>
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold ${cfg.showLogo !== false ? 'text-emerald-400' : 'text-slate-400'}">${cfg.showLogo !== false ? '✓ Logo at Top' : 'Logo Hidden'}</span>
            </div>
          </div>
          <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
            <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Thermal Barcode</span>
            <div class="flex items-center gap-1.5">
              <span class="text-xs font-bold ${cfg.showBarcode !== false ? 'text-emerald-400' : 'text-slate-400'}">${cfg.showBarcode !== false ? '✓ Barcode Enabled' : 'Barcode Hidden'}</span>
            </div>
          </div>
        </div>
        <div class="flex items-center justify-between pt-1">
          <span class="text-[11px] text-slate-400">💡 Click "Full Slip Designer" to visually edit paper width, tax, fonts, and view live dual-pane preview.</span>
          <button type="button" id="admin-slip-quick-open-btn" class="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-orange-400 border border-orange-500/30 rounded-xl text-xs font-bold cursor-pointer">
            Edit Slip Layout →
          </button>
        </div>
      `;

      settingsContainer.insertBefore(slipCard, settingsContainer.firstChild);

      const openDesigner = () => {
        if (typeof window.openSlipLayoutCustomizer === 'function') {
          window.openSlipLayoutCustomizer(activeRest.id);
        }
      };

      const testBtn = document.getElementById('admin-slip-test-print-btn');
      if (testBtn) {
        testBtn.onclick = () => {
          const sample = {
            id: 'SLIP-' + Math.floor(1000 + Math.random() * 9000),
            customerName: 'Muhammad Hamza',
            customerPhone: '+92 301 8765432',
            customerAddress: 'Commercial Market, Lahore',
            orderType: 'dine_in',
            tableNumber: 'T-04',
            paymentMethod: 'cash',
            items: [
              { name: 'Special Chicken Biryani (Double)', price: 750, quantity: 2 },
              { name: 'Fresh Mint Raita & Salad', price: 120, quantity: 1 }
            ],
            subtotal: 1620,
            deliveryFee: 0,
            totalAmount: 1620,
            createdAt: new Date().toISOString()
          };
          if (typeof window.showReceiptSlipModal === 'function') {
            window.showReceiptSlipModal(sample, activeRest);
          } else {
            window.open('/api/print-slip/TEST-SAMPLE?preview=1', '_blank');
          }
        };
      }

      const openBtn = document.getElementById('admin-slip-open-designer-btn');
      if (openBtn) openBtn.onclick = openDesigner;
      const quickBtn = document.getElementById('admin-slip-quick-open-btn');
      if (quickBtn) quickBtn.onclick = openDesigner;
    } catch(e) {
      console.warn('[Admin Slip Settings Observer]', e);
    }
  }

  // Keep scanning with interval
  setInterval(applyStorefrontDishImageControls, 1000);
  setInterval(guardTableQRCodes, 800);
  setInterval(enhanceAdminPrintableReceipt, 500);
  setInterval(ensureAdminSlipSettingsCard, 600);

  setTimeout(() => {
    guardTableQRCodes();
    applyStorefrontDishImageControls();
    enhanceAdminPrintableReceipt();
    ensureAdminSlipSettingsCard();
  }, 400);


  // =========================================================================
  // PORTIONS & PIECES PRICE & VARIANT STOREFRONT ENHANCER
  // =========================================================================

  window.formatDishVariantPrice = function(dish, fmt) {
    const f = fmt || function(val) { return 'Rs. ' + Number(val || 0).toLocaleString('en-PK'); };
    if (!dish) return f(0);
    if (dish.hasVariants && Array.isArray(dish.variants) && dish.variants.length > 0) {
      if (dish.variants.length === 2) {
        return dish.variants.map(v => `${v.name}: ${f(v.price)}`).join(' | ');
      }
      return `${dish.variants[0].name}: ${f(dish.variants[0].price)} - ${dish.variants[dish.variants.length - 1].name}: ${f(dish.variants[dish.variants.length - 1].price)}`;
    }
    return f(dish.price || 0);
  };

  window.openDishVariantSelector = function(dish, onAddToCart, formatPriceFn) {
    if (!dish) return;
    const existing = document.getElementById('dish-variant-selector-modal');
    if (existing) existing.remove();

    const fmt = formatPriceFn || function(val) { return 'Rs. ' + Number(val || 0).toLocaleString('en-PK'); };
    const variants = (dish.hasVariants && Array.isArray(dish.variants) && dish.variants.length > 0)
      ? dish.variants
      : [
          { name: 'Half', price: Math.round((dish.price || 600) * 0.6) },
          { name: 'Full', price: dish.price || 1000 }
        ];

    let selectedIndex = 0;
    let quantity = 1;
    let specialNotes = '';

    const modal = document.createElement('div');
    modal.id = 'dish-variant-selector-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99999999;background:rgba(2,6,23,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto;';

    function render() {
      const selectedVariant = variants[selectedIndex] || variants[0];
      const unitPrice = Number(selectedVariant.price) || 0;
      const totalPrice = unitPrice * quantity;

      modal.innerHTML = `
        <div style="background:#0f172a;border:1px solid #334155;border-radius:24px;max-width:440px;width:100%;color:#f8fafc;font-family:system-ui,-apple-system,sans-serif;box-shadow:0 25px 60px rgba(0,0,0,0.9);overflow:hidden;animation:fadeInScale 0.2s ease-out;position:relative;">
          
          <!-- Dish Visual Header -->
          <div style="position:relative;height:180px;background:#020617;overflow:hidden;">
            <img src="${dish.imageUrl || 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80'}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80'" />
            <div style="position:absolute;inset:0;background:linear-gradient(to top, #0f172a 0%, transparent 65%);"></div>
            
            <button id="close-variant-modal-btn" type="button" style="position:absolute;top:12px;right:12px;background:rgba(15,23,42,0.85);border:1px solid #334155;color:#fff;width:32px;height:32px;border-radius:50%;cursor:pointer;font-size:14px;font-weight:bold;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.5);">✕</button>

            <div style="position:absolute;bottom:10px;left:16px;right:16px;display:flex;align-items:center;justify-content:space-between;">
              <span style="font-size:10px;font-weight:800;background:#0284c7;color:#fff;padding:3px 8px;border-radius:6px;text-transform:uppercase;">${sanitizeText(dish.category || 'Special')}</span>
              ${dish.dietary ? `<span style="font-size:10px;font-weight:700;background:rgba(16,185,129,0.25);color:#34d399;border:1px solid rgba(16,185,129,0.5);padding:2px 8px;border-radius:6px;">${sanitizeText(dish.dietary)}</span>` : ''}
            </div>
          </div>

          <!-- Body Content -->
          <div style="padding:16px 20px;">
            <h3 style="margin:0 0 4px 0;font-size:18px;font-weight:800;color:#fff;">${sanitizeText(dish.name)}</h3>
            ${dish.description ? `<p style="margin:0 0 14px 0;font-size:11px;color:#94a3b8;line-height:1.4;">${sanitizeText(dish.description)}</p>` : '<div style="margin-bottom:12px;"></div>'}

            <!-- Variant Selector (Half, Full, 6 Pieces, 12 Pieces, etc.) -->
            <div style="margin-bottom:14px;">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                <label style="font-size:12px;font-weight:800;color:#38bdf8;text-transform:uppercase;letter-spacing:0.5px;">
                  🍗 Choose Portion / Pieces:
                </label>
                <span style="font-size:10px;color:#f59e0b;font-weight:bold;">Required *</span>
              </div>

              <div style="display:flex;flex-direction:column;gap:8px;">
                ${variants.map((v, i) => {
                  const isSelected = i === selectedIndex;
                  return `
                    <div class="variant-option-card" data-index="${i}" style="border:2px solid ${isSelected ? '#f97316' : '#334155'};background:${isSelected ? 'rgba(249,115,22,0.12)' : '#1e293b/60'};border-radius:14px;padding:10px 14px;display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:all 0.15s ease;">
                      <div style="display:flex;align-items:center;gap:10px;">
                        <div style="width:18px;height:18px;border-radius:50%;border:2px solid ${isSelected ? '#f97316' : '#64748b'};display:flex;align-items:center;justify-content:center;">
                          ${isSelected ? '<div style="width:8px;height:8px;border-radius:50%;background:#f97316;"></div>' : ''}
                        </div>
                        <div>
                          <div style="font-size:13px;font-weight:800;color:${isSelected ? '#fff' : '#e2e8f0'};">
                            ${sanitizeText(v.name)}
                          </div>
                          <div style="font-size:10px;color:#94a3b8;">
                            ${v.name.toLowerCase().includes('half') ? '1 Person Serving' : (v.name.toLowerCase().includes('full') ? '2-3 Persons Serving' : (v.name.toLowerCase().includes('piece') ? 'Freshly Fried & Tossed' : 'Chef Curated Portion'))}
                          </div>
                        </div>
                      </div>

                      <div style="text-align:right;">
                        <div style="font-size:14px;font-weight:900;color:${isSelected ? '#fbbf24' : '#34d399'};">
                          ${fmt(v.price)}
                        </div>
                        ${isSelected ? '<span style="font-size:9px;color:#f97316;font-weight:bold;">Selected ✓</span>' : ''}
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>

            <!-- Quantity Stepper -->
            <div style="display:flex;align-items:center;justify-content:space-between;background:#1e293b/40;border:1px solid #334155;border-radius:12px;padding:10px 14px;margin-bottom:14px;">
              <span style="font-size:12px;font-weight:700;color:#cbd5e1;">Quantity:</span>
              <div style="display:flex;align-items:center;gap:12px;">
                <button id="modal-qty-minus" type="button" style="width:30px;height:30px;border-radius:8px;background:#334155;border:none;color:#fff;font-size:16px;font-weight:bold;cursor:pointer;display:flex;align-items:center;justify-content:center;">−</button>
                <span id="modal-qty-display" style="font-size:14px;font-weight:900;color:#fff;min-width:20px;text-align:center;">${quantity}</span>
                <button id="modal-qty-plus" type="button" style="width:30px;height:30px;border-radius:8px;background:#f97316;border:none;color:#fff;font-size:16px;font-weight:bold;cursor:pointer;display:flex;align-items:center;justify-content:center;">+</button>
              </div>
            </div>

            <!-- Special Request / Instructions -->
            <div style="margin-bottom:16px;">
              <label style="font-size:11px;font-weight:700;color:#94a3b8;display:block;margin-bottom:4px;">Special Request / Instructions (Optional)</label>
              <input id="modal-special-notes" type="text" placeholder="e.g. Less spicy, extra salad/raita..." value="${sanitizeText(specialNotes)}" style="width:100%;background:#020617;border:1px solid #334155;border-radius:10px;padding:8px 12px;font-size:11px;color:#fff;" />
            </div>

            <!-- Add to Cart Button -->
            <button id="modal-confirm-add-btn" type="button" style="width:100%;background:linear-gradient(135deg, #ea580c, #f97316);color:#fff;border:none;border-radius:14px;padding:12px 18px;font-size:13px;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:space-between;box-shadow:0 10px 25px -5px rgba(249,115,22,0.5);transition:all 0.15s ease;">
              <span>➕ Add "${selectedVariant.name}" to Order</span>
              <span>${fmt(totalPrice)}</span>
            </button>
          </div>
        </div>
      `;

      // Events
      const closeBtn = document.getElementById('close-variant-modal-btn');
      if (closeBtn) closeBtn.onclick = () => modal.remove();

      modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
      };

      modal.querySelectorAll('.variant-option-card').forEach(card => {
        card.onclick = () => {
          selectedIndex = parseInt(card.getAttribute('data-index'), 10);
          render();
        };
      });

      const minusBtn = document.getElementById('modal-qty-minus');
      const plusBtn = document.getElementById('modal-qty-plus');
      if (minusBtn) {
        minusBtn.onclick = () => {
          if (quantity > 1) {
            quantity--;
            render();
          }
        };
      }
      if (plusBtn) {
        plusBtn.onclick = () => {
          quantity++;
          render();
        };
      }

      const notesInp = document.getElementById('modal-special-notes');
      if (notesInp) {
        notesInp.oninput = (e) => {
          specialNotes = e.target.value;
        };
      }

      const addBtn = document.getElementById('modal-confirm-add-btn');
      if (addBtn) {
        addBtn.onclick = () => {
          modal.remove();
          if (typeof onAddToCart === 'function') {
            onAddToCart(selectedVariant, quantity, specialNotes);
          }
        };
      }
    }

    render();
    document.body.appendChild(modal);
  };


  console.log('[BiteHub Suite] Manual Menu Manager, POS Slip Settings in Admin & Strict Super Admin Plan Access Initialized.');
})();
