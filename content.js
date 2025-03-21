// Check if we're already initialized to prevent duplicate variable declarations
if (typeof window.alienGameInitialized !== "undefined" && window.alienGameInitialized) {
  console.log('Alien Invader game is already initialized, skipping duplicate initialization');
} else {
  // Set global flag to prevent re-initialization
  window.alienGameInitialized = true;
  
  console.log('content.js: Loading game assets');

  // Game variables
  let gameInitialized = false;
  let canvas = null;
  let bulletCanvas = null;
  let gameInstance = null;
  let activeGameInstance = false;

  // Initialize game state variables that will be used in cleanup functions
  let gameRunning = false; // Start paused until player clicks start
  let projectiles = []; // Functional bullets that handle collisions
  let visualProjectiles = []; // Visual bullets that are always visible
  let explosions = []; // Track active explosions
  let elementsToAnimate = []; // Track elements we need to animate
  let targetableElements = []; // Store all targetable elements on the page
  let score = 0;

  // Health system variables
  let playerHealth = 3; // Player starts with 3 health points
  let isInvincible = false; // Flag for invincibility power-up
  let invincibilityTimer = 0; // Tracks invincibility duration

  // Enemy projectiles
  let enemyProjectiles = []; // Projectiles fired by defensive elements
  let defensiveElements = []; // Elements that can shoot back (headers, nav items, logo)
  let lastEnemyFireTime = 0; // Time tracking for enemy fire rate
  const enemyFireRate = 2000; // Enemy fires every 2 seconds (adjustable)

  // Power-up system
  let powerUps = []; // Active power-ups on screen
  let lastPowerUpTime = 0; // Time tracking for power-up spawns
  const powerUpSpawnRate = 10000; // New power-up every 10 seconds
  let activePowerUps = { // Currently active power-ups
    rapidFire: false,
    spreadShot: false,
    shield: false
  };
  let powerUpTimers = { // Timers for power-up duration
    rapidFire: 0,
    spreadShot: 0,
    shield: 0
  };
  const powerUpDuration = 8000; // Power-ups last for 8 seconds

  // Screen-clearing bomb
  let bombs = 0; // Number of bombs available
  const maxBombs = 1; // Maximum bombs player can hold (changed from 3 to 1)

  // Moving targets
  let movingElements = []; // Elements that move
  let elementSpeeds = {}; // Speeds for moving elements

  // Time attack mode
  let timeAttackMode = true; // Enable time attack mode
  let gameTimeRemaining = 60; // 60 seconds default game time
  let lastTimerUpdate = 0; // For tracking time updates
  let timeDisplay = null; // DOM element for time display

  // Pulse wave effect variables
  let pulseWaves = [];
  const maxWaves = 5; // Reduced from 10 to 5 for less intense effect
  const waveSpeed = 1.5; // Reduced from 2 to 1.5 to slow down wave expansion
  const waveSpawnRate = 400; // Increased from 200ms to 400ms (less frequent pulses)
  let lastWaveTime = 0;

  // Movement controls
  const keys = {
      ArrowLeft: false,
      ArrowRight: false,
      ArrowUp: false,
      ArrowDown: false
  };
  let velocityX = 0;
  let velocityY = 0;
  const maxSpeed = 300; // Pixels per second
  let lastTime = null;
  let lastShotTime = 0; // Track last time the player fired

  // Get both contexts
  let ctx = null;
  let bulletCtx = null;

  // Load game assets
  let shipImg = null;
  let laserSound = null;
  let explosionSound = null;

  // Initialize game state
  let spaceship = {
    x: 0,
    y: 0,
    width: 40,
    height: 40
  };

  // Define event handlers as empty functions initially
  let keydownHandler = () => {};
  let keyupHandler = () => {};

  // Cleanup function to remove event listeners and resources
  function cleanupGame() {
    // First log the state before cleanup
    console.log('Cleaning up game state');
    
    // Reset active game flag
    activeGameInstance = false;
    
    // Stop the game
    gameRunning = false;
    
    // Cancel animation frame if it exists
    if (gameInstance && gameInstance.gameLoopId) {
      cancelAnimationFrame(gameInstance.gameLoopId);
      gameInstance.gameLoopId = null;
    }
    
    // Clear interval if it exists
    if (gameInstance && gameInstance.rescanInterval) {
      clearInterval(gameInstance.rescanInterval);
      gameInstance.rescanInterval = null;
    }
    
    try {
      // Remove event listeners
      document.removeEventListener('keydown', keydownHandler);
      document.removeEventListener('keyup', keyupHandler);
      document.removeEventListener('keydown', handleNukeKeyPress);
      
      // Remove debug elements if they exist
      document.querySelectorAll('.alien-debug-highlight').forEach(el => el.remove());
      
      // Remove game UI elements
      const uiContainer = document.getElementById('alienGameUI');
      if (uiContainer) uiContainer.remove();
      
      // Remove game over screen if it exists
      const gameOverScreen = document.getElementById('alienGameOverScreen');
      if (gameOverScreen) gameOverScreen.remove();
      
      // Reset game state
      projectiles = [];
      visualProjectiles = [];
      explosions = [];
      elementsToAnimate = [];
      targetableElements = [];
      enemyProjectiles = [];
      powerUps = [];
      movingElements = [];
      elementSpeeds = {};
      score = 0;
      
      // Reset health and power-ups
      playerHealth = 3;
      bombs = 0;
      isInvincible = false;
      invincibilityTimer = 0;
      
      // Reset power-up state
      activePowerUps = {
        rapidFire: false,
        spreadShot: false,
        shield: false
      };
      
      // Reset time for time attack mode
      gameTimeRemaining = 60;
      
      // Reset keys state
      Object.keys(keys).forEach(key => {
        keys[key] = false;
      });
      
      // Reset moving targets - restore original positions
      movingElements.forEach(el => {
        try {
          if (el && el.style) {
            el.style.position = '';
            el.style.left = '';
            el.style.top = '';
            el.style.zIndex = '';
            el.style.transition = '';
          }
        } catch (error) {
          console.error('Error restoring element position:', error);
        }
      });
      
      // Remove game elements from DOM
      if (canvas && canvas.parentNode) canvas.remove();
      if (bulletCanvas && bulletCanvas.parentNode) bulletCanvas.remove();
      
      console.log('Game cleanup completed successfully');
    } catch (error) {
      console.error('Error during game cleanup:', error);
    }
  }

  // Check for existing game elements and clean them up on refresh
  function cleanupExistingGame() {
    console.log("Performing complete game cleanup");
    cleanupGame();
    
    // Reset game initialization state and active game flag
    gameInitialized = false;
    activeGameInstance = false;
    
    // Double check for any leftover game UI elements that might not have been properly cleaned up
    const existingCanvas = document.getElementById('alienGameCanvas');
    const existingBulletCanvas = document.getElementById('alienBulletCanvas');
    const existingHelpButton = document.getElementById('alienHelpButton');
    const existingPowerUpsGuide = document.getElementById('alienPowerUpsGuide');
    
    if (existingCanvas) existingCanvas.remove();
    if (existingBulletCanvas) existingBulletCanvas.remove();
    if (existingHelpButton) existingHelpButton.remove();
    if (existingPowerUpsGuide) existingPowerUpsGuide.remove();
    
    console.log("Game cleanup completed, all flags reset");
  }

  // Create the game instance to track game-specific state
  gameInstance = {
    rescanInterval: null,
    gameLoopId: null
  };

  // Clean up any existing game before initializing - NOW MOVED AFTER ALL VARIABLES ARE INITIALIZED
  cleanupExistingGame();

  // Initialize game assets and environment
  function initializeGame() {
    if (gameInitialized) {
      return;
    }
    
    // Create and configure the canvas but don't add to DOM yet
    canvas = document.createElement('canvas');
    canvas.id = 'alienGameCanvas';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.zIndex = '2147483647'; // Maximum z-index to ensure canvas is on top
    canvas.style.pointerEvents = 'none'; // Allow clicking through the canvas
    
    // Add an additional overlay for bullets only
    bulletCanvas = document.createElement('canvas');
    bulletCanvas.id = 'alienBulletCanvas';
    bulletCanvas.width = window.innerWidth;
    bulletCanvas.height = window.innerHeight;
    bulletCanvas.style.position = 'fixed';
    bulletCanvas.style.top = '0';
    bulletCanvas.style.left = '0';
    bulletCanvas.style.zIndex = '2147483647'; // Maximum z-index
    bulletCanvas.style.pointerEvents = 'none';
    bulletCanvas.style.background = 'transparent';
    bulletCanvas.style.transform = 'translateZ(9999px)'; // Force hardware acceleration and increase stacking context
    bulletCanvas.style.willChange = 'transform'; // Optimize for animations
    bulletCanvas.style.isolation = 'isolate'; // Create stacking context
    bulletCanvas.style.mixBlendMode = 'normal'; // Ensure normal blending
    
    // Preload game assets
    shipImg = new Image();
    shipImg.src = chrome.runtime.getURL('spaceship.png');
    laserSound = new Audio(chrome.runtime.getURL('laser.mp3'));
    explosionSound = new Audio(chrome.runtime.getURL('explosion.mp3'));
    
    gameInitialized = true;
  }

  // Setup game but don't show UI or start gameplay until instructed
  initializeGame();

  // Listen for messages from the popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.command === "startInvasion") {
      console.log("Starting game invasion from popup command");
      
      // First check if we already have a game running
      const existingCanvas = document.getElementById('alienGameCanvas');
      if (existingCanvas) {
        // If game is already running, clean it up first
        console.log("Game already running, cleaning up before restart");
        cleanupExistingGame();
      }
      
      // Initialize new game
      initializeGame();
      showGameUI();
    }
  });

  // Function to show game UI and set up gameplay
  function showGameUI() {
    // Check if we already have an active game instance
    if (activeGameInstance) {
      console.log("Game is already active, ignoring duplicate start request");
      return;
    }
    
    if (!gameInitialized) {
      initializeGame();
    }
    
    // First add the game canvas to DOM
    document.body.appendChild(canvas);
    
    // Add all UI elements before bulletCanvas
    createGameUI();
    
    // Add bulletCanvas last to ensure it's on top
    document.body.appendChild(bulletCanvas);
    
    // Get both contexts
    ctx = canvas.getContext('2d');
    bulletCtx = bulletCanvas.getContext('2d');
    
    // Set up event handlers
    document.removeEventListener('keydown', keydownHandler);
    document.removeEventListener('keyup', keyupHandler);
    document.addEventListener('keydown', keydownHandler);
    document.addEventListener('keyup', keyupHandler);
    
    // Use CSS filter to ensure elements don't overlap our canvas
    ensureCanvasIsTopmost();
    
    // Set active game flag
    activeGameInstance = true;
    
    // Start the game directly
    startGame();
  }

  // Use CSS filter to ensure elements don't overlap our canvas
  function ensureCanvasIsTopmost() {
    const style = document.createElement('style');
    style.textContent = `
      #alienGameCanvas, #alienBulletCanvas {
        isolation: isolate;
        mix-blend-mode: normal;
        pointer-events: none !important;
      }
      #alienBulletCanvas {
        z-index: 2147483647 !important;
        will-change: transform;
        transform: translateZ(0);
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
      }
      
      /* Force bulletCanvas above all other elements */
      body * {
        z-index: auto;
      }
      
      /* Ensure bulletCanvas remains on top in shadow DOM contexts */
      :host, :root {
        --bullet-canvas-z-index: 2147483647;
      }
    `;
    document.head.appendChild(style);
  }

  // Function to start the game
  function startGame() {
    // Start the game
    gameRunning = true;
    
    console.log('Game started! Initializing game state...');
    
    // Reset game state
    projectiles = [];
    visualProjectiles = [];
    explosions = [];
    elementsToAnimate = [];
    enemyProjectiles = [];
    powerUps = [];
    movingElements = [];
    elementSpeeds = {};
    defensiveElements = [];
    score = 0;
    lastTime = null;
    lastShotTime = 0;
    
    // Reset health and power-ups
    playerHealth = 3;
    bombs = 1; // Start with one nuke
    isInvincible = false;
    invincibilityTimer = 0;
    
    // Reset power-up state
    activePowerUps = {
      rapidFire: false,
      spreadShot: false,
      shield: false
    };
    
    // Update UI displays
    updateHealthDisplay();
    updateBombsDisplay();
    updateScoreDisplay();
    
    // Reset time for time attack mode
    gameTimeRemaining = 60;
    lastTimerUpdate = Date.now();
    
    // Create UI elements
    createGameUI();
    
    // Show power-ups guide
    showPowerUpsGuide();
    
    // Position spaceship at the bottom center of the screen
    spaceship.x = canvas.width / 2 - spaceship.width / 2;
    spaceship.y = canvas.height - spaceship.height - 20; // Fixed position at bottom with 20px margin
    
    // Debug log game state
    console.log('Game state:', {
      gameRunning,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      spaceshipPosition: {x: spaceship.x, y: spaceship.y},
      eventsAttached: {
        keydown: !!keydownHandler,
        keyup: !!keyupHandler
      },
      assets: {
        shipImageLoaded: shipImg.complete,
        audioAvailable: !!laserSound && !!explosionSound
      }
    });
    
    // Start with initial scan
    scanPageForTargetableElements();
    
    // Scan for defensive elements
    scanForDefensiveElements();
    
    // Set up moving targets
    setupMovingTargets();
    
    // Add bomb key handler
    document.addEventListener('keydown', handleNukeKeyPress);
    
    // Start game loop and store the ID
    gameInstance.gameLoopId = requestAnimationFrame(gameLoop);
    
    // Start periodic rescanning
    gameInstance.rescanInterval = setInterval(() => {
      if (gameRunning) {
        scanPageForTargetableElements();
        scanForDefensiveElements();
      } else {
        clearInterval(gameInstance.rescanInterval);
      }
    }, 5000); // Rescan every 5 seconds
  }

  // Create a debug overlay for targetable elements
  let debugMode = false;
  function toggleDebugOverlay() {
    debugMode = !debugMode;
    if (debugMode) {
      // Mark all targetable elements with a highlight
      targetableElements.forEach(el => {
        try {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            const highlight = document.createElement('div');
            highlight.className = 'alien-debug-highlight';
            highlight.style.cssText = `
              position: fixed;
              border: 1px solid red;
              background-color: rgba(255, 0, 0, 0.2);
              pointer-events: none;
              z-index: 2147483646;
              left: ${rect.left}px;
              top: ${rect.top}px;
              width: ${rect.width}px;
              height: ${rect.height}px;
            `;
            document.body.appendChild(highlight);
          }
        } catch (e) {
          // Ignore errors
        }
      });
    } else {
      // Remove all debug highlights
      document.querySelectorAll('.alien-debug-highlight').forEach(el => el.remove());
    }
  }

  // Check if an element is targetable
  function isTargetableElement(el) {
    // Safety check
    if (!el || typeof el !== 'object' || !el.tagName) {
      return false;
    }
    
    // Skip these elements
    if (el === canvas || 
        el === bulletCanvas ||
        el.tagName === 'HTML' || 
        el.tagName === 'BODY' ||
        el.tagName === 'SCRIPT' ||
        el.tagName === 'STYLE' ||
        el.className === 'alien-debug-highlight') {
      return false;
    }
    
    try {
      // Get element dimensions
      const rect = el.getBoundingClientRect();
      const isVisible = rect.width > 0 && rect.height > 0 && 
                        rect.top < window.innerHeight && rect.bottom > 0 && 
                        rect.left < window.innerWidth && rect.right > 0;
      
      if (!isVisible) return false;
      
      // Check if element is too large (likely a container)
      if (rect.width > window.innerWidth * 0.8 || rect.height > window.innerHeight * 0.8) {
        return false;
      }
      
      // Check for Twitter/X articles (tweets)
      const isXTweet = (el.tagName === 'ARTICLE' || 
                       (el.getAttribute && el.getAttribute('role') === 'article')) &&
                       (el.className && typeof el.className === 'string' && 
                        (el.className.includes('css-') || 
                         el.className.includes('tweet') || 
                         el.className.includes('article')));
      
      // Immediately return true for tweet articles
      if (isXTweet) {
        return true;
      }
      
      // Enhanced image detection - check for images deeply nested in divs
      // This handles Twitter/X style nested image containers
      const hasDeepImage = (element) => {
        // Direct image tag
        if (element.tagName === 'IMG') return true;
        
        // Background image in style
        if (element.style && element.style.backgroundImage && 
            element.style.backgroundImage !== 'none') return true;
            
        // Check for Twitter/X specific image containers
        if (element.getAttribute && 
            (element.getAttribute('data-testid') === 'tweetPhoto' ||
             element.getAttribute('aria-label') === 'Image')) return true;
             
        // Check for elements with image-like roles
        if (element.getAttribute && element.getAttribute('role') === 'img') return true;
        
        // Check attributes that might suggest image content
        const imageAttributes = ['src', 'alt', 'draggable'];
        for (const attr of imageAttributes) {
          if (element.getAttribute && element.getAttribute(attr)) return true;
        }
        
        // Recursively check one level of children for simple structures
        if (element.children && element.children.length < 10) {
          for (let i = 0; i < element.children.length; i++) {
            if (hasDeepImage(element.children[i])) return true;
          }
        }
        
        return false;
      };
      
      // Material UI and React component detection
      const isMuiElement = (el.className && typeof el.className === 'string' && 
                            (el.className.includes('Mui') || 
                             el.className.includes('css-'))) ||
                             (el.getAttribute && el.getAttribute('class') && 
                              el.getAttribute('class').includes('Mui'));
      
      // Check for header buttons specifically
      const isInHeader = el.closest && (el.closest('header') || el.closest('nav') || el.closest('.header'));
      
      // Check for direct button element
      const isButton = el.tagName === 'BUTTON';
      
      // Check for directly nested images
      const hasImage = el.tagName === 'IMG' || 
                      (el.querySelector && el.querySelector('img')) ||
                      (el.style && el.style.backgroundImage && el.style.backgroundImage !== 'none') ||
                      hasDeepImage(el);
      
      // Check for article elements
      const isArticle = el.tagName === 'ARTICLE' || 
                       (el.getAttribute && el.getAttribute('role') === 'article');
      
      // Check for section elements
      const isSection = el.tagName === 'SECTION';
      
      // Enhanced detection for React/MUI buttons - many are deeply nested
      if (isButton || (isMuiElement && isInHeader) || hasImage || isArticle || isSection) {
        return true;
      }
      
      // Check for interactive and content elements
      const isInteractive = el.tagName === 'A' || 
                          el.tagName === 'BUTTON' || 
                          el.tagName === 'INPUT' ||
                          el.tagName === 'SELECT' ||
                          el.tagName === 'TEXTAREA' ||
                          el.hasAttribute('role') ||
                          el.hasAttribute('aria-label') ||
                          el.hasAttribute('tabindex');
                          
      const hasSVG = el.tagName === 'svg' || 
                     el.tagName === 'SVG' || 
                     (el.querySelector && el.querySelector('svg'));
                       
      const hasContent = (el.innerText && el.innerText.trim && el.innerText.trim().length > 0) ||
                        (el.textContent && el.textContent.trim && el.textContent.trim().length > 0);
      
      // Check for navigation elements
      const isNavElement = el.tagName === 'NAV' || 
                         (el.parentElement && el.parentElement.tagName === 'NAV') ||
                         (el.closest && el.closest('nav'));
      
      // Check for interesting classes
      const hasInterestingClass = el.className && typeof el.className === 'string' && (
        el.className.toLowerCase().includes('nav') ||
        el.className.toLowerCase().includes('btn') ||
        el.className.toLowerCase().includes('button') ||
        el.className.toLowerCase().includes('link') ||
        el.className.toLowerCase().includes('menu') ||
        el.className.toLowerCase().includes('icon') ||
        el.className.toLowerCase().includes('tab') || // Add tabs detection
        el.className.toLowerCase().includes('select') ||
        el.className.toLowerCase().includes('image') ||
        el.className.toLowerCase().includes('photo') ||
        el.className.toLowerCase().includes('media') ||
        el.className.toLowerCase().includes('tweet') ||
        el.className.toLowerCase().includes('article')
      );
      
      return isInteractive || hasSVG || hasContent || hasImage || isNavElement || hasInterestingClass;
    } catch (e) {
      return false;
    }
  }

  // Find all targetable elements on the page
  function scanPageForTargetableElements() {
    targetableElements = [];
    
    // Function to process elements
    function processElement(el) {
      if (isTargetableElement(el)) {
        targetableElements.push(el);
      }
      
      // Skip traversing into big containers to improve performance
      if (el.childElementCount > 50) {
        // Instead of traversing all children, pick a sample
        for (let i = 0; i < Math.min(20, el.childElementCount); i++) {
          const randomIndex = Math.floor(Math.random() * el.childElementCount);
          if (el.children[randomIndex]) {
            processElement(el.children[randomIndex]);
          }
        }
      } else {
        // Process all children normally
        for (let i = 0; i < el.childElementCount; i++) {
          processElement(el.children[i]);
        }
      }
    }
    
    // Start processing from document body
    processElement(document.body);
    
    // Special focus on Material UI elements and buttons
    document.querySelectorAll('button, [role="button"], [class*="Mui"], [class*="btn"], [class*="Button"]').forEach(el => {
      if (!targetableElements.includes(el) && isTargetableElement(el)) {
        targetableElements.push(el);
      }
    });
    
    // Special scan for X.com tweets (articles)
    document.querySelectorAll('article, [role="article"], [data-testid="tweet"]').forEach(el => {
      if (!targetableElements.includes(el) && isTargetableElement(el)) {
        targetableElements.push(el);
      }
    });
    
    // Special scan for section elements and their children
    document.querySelectorAll('section').forEach(el => {
      if (!targetableElements.includes(el) && isTargetableElement(el)) {
        targetableElements.push(el);
      }
      
      // Also scan all children of section elements
      el.querySelectorAll('*').forEach(child => {
        if (!targetableElements.includes(child) && isTargetableElement(child)) {
          targetableElements.push(child);
        }
      });
    });
    
    // Scan deeply into article elements to ensure all contents are targetable
    document.querySelectorAll('article').forEach(el => {
      // Scan all children of article elements
      el.querySelectorAll('*').forEach(child => {
        if (!targetableElements.includes(child) && isTargetableElement(child)) {
          targetableElements.push(child);
        }
      });
    });
    
    // Special scan for image elements, including deeply nested ones
    document.querySelectorAll('img, [role="img"], [aria-label="Image"], [data-testid="tweetPhoto"], a[href*="photo"]').forEach(el => {
      if (!targetableElements.includes(el) && isTargetableElement(el)) {
        targetableElements.push(el);
      }
    });
    
    // Scan for elements with background images
    document.querySelectorAll('*').forEach(el => {
      try {
        if (el.style && el.style.backgroundImage && el.style.backgroundImage !== 'none') {
          if (!targetableElements.includes(el) && isTargetableElement(el)) {
            targetableElements.push(el);
          }
        }
      } catch (e) {
        // Skip elements that cause errors
      }
    });
    
    // Special focus on navigation elements and their children
    document.querySelectorAll('nav, [role="navigation"], header, .header').forEach(nav => {
      nav.querySelectorAll('*').forEach(el => {
        if (!targetableElements.includes(el) && isTargetableElement(el)) {
          targetableElements.push(el);
        }
      });
    });
    
    // Also scan for SVG elements which might be missed
    document.querySelectorAll('svg, [role="img"]').forEach(el => {
      if (!targetableElements.includes(el) && isTargetableElement(el)) {
        targetableElements.push(el);
      }
    });
    
    // Special scan for tab elements (commonly missed in UIs)
    document.querySelectorAll('[role="tab"], [class*="tab-"], [class*="Tab"]').forEach(el => {
      if (!targetableElements.includes(el) && isTargetableElement(el)) {
        targetableElements.push(el);
      }
    });
    
    // Add comprehensive scan for specified priority elements
    const prioritySelectors = [
      'span', // Spans
      'a', // Links
      'h1, h2, h3, h4, h5, h6, [role="heading"]', // Titles/headings
      'p', // Paragraphs
      'video, [class*="video"]', // Videos
      'select, [role="listbox"], [role="combobox"], [class*="dropdown"], [class*="select"]', // Dropdowns
      'input, textarea, form, [role="textbox"], [role="checkbox"], [role="radio"]' // Form elements
    ];
    
    prioritySelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(el => {
        if (!targetableElements.includes(el) && isTargetableElement(el)) {
          targetableElements.push(el);
        }
      });
    });
    
    // Sort elements by priority - higher priority elements come first
    targetableElements.sort((a, b) => {
      return getElementPriority(b) - getElementPriority(a);
    });
    
    console.log(`Found ${targetableElements.length} targetable elements on the page.`);
    return targetableElements;
  }

  // Scan the page initially
  scanPageForTargetableElements();

  // Define key event handlers implementations
  keydownHandler = (e) => {
      // Track keys currently pressed
      if (e.code in keys) {
        keys[e.code] = true;
      }
      
      // Spacebar for shooting
      if (e.code === 'Space' && gameRunning) {
        e.preventDefault(); // Prevent page scroll
        shoot();
      }
      
      // B key for bomb
      if (e.code === 'KeyB' && gameRunning) {
        useBomb();
      }
      
      // Debug mode toggle with Alt+D
      if (e.code === 'KeyD' && e.altKey) {
        debugMode = !debugMode;
        console.log(`Debug mode: ${debugMode ? 'ON' : 'OFF'}`);
        // Toggle highlight visibility
        document.querySelectorAll('.alien-debug-highlight').forEach(el => {
          el.style.display = debugMode ? 'block' : 'none';
        });
      }
  };

  keyupHandler = (e) => {
      // Track keys released
      if (e.code in keys) {
        keys[e.code] = false;
      }
  };

  // DO NOT add global key event listeners here - only add them when the game starts
  // Event handlers will be added in showGameUI function

  // Handle window resize
  window.addEventListener('resize', () => {
      // Only update if game is running and canvases exist
      if (canvas && bulletCanvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        bulletCanvas.width = window.innerWidth;
        bulletCanvas.height = window.innerHeight;
        
        // Make sure spaceship stays within horizontal bounds
        spaceship.x = Math.min(spaceship.x, window.innerWidth - spaceship.width);
        
        // Always maintain Y position at bottom of screen
        spaceship.y = window.innerHeight - spaceship.height - 20;
        
        // Ensure bulletCanvas is the last child of body to be on top
        if (bulletCanvas.parentNode) {
          bulletCanvas.parentNode.removeChild(bulletCanvas);
          document.body.appendChild(bulletCanvas);
        }
        
        // Rescan elements on resize but only if game is running
        if (gameRunning) {
          scanPageForTargetableElements();
        }
      }
  });

  // Main game loop
  function gameLoop(timestamp) {
      // Calculate delta time for smooth animation
      if (!lastTime) {
        lastTime = timestamp;
      }
      const deltaTime = (timestamp - lastTime) / 1000; // Convert to seconds
      lastTime = timestamp;
      
      // Clear both canvases
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      bulletCtx.clearRect(0, 0, bulletCanvas.width, bulletCanvas.height);
      
      // Time attack mode - update time remaining
      if (timeAttackMode) {
        const currentTime = Date.now();
        gameTimeRemaining -= (currentTime - lastTimerUpdate) / 1000;
        lastTimerUpdate = currentTime;
        
        // Update time display
        updateTimeDisplay();
        
        // Check if time is up
        if (gameTimeRemaining <= 0) {
          showGameOver();
          return;
        }
      }
      
      // Update player movement with delta time
      const moveSpeed = maxSpeed * deltaTime;
      
      if (keys.ArrowLeft) {
        velocityX = -moveSpeed;
      } else if (keys.ArrowRight) {
        velocityX = moveSpeed;
      } else {
        velocityX = 0;
      }
      
      if (keys.ArrowUp) {
        velocityY = -moveSpeed;
      } else if (keys.ArrowDown) {
        velocityY = moveSpeed;
      } else {
        velocityY = 0;
      }
      
      // Update spaceship position
      spaceship.x += velocityX;
      spaceship.y += velocityY;
      
      // Keep spaceship within canvas bounds
      spaceship.x = Math.max(0, Math.min(canvas.width - spaceship.width, spaceship.x));
      spaceship.y = Math.max(0, Math.min(canvas.height - spaceship.height, spaceship.y));
      
      // Update projectiles
      updateProjectiles(deltaTime);
      
      // Update enemy projectiles
      handleDefensiveElements(deltaTime);
      
      // Update power-ups
      spawnPowerUp();
      updatePowerUps(deltaTime);
      
      // Update moving targets
      updateMovingTargets(deltaTime);
      
      // Generate pulse waves effect
      updatePulseWaves(deltaTime);
      
      // Update explosions
      updateExplosions(deltaTime);
      
      // Draw on main canvas first
      
      // Draw spaceship
      if (shipImg.complete) {
        // Draw with slight flashing effect when invincible
        if (isInvincible) {
          ctx.globalAlpha = 0.7 + 0.3 * Math.sin(Date.now() / 100);
        }
        
        ctx.drawImage(shipImg, spaceship.x, spaceship.y, spaceship.width, spaceship.height);
        
        // Reset alpha
        ctx.globalAlpha = 1;
        
        // Draw shield effect if active
        if (activePowerUps.shield) {
          ctx.beginPath();
          ctx.arc(
            spaceship.x + spaceship.width / 2,
            spaceship.y + spaceship.height / 2,
            spaceship.width * 0.7,
            0,
            Math.PI * 2
          );
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 3;
          ctx.stroke();
        }
      } else {
        // Fallback to rectangle if image not loaded
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(spaceship.x, spaceship.y, spaceship.width, spaceship.height);
      }
      
      // Draw power-ups
      drawPowerUps(ctx);
      
      // Draw pulse waves
      drawPulseWaves(ctx);
      
      // Draw explosions
      drawExplosions(ctx);
      
      // Now draw on bulletCanvas last to ensure they're on top
      
      // Draw projectiles
      drawProjectiles(bulletCtx);
      
      // Draw enemy projectiles
      drawEnemyProjectiles(bulletCtx);
      
      // Update score display
      updateScoreDisplay();
      
      // Continue game loop if game is running
      if (gameRunning) {
        gameInstance.gameLoopId = requestAnimationFrame(gameLoop);
      }
    }

  // Create explosion effect
  function createExplosion(x, y) {
      const particles = [];
      const particleCount = 8;
      
      for (let i = 0; i < particleCount; i++) {
          const angle = (Math.PI * 2 / particleCount) * i;
          particles.push({
              x: x,
              y: y,
              vx: Math.cos(angle) * 2,
              vy: Math.sin(angle) * 2,
              radius: 3,
              color: '#FF4500',
              life: 15
          });
      }
      
      explosions.push({ particles, timestamp: Date.now() });
  }

  // Update and draw all explosions
  function updateAndDrawExplosions() {
      const currentTime = Date.now();
      
      for (let e = explosions.length - 1; e >= 0; e--) {
          const explosion = explosions[e];
          const particles = explosion.particles;
          
          let allParticlesDead = true;
          
          for (let i = particles.length - 1; i >= 0; i--) {
              const p = particles[i];
              p.x += p.vx;
              p.y += p.vy;
              p.life--;
              
              if (p.life <= 0) {
                  particles.splice(i, 1);
              } else {
                  allParticlesDead = false;
                  bulletCtx.beginPath();
                  bulletCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                  bulletCtx.fillStyle = p.color;
                  bulletCtx.fill();
              }
          }
          
          if (allParticlesDead || currentTime - explosion.timestamp > 1000) {
              explosions.splice(e, 1);
          }
      }
  }

  // Function to animate falling elements
  function animateFall(element) {
      const startTop = element.getBoundingClientRect().top;
      const startLeft = element.getBoundingClientRect().left;
      let pos = 0;
      const fallSpeed = 5; // Pixels per frame

      // Store original styles to restore if needed
      const originalPosition = element.style.position;
      const originalTop = element.style.top;
      const originalLeft = element.style.left;
      const originalZIndex = element.style.zIndex;

      // Clone the element to keep a visual while the original is removed from flow
      const clone = element.cloneNode(true);
      clone.style.position = 'fixed';
      clone.style.left = `${startLeft}px`;
      clone.style.top = `${startTop}px`;
      clone.style.zIndex = '1'; // Low z-index to stay behind canvas
      clone.style.pointerEvents = 'none'; // Prevent interaction with clone
      document.body.appendChild(clone);
      
      // Hide original element but keep in DOM for layout
      element.style.visibility = 'hidden';

      // Falling animation for the clone
      const interval = setInterval(() => {
          pos += fallSpeed;
          clone.style.top = `${startTop + pos}px`;
          if (startTop + pos > window.innerHeight) {
              clone.remove();
              element.remove(); // Now remove the original element
              clearInterval(interval);
              // Remove from tracking array
              const index = elementsToAnimate.indexOf(element);
              if (index > -1) {
                  elementsToAnimate.splice(index, 1);
              }
              
              // Also remove from targetable elements
              const targetIndex = targetableElements.indexOf(element);
              if (targetIndex > -1) {
                  targetableElements.splice(targetIndex, 1);
              }
          }
      }, 16); // Approximately 60fps
  }

  // Start game when spaceship image loads
  shipImg.onload = () => {
      console.log('Spaceship image loaded.');
      // We don't start automatically anymore - just ensure the image is ready
  };
  shipImg.onerror = () => {
      console.error('Spaceship image failed to load, using fallback.');
      // We don't start automatically anymore
  };

  // Function to create a new pulse wave
  function createPulseWave() {
    const wave = {
      x: spaceship.x + spaceship.width / 2,
      y: spaceship.y + spaceship.height / 2,
      radius: 5,
      maxRadius: 100,
      alpha: 0.8,
      color: '#00ffff'
    };
    pulseWaves.push(wave);
    
    // Limit the number of active waves
    if (pulseWaves.length > maxWaves) {
      pulseWaves.shift();
    }
  }

  // Update and draw pulse waves
  function updateAndDrawPulseWaves(deltaTime) {
    // Create new wave if it's time
    const currentTime = Date.now();
    if (currentTime - lastWaveTime > waveSpawnRate) {
      createPulseWave();
      lastWaveTime = currentTime;
    }
    
    // Draw existing waves
    for (let i = pulseWaves.length - 1; i >= 0; i--) {
      const wave = pulseWaves[i];
      
      // Update wave
      wave.radius += waveSpeed * deltaTime * 60; // Scale by deltaTime for framerate independence
      wave.alpha = 0.8 * (1 - wave.radius / wave.maxRadius); // Fade out as it expands
      
      // Draw wave with thicker stroke
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(0, 255, 255, ${wave.alpha})`;
      ctx.lineWidth = 3;
      ctx.stroke();
      
      // Remove wave if it has expanded beyond max radius
      if (wave.radius >= wave.maxRadius) {
        pulseWaves.splice(i, 1);
      }
    }
  }

  // Function to assess element priority - higher numbers are higher priority
  function getElementPriority(el) {
    try {
      // Safety check
      if (!el || typeof el !== 'object' || !el.tagName) {
        return 0;
      }
      
      const tagName = el.tagName.toLowerCase();
      
      // Priority ranking according to specified order
      // Use descending numbers for priorities to make sorting easier
      
      // First tier - highest priority elements (100-90)
      if (tagName === 'button' || el.getAttribute('role') === 'button' || 
          el.className?.toLowerCase().includes('btn') || 
          el.className?.toLowerCase().includes('button')) {
        return 100; // Buttons
      }
      
      if (tagName === 'span') {
        return 95; // Spans
      }
      
      if (tagName === 'a' || el.getAttribute('role') === 'link') {
        return 90; // Links
      }
      
      // Second tier - high priority visual and content elements (89-80)
      if (tagName === 'img' || el.getAttribute('role') === 'img' || 
          (el.style?.backgroundImage && el.style.backgroundImage !== 'none') ||
          el.getAttribute('data-testid') === 'tweetPhoto' ||
          el.getAttribute('aria-label') === 'Image') {
        return 89; // Images
      }
      
      if (tagName === 'h1' || tagName === 'h2' || tagName === 'h3' || 
          tagName === 'h4' || tagName === 'h5' || tagName === 'h6' ||
          el.getAttribute('role') === 'heading') {
        return 88; // Titles/Headings
      }
      
      if (tagName === 'p') {
        return 85; // Paragraphs
      }
      
      if (tagName === 'svg' || el.querySelector?.('svg') || 
          el.className?.toLowerCase().includes('icon')) {
        return 82; // Icons
      }
      
      if (tagName === 'video' || el.tagName === 'VIDEO' ||
          el.getAttribute('data-testid')?.includes('video') ||
          el.className?.toLowerCase().includes('video') ||
          el.querySelector?.('video')) {
        return 80; // Videos
      }
      
      // Third tier - interactive elements (79-70)
      if (tagName === 'nav' || el.getAttribute('role') === 'navigation' ||
          el.className?.toLowerCase().includes('nav') ||
          el.closest?.('nav')) {
        return 79; // Navigation items
      }
      
      if (el.className?.toLowerCase().includes('logo') || 
          el.getAttribute('alt')?.toLowerCase().includes('logo')) {
        return 77; // Logos
      }
      
      if (tagName === 'select' || 
          el.getAttribute('role') === 'listbox' ||
          el.getAttribute('role') === 'combobox' ||
          el.className?.toLowerCase().includes('dropdown') ||
          el.className?.toLowerCase().includes('drop-down') ||
          el.className?.toLowerCase().includes('select')) {
        return 75; // Dropdowns
      }
      
      if (tagName === 'input' || tagName === 'textarea' || 
          tagName === 'select' || tagName === 'form' ||
          el.closest?.('form') ||
          el.getAttribute('role') === 'textbox' ||
          el.getAttribute('role') === 'checkbox' ||
          el.getAttribute('role') === 'radio') {
        return 70; // Form elements
      }
      
      // Fourth tier - containers (69-60)
      // Special case for article elements - they're likely tweets on X.com
      if (tagName === 'article' || el.getAttribute('role') === 'article' ||
          el.getAttribute('data-testid') === 'tweet') {
        return 85; // Articles (tweets) - higher priority
      }
      
      // Give section elements a better priority than regular divs
      if (tagName === 'section') {
        return 75; // Sections are important content containers
      }
      
      // Div containers and wrappers get lowest priority
      if (tagName === 'div' || tagName === 'main' || tagName === 'aside') {
        // Check if it's likely a content wrapper or a utility div
        if (el.childElementCount > 0 && el.innerText?.trim()?.length > 0) {
          return 65; // Content div with actual content
        }
        return 60; // Just a wrapper div
      }
      
      // Default priority for other elements
      return 50;
    } catch (e) {
      return 0;
    }
  }

  // Function to create game UI elements
  function createGameUI() {
    // First remove any existing UI to prevent duplicates
    const existingUI = document.getElementById('alienGameUI');
    if (existingUI) existingUI.remove();
    
    // Create a UI container
    const uiContainer = document.createElement('div');
    uiContainer.id = 'alienGameUI';
    uiContainer.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      z-index: 2147483647;
      padding: 10px;
      background-color: rgba(0, 0, 0, 0.7);
      border-radius: 5px;
      color: white;
      font-family: 'Arial', sans-serif;
      font-size: 14px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      pointer-events: none;
    `;
    
    // Health display
    const healthDisplay = document.createElement('div');
    healthDisplay.id = 'alienHealthDisplay';
    healthDisplay.style.cssText = `
      display: flex;
      align-items: center;
      gap: 5px;
    `;
    healthDisplay.innerHTML = `
      <span style="color: #ff4500; font-weight: bold;">HEALTH:</span>
      <div id="alienHealthIcons" style="display: flex; gap: 3px;"></div>
    `;
    uiContainer.appendChild(healthDisplay);
    
    // Score display
    const scoreDisplay = document.createElement('div');
    scoreDisplay.id = 'alienScoreDisplay';
    scoreDisplay.style.cssText = `
      display: flex;
      align-items: center;
      gap: 5px;
    `;
    scoreDisplay.innerHTML = `
      <span style="color: #ff4500; font-weight: bold;">SCORE:</span>
      <span id="alienScoreValue">0</span>
    `;
    uiContainer.appendChild(scoreDisplay);
    
    // Time display for time attack mode
    if (timeAttackMode) {
      const timeDisplayElement = document.createElement('div');
      timeDisplayElement.id = 'alienTimeDisplay';
      timeDisplayElement.style.cssText = `
        display: flex;
        align-items: center;
        gap: 5px;
      `;
      timeDisplayElement.innerHTML = `
        <span style="color: #ff4500; font-weight: bold;">TIME:</span>
        <span id="alienTimeValue">60</span>
      `;
      uiContainer.appendChild(timeDisplayElement);
      timeDisplay = timeDisplayElement;
    }
    
    // Bombs display
    const bombsDisplay = document.createElement('div');
    bombsDisplay.id = 'alienBombsDisplay';
    bombsDisplay.style.cssText = `
      display: flex;
      align-items: center;
      gap: 5px;
    `;
    bombsDisplay.innerHTML = `
      <span style="color: #ff4500; font-weight: bold;">NUKE:</span>
      <div id="alienBombIcons" style="display: flex; gap: 3px;"></div>
    `;
    uiContainer.appendChild(bombsDisplay);
    
    // Power-ups display
    const powerUpsDisplay = document.createElement('div');
    powerUpsDisplay.id = 'alienPowerUpsDisplay';
    powerUpsDisplay.style.cssText = `
      display: flex;
      align-items: center;
      gap: 5px;
    `;
    powerUpsDisplay.innerHTML = `
      <span style="color: #ff4500; font-weight: bold;">POWER-UPS:</span>
      <div id="alienActivePowerUps" style="display: flex; gap: 5px;"></div>
    `;
    uiContainer.appendChild(powerUpsDisplay);
    
    // Help button
    const existingHelpButton = document.getElementById('alienHelpButton');
    if (existingHelpButton) existingHelpButton.remove();
    
    const helpButton = document.createElement('div');
    helpButton.id = 'alienHelpButton';
    helpButton.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      width: 30px;
      height: 30px;
      background-color: rgba(0, 0, 0, 0.7);
      border-radius: 50%;
      color: white;
      font-family: 'Arial', sans-serif;
      font-size: 20px;
      font-weight: bold;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: pointer;
      z-index: 2147483647;
      pointer-events: auto;
      border: 2px solid #00ffff;
    `;
    helpButton.textContent = '?';
    helpButton.addEventListener('click', showPowerUpsGuide);
    document.body.appendChild(helpButton);
    
    // Add to DOM
    document.body.appendChild(uiContainer);
    
    // Initialize health icons
    updateHealthDisplay();
    
    // Initialize bomb icons
    updateBombsDisplay();
  }

  // Function to update health display
  function updateHealthDisplay() {
    const healthIcons = document.getElementById('alienHealthIcons');
    if (!healthIcons) return;
    
    // Calculate health percentage (assuming playerHealth starts at 3)
    const maxHealth = 3;
    const healthPercentage = Math.round((playerHealth / maxHealth) * 100);
    
    // Update display with percentage text
    healthIcons.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        font-weight: bold;
        font-size: 14px;
        color: ${isInvincible ? '#00ffff' : healthPercentage <= 30 ? '#ff0000' : healthPercentage <= 60 ? '#ffff00' : '#00ff00'};
      ">
        ${healthPercentage}%
      </div>
    `;
  }

  // Function to update bombs display
  function updateBombsDisplay() {
    const bombIcons = document.getElementById('alienBombIcons');
    if (!bombIcons) return;
    
    bombIcons.innerHTML = '';
    for (let i = 0; i < bombs; i++) {
      const bombIcon = document.createElement('div');
      bombIcon.style.cssText = `
        width: 15px;
        height: 15px;
        background-color: #ffff00; /* Bright yellow */
        border-radius: 50%;
        position: relative;
      `;
      
      // Add X mark on the bomb
      const xMark = document.createElement('div');
      xMark.style.cssText = `
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;
      `;
      
      const line1 = document.createElement('div');
      line1.style.cssText = `
        position: absolute;
        width: 70%;
        height: 2px;
        background: black;
        top: 50%;
        left: 15%;
        transform: rotate(45deg);
      `;
      
      const line2 = document.createElement('div');
      line2.style.cssText = `
        position: absolute;
        width: 70%;
        height: 2px;
        background: black;
        top: 50%;
        left: 15%;
        transform: rotate(-45deg);
      `;
      
      xMark.appendChild(line1);
      xMark.appendChild(line2);
      bombIcon.appendChild(xMark);
      bombIcons.appendChild(bombIcon);
    }
    
    // If no bombs, show a grayed out placeholder
    if (bombs === 0) {
      const emptyIcon = document.createElement('div');
      emptyIcon.style.cssText = `
        width: 15px;
        height: 15px;
        background-color: #555555; /* Gray */
        border-radius: 50%;
        opacity: 0.5;
      `;
      bombIcons.appendChild(emptyIcon);
    }
  }

  // Function to update score display
  function updateScoreDisplay() {
    const scoreValue = document.getElementById('alienScoreValue');
    if (scoreValue) {
      scoreValue.textContent = score;
    }
  }

  // Function to update time display
  function updateTimeDisplay() {
    const timeValue = document.getElementById('alienTimeValue');
    if (timeValue) {
      timeValue.textContent = Math.ceil(gameTimeRemaining);
    }
  }

  // Function to update power-ups display
  function updatePowerUpsDisplay() {
    const activePowerUpsElement = document.getElementById('alienActivePowerUps');
    if (!activePowerUpsElement) return;
    
    activePowerUpsElement.innerHTML = '';
    
    if (activePowerUps.rapidFire) {
      const rapidFireIcon = document.createElement('div');
      rapidFireIcon.style.cssText = `
        width: 15px;
        height: 15px;
        background-color: #ff00ff;
        clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
      `;
      activePowerUpsElement.appendChild(rapidFireIcon);
    }
    
    if (activePowerUps.spreadShot) {
      const spreadShotIcon = document.createElement('div');
      spreadShotIcon.style.cssText = `
        width: 15px;
        height: 15px;
        background-color: #00ff00;
        clip-path: polygon(0 100%, 50% 0, 100% 100%);
      `;
      activePowerUpsElement.appendChild(spreadShotIcon);
    }
    
    if (activePowerUps.shield) {
      const shieldIcon = document.createElement('div');
      shieldIcon.style.cssText = `
        width: 15px;
        height: 15px;
        background-color: #00ffff;
        border-radius: 50%;
        border: 2px solid white;
      `;
      activePowerUpsElement.appendChild(shieldIcon);
    }
  }

  // Function to show game over screen
  function showGameOver() {
    // Stop the game
    gameRunning = false;
    
    // Create game over screen
    const gameOverScreen = document.createElement('div');
    gameOverScreen.id = 'alienGameOverScreen';
    gameOverScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.85);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 2147483646;
      color: white; 
      font-family: 'Arial', sans-serif;
    `;
    
    // Create game over content
    gameOverScreen.innerHTML = `
      <h1 style="font-size: 36px; margin-bottom: 10px; color: #ff4500;">GAME OVER</h1>
      <p style="font-size: 24px; margin-bottom: 20px; color: #cccccc;">Final Score: ${score}</p>
      <button id="alienRestartButton" style="
        background-color: #00ff00;
        color: black;
        border: none;
        padding: 15px 30px;
        font-size: 20px;
        font-weight: bold;
        border-radius: 10px;
        cursor: pointer;
        transition: transform 0.1s, background-color 0.3s;
        pointer-events: auto;
      ">PLAY AGAIN</button>
    `;
    
    // Add to DOM
    document.body.appendChild(gameOverScreen);
    
    // Make restart button interactive
    const restartButton = document.getElementById('alienRestartButton');
    if (restartButton) {
      restartButton.addEventListener('click', () => {
        // Remove game over screen
        gameOverScreen.remove();
        
        // Reset game state
        cleanupExistingGame();
        
        // Start a new game
        initializeGame();
        showGameUI();
      });
    }
  }

  // Function to scan the page for defensive elements that can shoot back
  function scanForDefensiveElements() {
    defensiveElements = [];
    
    // Look for header elements
    const headers = document.querySelectorAll('header');
    headers.forEach(header => {
      // Add the header element itself as a defensive element
      if (!defensiveElements.includes(header)) {
        defensiveElements.push(header);
      }
      
      // Look for navigation elements
      const navs = header.querySelectorAll('nav, [role="navigation"]');
      navs.forEach(nav => {
        if (!defensiveElements.includes(nav)) {
          defensiveElements.push(nav);
        }
      });
      
      // Look for logo elements
      const logos = header.querySelectorAll('img, svg, [class*="logo"], [id*="logo"]');
      logos.forEach(logo => {
        if (!defensiveElements.includes(logo)) {
          defensiveElements.push(logo);
        }
      });
      
      // Look for navigation links
      const navLinks = header.querySelectorAll('a');
      navLinks.forEach(link => {
        if (!defensiveElements.includes(link)) {
          defensiveElements.push(link);
        }
      });
    });
    
    // Also look for standalone navigation menus and logos
    const standaloneNavs = document.querySelectorAll('nav, [role="navigation"]');
    standaloneNavs.forEach(nav => {
      if (!defensiveElements.includes(nav)) {
        defensiveElements.push(nav);
      }
    });
    
    const standaloneLogo = document.querySelectorAll('img[src*="logo"], [class*="logo"], [id*="logo"]');
    standaloneLogo.forEach(logo => {
      if (!defensiveElements.includes(logo)) {
        defensiveElements.push(logo);
      }
    });
    
    // Limit to a reasonable number of defensive elements
    if (defensiveElements.length > 10) {
      defensiveElements = defensiveElements.slice(0, 10);
    }
    
    console.log(`Found ${defensiveElements.length} defensive elements that can shoot back`);
  }

  // Function to handle defensive elements shooting back
  function handleDefensiveElements(deltaTime) {
    // Check if it's time for an enemy to fire
    const currentTime = Date.now();
    if (currentTime - lastEnemyFireTime > enemyFireRate) {
      // Reset timer
      lastEnemyFireTime = currentTime;
      
      // Randomly select a defensive element to fire
      if (defensiveElements.length > 0) {
        const randomIndex = Math.floor(Math.random() * defensiveElements.length);
        const shooter = defensiveElements[randomIndex];
        
        // Get position of the defensive element
        const rect = shooter.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        
        // Randomly determine if this is a fast projectile (increased from 30% to 50% chance)
        const isFastProjectile = Math.random() < 0.5;
        
        // Calculate speed divisor - lower number = faster projectile
        // Make orange projectiles faster too (from 50 to 35)
        const speedDivisor = isFastProjectile ? 15 : 35;
        
        // Create a new enemy projectile - make them twice larger
        const projectile = {
          x: startX,
          y: startY,
          velocityX: (spaceship.x + spaceship.width / 2 - startX) / speedDivisor, // Aim at player
          velocityY: (spaceship.y + spaceship.height / 2 - startY) / speedDivisor, // Aim at player
          width: isFastProjectile ? 14 : 10, // Doubled from 7/5 to 14/10
          height: isFastProjectile ? 28 : 20, // Doubled from 14/10 to 28/20
          color: isFastProjectile ? '#ff0000' : '#ff8800', // Red for fast projectiles, orange for normal
          isFast: isFastProjectile,
          active: true,
          isHoming: !isFastProjectile // Orange projectiles will home in on player
        };
        
        // Add to enemy projectiles array
        enemyProjectiles.push(projectile);
      }
    }
    
    // Update existing enemy projectiles
    for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
      const projectile = enemyProjectiles[i];
      
      // Update velocity for homing projectiles (orange ones)
      if (projectile.isHoming) {
        // Calculate direction to player's current position
        const targetX = spaceship.x + spaceship.width / 2;
        const targetY = spaceship.y + spaceship.height / 2;
        
        // Calculate vector to player
        const dirX = targetX - projectile.x;
        const dirY = targetY - projectile.y;
        
        // Normalize and adjust speed
        const length = Math.sqrt(dirX * dirX + dirY * dirY);
        if (length > 0) {
          // Adjust velocities to track player but not too aggressively (30% tracking)
          projectile.velocityX = projectile.velocityX * 0.7 + (dirX / length) * 100 * 0.3;
          projectile.velocityY = projectile.velocityY * 0.7 + (dirY / length) * 100 * 0.3;
        }
      }
      
      // Move projectile
      projectile.x += projectile.velocityX * deltaTime;
      projectile.y += projectile.velocityY * deltaTime;
      
      // Check if projectile is out of bounds
      if (
        projectile.x < 0 ||
        projectile.x > canvas.width ||
        projectile.y < 0 ||
        projectile.y > canvas.height
      ) {
        enemyProjectiles.splice(i, 1);
        continue;
      }
      
      // Check for collision with player
      if (
        !isInvincible && // Only check collision if player is not invincible
        projectile.x < spaceship.x + spaceship.width &&
        projectile.x + projectile.width > spaceship.x &&
        projectile.y < spaceship.y + spaceship.height &&
        projectile.y + projectile.height > spaceship.y
      ) {
        // Player hit by enemy projectile
        playerHit();
        enemyProjectiles.splice(i, 1);
      }
    }
  }

  // Function to draw enemy projectiles
  function drawEnemyProjectiles(ctx) {
    for (const projectile of enemyProjectiles) {
      const centerX = projectile.x + projectile.width / 2;
      const centerY = projectile.y + projectile.height / 2;
      const radius = projectile.width / 2;
      
      // Draw trail for homing projectiles
      if (projectile.isHoming) {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(centerX - projectile.velocityX * 0.3, centerY - projectile.velocityY * 0.3);
        ctx.strokeStyle = 'rgba(255, 136, 0, 0.6)'; // Semi-transparent orange
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      
      ctx.strokeStyle = projectile.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      // Draw a simple hexagon for all projectiles
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      ctx.stroke();
    }
  }

  // Function to handle player being hit
  function playerHit() {
    // Decrease health
    playerHealth--;
    
    // Update health display
    updateHealthDisplay();
    
    // Flash the player to indicate damage
    isInvincible = true;
    invincibilityTimer = 1500; // 1.5 seconds of invincibility after being hit
    
    // Check if player is dead
    if (playerHealth <= 0) {
      showGameOver();
    }
  }

  // Function to spawn power-ups
  function spawnPowerUp() {
    const currentTime = Date.now();
    if (currentTime - lastPowerUpTime > powerUpSpawnRate) {
      // Reset timer
      lastPowerUpTime = currentTime;
      
      // Determine power-up type with adjusted probabilities
      // Nukes are not available as pickups since player starts with one
      const randomVal = Math.random();
      let powerUpType;
      
      if (randomVal < 0.33) {
        powerUpType = 'rapidFire';
      } else if (randomVal < 0.67) {
        powerUpType = 'spreadShot';
      } else {
        powerUpType = 'shield';
      }
      
      // Get a random position on the screen
      const x = Math.random() * (canvas.width - 30);
      const y = 0; // Start at the top
      
      // Create power-up object
      const powerUp = {
        x,
        y,
        width: 30,
        height: 30,
        type: powerUpType,
        velocityY: 100, // Speed at which it falls
        active: true
      };
      
      // Add to power-ups array
      powerUps.push(powerUp);
    }
  }

  // Function to update power-ups
  function updatePowerUps(deltaTime) {
    // Update existing power-ups
    for (let i = powerUps.length - 1; i >= 0; i--) {
      const powerUp = powerUps[i];
      
      // Move power-up down
      powerUp.y += powerUp.velocityY * deltaTime;
      
      // Remove if out of bounds
      if (powerUp.y > canvas.height) {
        powerUps.splice(i, 1);
        continue;
      }
      
      // Check for collision with player
      if (
        powerUp.x < spaceship.x + spaceship.width &&
        powerUp.x + powerUp.width > spaceship.x &&
        powerUp.y < spaceship.y + spaceship.height &&
        powerUp.y + powerUp.height > spaceship.y
      ) {
        // Collect power-up
        collectPowerUp(powerUp.type);
        powerUps.splice(i, 1);
      }
    }
    
    // Update active power-up timers
    for (const [type, active] of Object.entries(activePowerUps)) {
      if (active && type !== 'bomb') { // Bombs don't expire
        powerUpTimers[type] -= deltaTime * 1000;
        if (powerUpTimers[type] <= 0) {
          // Power-up expired
          activePowerUps[type] = false;
          powerUpTimers[type] = 0;
          updatePowerUpsDisplay();
        }
      }
    }
    
    // Update invincibility timer
    if (isInvincible && !activePowerUps.shield) { // Don't count down shield invincibility
      invincibilityTimer -= deltaTime * 1000;
      if (invincibilityTimer <= 0) {
        isInvincible = false;
        updateHealthDisplay();
      }
    }
  }

  // Function to draw power-ups
  function drawPowerUps(ctx) {
    for (const powerUp of powerUps) {
      // Draw power-up shape based on type
      switch (powerUp.type) {
        case 'rapidFire':
          // Diamond shape for rapid fire
          ctx.fillStyle = '#ff00ff';
          ctx.beginPath();
          ctx.moveTo(powerUp.x + powerUp.width / 2, powerUp.y);
          ctx.lineTo(powerUp.x + powerUp.width, powerUp.y + powerUp.height / 2);
          ctx.lineTo(powerUp.x + powerUp.width / 2, powerUp.y + powerUp.height);
          ctx.lineTo(powerUp.x, powerUp.y + powerUp.height / 2);
          ctx.closePath();
          ctx.fill();
          break;
          
        case 'spreadShot':
          // Triangle for spread shot
          ctx.fillStyle = '#00ff00';
          ctx.beginPath();
          ctx.moveTo(powerUp.x, powerUp.y + powerUp.height);
          ctx.lineTo(powerUp.x + powerUp.width / 2, powerUp.y);
          ctx.lineTo(powerUp.x + powerUp.width, powerUp.y + powerUp.height);
          ctx.closePath();
          ctx.fill();
          break;
          
        case 'shield':
          // Circle for shield
          ctx.fillStyle = '#00ffff';
          ctx.beginPath();
          ctx.arc(
            powerUp.x + powerUp.width / 2,
            powerUp.y + powerUp.height / 2,
            powerUp.width / 2,
            0,
            Math.PI * 2
          );
          ctx.fill();
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
      }
    }
  }

  // Function to collect power-up
  function collectPowerUp(type) {
    switch (type) {
      case 'rapidFire':
        // Activate rapid fire power-up
        activePowerUps.rapidFire = true;
        powerUpTimers.rapidFire = powerUpDuration;
        break;
        
      case 'spreadShot':
        // Activate spread shot power-up
        activePowerUps.spreadShot = true;
        powerUpTimers.spreadShot = powerUpDuration;
        break;
        
      case 'shield':
        // Activate shield power-up
        activePowerUps.shield = true;
        isInvincible = true;
        powerUpTimers.shield = powerUpDuration;
        break;
    }
    
    // Update power-ups display
    updatePowerUpsDisplay();
  }

  // Function to use nuke (screen-clearing)
  function useNuke() {
    if (bombs <= 0) return;
    
    // Decrease bomb count
    bombs--;
    updateBombsDisplay();
    
    // Create explosion effect
    const explosionSize = 300;
    createExplosion(canvas.width / 2, canvas.height / 2, explosionSize, 2);
    
    // Play explosion sound
    if (explosionSound) {
      const clonedSound = explosionSound.cloneNode();
      clonedSound.volume = 0.3;
      clonedSound.play();
    }
    
    // Destroy all visible elements on screen
    const elementsToDestroy = [];
    
    targetableElements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      // Check if element is visible on screen
      if (
        centerX >= 0 &&
        centerX <= canvas.width &&
        centerY >= 0 &&
        centerY <= canvas.height
      ) {
        elementsToDestroy.push(el);
      }
    });
    
    // Destroy elements with delay for visual effect
    let delay = 100;
    elementsToDestroy.forEach(el => {
      setTimeout(() => {
        destroyElement(el);
      }, delay);
      delay += 50;
    });
    
    // Clear all enemy projectiles
    enemyProjectiles = [];
  }

  // Function to handle nuke key press
  function handleNukeKeyPress(event) {
    if (event.code === 'KeyB' && gameRunning) {
      useNuke();
    }
  }

  // Function to set up moving targets
  function setupMovingTargets() {
    movingElements = [];
    elementSpeeds = {};
    
    // Only make a percentage of targetable elements move
    const candidateElements = targetableElements.filter(el => {
      // Don't make headers or large elements move
      const rect = el.getBoundingClientRect();
      return rect.width < 200 && rect.height < 200 && el.tagName !== 'HEADER';
    });
    
    // Select random elements to be moving targets (up to 20% of candidates)
    const numMovingElements = Math.floor(candidateElements.length * 0.2);
    for (let i = 0; i < numMovingElements && i < candidateElements.length; i++) {
      const randomIndex = Math.floor(Math.random() * candidateElements.length);
      const element = candidateElements[randomIndex];
      
      // Don't add duplicates
      if (!movingElements.includes(element)) {
        movingElements.push(element);
        
        // Assign random speed and direction
        elementSpeeds[element.uniqueId] = {
          x: (Math.random() * 100 - 50), // -50 to 50 pixels per second
          y: (Math.random() * 40 - 20),  // -20 to 20 pixels per second
          originalPosition: {
            x: element.getBoundingClientRect().left,
            y: element.getBoundingClientRect().top
          },
          maxOffset: 100, // Maximum distance from original position
          direction: 1 // Direction multiplier
        };
      }
    }
    
    // Assign unique IDs to elements for tracking
    let idCounter = 0;
    movingElements.forEach(el => {
      el.uniqueId = `moving-element-${idCounter++}`;
    });
    
    console.log(`Set up ${movingElements.length} moving targets`);
  }

  // Function to update moving targets
  function updateMovingTargets(deltaTime) {
    movingElements.forEach(el => {
      if (!el.uniqueId || !elementSpeeds[el.uniqueId]) return;
      
      // Get current position and speed
      const rect = el.getBoundingClientRect();
      const speed = elementSpeeds[el.uniqueId];
      
      // Calculate new position
      let newLeft = rect.left + speed.x * speed.direction * deltaTime;
      let newTop = rect.top + speed.y * speed.direction * deltaTime;
      
      // Check if we've gone too far from original position
      const distanceX = Math.abs(newLeft - speed.originalPosition.x);
      const distanceY = Math.abs(newTop - speed.originalPosition.y);
      
      if (distanceX > speed.maxOffset || distanceY > speed.maxOffset) {
        // Reverse direction
        speed.direction *= -1;
      }
      
      // Apply new position
      try {
        el.style.position = 'relative';
        el.style.left = `${newLeft - speed.originalPosition.x}px`;
        el.style.top = `${newTop - speed.originalPosition.y}px`;
        el.style.zIndex = '1000';
        el.style.transition = 'left 0.1s, top 0.1s';
      } catch (error) {
        // Remove from moving elements if there was an error
        const index = movingElements.indexOf(el);
        if (index !== -1) {
          movingElements.splice(index, 1);
        }
      }
    });
  }

  // Function to shoot a projectile
  function shoot() {
    // Don't shoot if game isn't running
    if (!gameRunning) return;
    
    // Determine fire rate based on power-ups
    const fireRate = activePowerUps.rapidFire ? 100 : 250; // 4x faster with rapid fire
    
    // Check if we can fire again
    const currentTime = Date.now();
    if (currentTime - lastShotTime < fireRate) return;
    
    // Reset the last shot timer
    lastShotTime = currentTime;
    
    // Play sound effect
    if (laserSound) {
      const clonedSound = laserSound.cloneNode();
      clonedSound.volume = 0.2;
      clonedSound.play().catch(err => console.error('Sound error:', err));
    }
    
    // Create projectile(s) based on power-ups
    if (activePowerUps.spreadShot) {
      // Create 3 projectiles in a spread pattern
      const angles = [-20, 0, 20]; // Angles in degrees
      angles.forEach(angle => {
        createProjectile(angle);
      });
    } else {
      // Just create a single projectile
      createProjectile(0);
    }
  }

  // Function to create a projectile at a specific angle
  function createProjectile(angle) {
    // Calculate center of spaceship for projectile origin
    const startX = spaceship.x + spaceship.width / 2 - 1.5; // Center the projectile (adjusted for smaller width)
    const startY = spaceship.y - 3; // Start just above the spaceship (adjusted for smaller height)
    
    // Convert angle to radians
    const radians = (angle * Math.PI) / 180;
    
    // Calculate velocity components
    const speed = 500; // Pixels per second
    const velocityX = Math.sin(radians) * speed;
    const velocityY = -Math.cos(radians) * speed; // Negative because Y increases downward
    
    // Create projectile object
    const projectile = {
      x: startX,
      y: startY,
      originalX: startX,
      originalY: startY,
      velocityX: velocityX,
      velocityY: velocityY,
      width: 3, // Reduced from 5 to 3
      height: 10, // Reduced from 15 to 10
      color: '#00ffff',
      active: true
    };
    
    // Add to projectiles array
    projectiles.push(projectile);
  }

  // Function to update projectiles
  function updateProjectiles(deltaTime) {
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const projectile = projectiles[i];
      
      // Move projectile
      projectile.x += projectile.velocityX * deltaTime;
      projectile.y += projectile.velocityY * deltaTime;
      
      // Check if projectile is out of bounds
      if (
        projectile.x < 0 ||
        projectile.x > canvas.width ||
        projectile.y < 0 ||
        projectile.y > canvas.height
      ) {
        projectiles.splice(i, 1);
        continue;
      }
      
      // Find targetable elements at current position
      let target = null;
      
      // Get elements at projectile position
      const elementsAtPoint = document.elementsFromPoint(projectile.x, projectile.y);
      
      // Find first targetable element
      for (let j = 0; j < elementsAtPoint.length; j++) {
        const el = elementsAtPoint[j];
        
        // Skip our game canvases
        if (el === canvas || el === bulletCanvas) continue;
        
        // Skip elements already being animated
        if (elementsToAnimate.includes(el)) continue;
        
        // Check if element is in our targetable list
        if (targetableElements.includes(el)) {
          target = el;
          break;
        }
      }
      
      // If we found a target, destroy it
      if (target) {
        destroyElement(target);
        projectiles.splice(i, 1);
      }
    }
  }

  // Function to draw projectiles
  function drawProjectiles(ctx) {
    for (const projectile of projectiles) {
      ctx.fillStyle = projectile.color;
      ctx.fillRect(projectile.x, projectile.y, projectile.width, projectile.height);
    }
    
    for (const projectile of enemyProjectiles) {
      ctx.fillStyle = projectile.color;
      ctx.beginPath();
      ctx.ellipse(
        projectile.x + projectile.width / 2,
        projectile.y + projectile.height / 2,
        projectile.width / 2,
        projectile.height / 2,
        0,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
  }

  // Function to destroy an element
  function destroyElement(element) {
    // Add to elements being animated
    elementsToAnimate.push(element);
    
    // Create explosion at element position
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Create explosion effect
    createExplosion(centerX, centerY);
    
    // Play explosion sound
    if (explosionSound) {
      const clonedSound = explosionSound.cloneNode();
      clonedSound.volume = 0.3;
      clonedSound.play().catch(err => console.error('Sound error:', err));
    }
    
    // Calculate score based on element type - bigger elements = more points
    let pointValue = 10;
    
    try {
      // Bigger elements = more points (up to 50)
      const area = rect.width * rect.height;
      pointValue = Math.min(50, Math.max(10, Math.floor(area / 100)));
      
      // Bonus for moving targets
      if (movingElements.includes(element)) {
        pointValue *= 2;
      }
      
      // Add to score
      score += pointValue;
      
      // Add time bonus in time attack mode (1-3 seconds based on point value)
      if (timeAttackMode) {
        const timeBonus = pointValue / 10; // 1-5 seconds
        gameTimeRemaining += timeBonus;
        updateTimeDisplay();
      }
      
      // Start animation to remove element
      animateFall(element);
    } catch (e) {
      console.error('Error calculating score:', e);
      score += 10; // Fallback score
    }
  }

  // Function to update pulse waves
  function updatePulseWaves(deltaTime) {
    const currentTime = Date.now();
    
    // Create new wave if needed
    if (currentTime - lastWaveTime > waveSpawnRate && pulseWaves.length < maxWaves) {
      pulseWaves.push({
        x: spaceship.x + spaceship.width / 2,
        y: spaceship.y + spaceship.height / 2,
        radius: 3, // Reduced initial radius from 5 to 3
        color: `rgba(0, 255, 255, 0.${Math.floor(Math.random() * 5) + 3})`, // Random opacity
        maxRadius: spaceship.width * 3 // Smaller max radius - just 3x the spaceship width
      });
      
      lastWaveTime = currentTime;
    }
    
    // Update existing waves
    for (let i = pulseWaves.length - 1; i >= 0; i--) {
      const wave = pulseWaves[i];
      wave.radius += waveSpeed * deltaTime * 100; // Grow radius
      
      // Remove wave if it's too big
      if (wave.radius > wave.maxRadius) {
        pulseWaves.splice(i, 1);
      }
    }
  }

  // Function to draw pulse waves
  function drawPulseWaves(ctx) {
    for (const wave of pulseWaves) {
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = 1; // Thinner line width (reduced from 2)
      ctx.stroke();
    }
  }

  // Function to create an explosion effect
  function createExplosion(x, y, size = 30, duration = 1) {
    // Create multiple particles for the explosion
    const particleCount = Math.floor(size / 3);
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 150 + 50;
      const lifetime = Math.random() * 0.5 + 0.5 * duration; // 0.5 to 1.0 seconds
      
      explosions.push({
        x: x,
        y: y,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        size: Math.random() * 6 + 2,
        lifetime: lifetime,
        remainingTime: lifetime,
        color: `hsl(${Math.random() * 60}, 100%, 50%)` // Yellow/orange/red
      });
    }
  }

  // Function to update explosions
  function updateExplosions(deltaTime) {
    for (let i = explosions.length - 1; i >= 0; i--) {
      const explosion = explosions[i];
      
      // Update position
      explosion.x += explosion.velocityX * deltaTime;
      explosion.y += explosion.velocityY * deltaTime;
      
      // Update remaining lifetime
      explosion.remainingTime -= deltaTime;
      
      // Remove if lifetime is over
      if (explosion.remainingTime <= 0) {
        explosions.splice(i, 1);
      }
    }
  }

  // Function to draw explosions
  function drawExplosions(ctx) {
    for (const explosion of explosions) {
      // Calculate opacity based on remaining lifetime
      const opacity = explosion.remainingTime / explosion.lifetime;
      
      // Draw particle
      ctx.fillStyle = explosion.color.replace(')', `, ${opacity})`).replace('hsl', 'hsla');
      ctx.beginPath();
      ctx.arc(explosion.x, explosion.y, explosion.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Function to create a power-ups guide
  function showPowerUpsGuide() {
    // Create guide container
    const guideContainer = document.createElement('div');
    guideContainer.id = 'alienPowerUpsGuide';
    guideContainer.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 350px;
      padding: 20px;
      background-color: rgba(0, 0, 0, 0.85);
      border: 2px solid #00ffff;
      border-radius: 10px;
      color: white;
      font-family: 'Arial', sans-serif;
      z-index: 2147483647;
      text-align: center;
      pointer-events: auto;
    `;
    
    // Create guide content
    guideContainer.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; margin-bottom: 15px;">
        <img src="${chrome.runtime.getURL('spaceship.png')}" style="width: 30px; height: 30px; margin-right: 10px;">
        <h2 style="color: #ff4500; margin: 0; font-size: 18px;">GAME GUIDE</h2>
      </div>
      
      <h3 style="color: #00ffff; margin: 0 0 10px 0; font-size: 16px;">POWER-UPS</h3>
      
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <div style="width: 30px; height: 30px; background-color: #ff00ff; margin-right: 15px; clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);"></div>
        <div style="text-align: left;">
          <div style="font-weight: bold; color: #ff00ff;">Rapid Fire</div>
          <div style="font-size: 12px;">Shoot 4x faster</div>
        </div>
      </div>
      
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <div style="width: 30px; height: 30px; background-color: #00ff00; margin-right: 15px; clip-path: polygon(0 100%, 50% 0, 100% 100%);"></div>
        <div style="text-align: left;">
          <div style="font-weight: bold; color: #00ff00;">Spread Shot</div>
          <div style="font-size: 12px;">Fire 3 projectiles at once</div>
        </div>
      </div>
      
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <div style="width: 30px; height: 30px; background-color: #00ffff; margin-right: 15px; border-radius: 50%; border: 2px solid white;"></div>
        <div style="text-align: left;">
          <div style="font-weight: bold; color: #00ffff;">Shield</div>
          <div style="font-size: 12px;">Temporary invincibility</div>
        </div>
      </div>
      
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <div style="width: 30px; height: 30px; background-color: #ffff00; margin-right: 15px; border-radius: 50%; position: relative;">
          <div style="position: absolute; width: 100%; height: 100%; top: 0; left: 0;">
            <div style="position: absolute; width: 70%; height: 2px; background: black; top: 50%; left: 15%; transform: rotate(45deg);"></div>
            <div style="position: absolute; width: 70%; height: 2px; background: black; top: 50%; left: 15%; transform: rotate(-45deg);"></div>
          </div>
        </div>
        <div style="text-align: left;">
          <div style="font-weight: bold; color: #ffff00;">Nuke (Press B)</div>
          <div style="font-size: 12px;">Clear all elements on screen. Nukes are unpredicatable so use them wisely:)</div>
          <div style="font-size: 11px; color: #ff4500;">One-time use per game - use wisely!</div>
        </div>
      </div>
      
      <h3 style="color: #ff4500; margin: 15px 0 10px 0; font-size: 16px;">ENEMY PROJECTILES</h3>
      
      <div style="display: flex; align-items: center; margin-bottom: 12px;">
        <div style="width: 30px; height: 30px; margin-right: 15px; position: relative;">
          <div style="position: absolute; top: 5px; left: 5px; width: 20px; height: 15px; border: 2px solid #ff8800; border-radius: 50%;"></div>
        </div>
        <div style="text-align: left;">
          <div style="font-weight: bold; color: #ff8800;">Standard Projectile</div>
          <div style="font-size: 12px;">Orange oval - Slower moving</div>
        </div>
      </div>
      
      <div style="display: flex; align-items: center; margin-bottom: 20px;">
        <div style="width: 30px; height: 30px; margin-right: 15px; position: relative;">
          <div style="position: absolute; top: 5px; left: 5px; width: 20px; height: 15px; border: 2px solid #ff0000; border-radius: 50%;"></div>
        </div>
        <div style="text-align: left;">
          <div style="font-weight: bold; color: #ff0000;">Fast Projectile</div>
          <div style="font-size: 12px;">Red oval - Faster and deadlier</div>
          <div style="font-size: 11px; color: #ff4500;">Watch out! 50% of enemy shots are fast!</div>
        </div>
      </div>
      
      <button id="alienGuideCloseBtn" style="
        background-color: #ff4500;
        color: white;
        border: none;
        padding: 8px 16px;
        font-size: 14px;
        border-radius: 5px;
        cursor: pointer;
      ">GOT IT!</button>
    `;
    
    // Add to DOM
    document.body.appendChild(guideContainer);
    
    // Add close button functionality
    document.getElementById('alienGuideCloseBtn').addEventListener('click', () => {
      guideContainer.remove();
    });
    
    // Auto-close after 15 seconds (increased from 10 seconds)
    setTimeout(() => {
      if (document.getElementById('alienPowerUpsGuide')) {
        document.getElementById('alienPowerUpsGuide').remove();
      }
    }, 15000);
  }
}