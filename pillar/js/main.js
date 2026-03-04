/* ── main.js ── State machine: idle → menu → content ── */

(function() {

  // ── State ──
  var STATE = { IDLE: 'idle', MENU: 'menu', CONTENT: 'content' };
  var currentState = STATE.IDLE;
  var currentItemIndex = 0;
  var config = null;

  // ── Idle Timer ──
  var idleTimer = null;
  var IDLE_TIMEOUT = 60000; // 60 seconds

  // ── DOM References ──
  var screenIdle, screenMenu, screenContent;
  var idleHeadline, idleCtaText;
  var menuItems;
  var contentTitle, contentHero, contentThumbnails, contentBody;
  var navPrev, navHome, navNext;
  var activeVideo = null;
  var imageCache = {};

  // ── Initialize ──
  function init() {
    cacheDOM();
    wireEvents();
    ContentLoader.load(function(cfg) {
      config = cfg;
      applyTheme(config.color);
      preloadImages(config.items);
      renderIdle();
      renderMenu();
      initRadialAnimation();
      transitionTo(STATE.IDLE);
      resetIdleTimer();
    });
  }

  function cacheDOM() {
    screenIdle = document.getElementById('screen-idle');
    screenMenu = document.getElementById('screen-menu');
    screenContent = document.getElementById('screen-content');
    idleHeadline = document.getElementById('idle-headline');
    idleCtaText = document.getElementById('idle-cta-text');
    menuItems = document.getElementById('menu-items');
    contentTitle = document.getElementById('content-title');
    contentHero = document.getElementById('content-hero');
    contentThumbnails = document.getElementById('content-thumbnails');
    contentBody = document.getElementById('content-body');
    navPrev = document.getElementById('nav-prev');
    navHome = document.getElementById('nav-home');
    navNext = document.getElementById('nav-next');
  }

  // ── Preload all content media ──
  function cacheImage(src) {
    if (!imageCache[src]) {
      var img = new Image();
      img.src = src;
      imageCache[src] = img;
    }
  }

  function preloadImages(items) {
    if (!items) return;
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      // Hero photos
      if (item.media && item.media.type === 'photo' && item.media.src) {
        cacheImage(item.media.src);
      }
      // Hero videos — preload via hidden video element
      if (item.media && item.media.type === 'video' && item.media.src) {
        var v = document.createElement('video');
        v.preload = 'auto';
        v.src = item.media.src;
        imageCache['video:' + item.media.src] = v;
      }
      // Thumbnails
      if (item.thumbnails) {
        for (var t = 0; t < item.thumbnails.length; t++) {
          cacheImage(item.thumbnails[t]);
        }
      }
      // Overlay images (e.g. GIFs)
      if (item.overlay) {
        cacheImage(item.overlay);
      }
      // Partner logos
      if (item.partnerLogos) {
        for (var p = 0; p < item.partnerLogos.length; p++) {
          cacheImage(item.partnerLogos[p]);
        }
      }
    }
  }

  // ── Theme ──
  function applyTheme(color) {
    if (!color) return;
    document.documentElement.style.setProperty('--pillar-color', color);
  }

  // ── State Machine ──
  function transitionTo(state, itemIndex) {
    // Stop any playing video when leaving content
    if (currentState === STATE.CONTENT) {
      stopVideo();
    }

    currentState = state;

    // Toggle screen visibility
    toggleScreen(screenIdle, state === STATE.IDLE);
    toggleScreen(screenMenu, state === STATE.MENU);
    toggleScreen(screenContent, state === STATE.CONTENT);

    // Toggle blurred background for menu/content screens
    if (typeof RadialLeaf !== 'undefined') {
      RadialLeaf.showBackground(state !== STATE.IDLE);
    }

    if (state === STATE.CONTENT && itemIndex !== undefined) {
      currentItemIndex = itemIndex;
      renderContent(currentItemIndex);
    }

    // Scroll content back to top when entering
    if (state === STATE.CONTENT) {
      var scrollEl = document.querySelector('.content-scroll');
      if (scrollEl) scrollEl.scrollTop = 0;
    }

    resetIdleTimer();
  }

  function toggleScreen(el, show) {
    if (show) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }

  // ── Radial Animation ──
  function initRadialAnimation() {
    var bgCanvas = document.getElementById('radial-bg');
    var fgCanvas = document.getElementById('radial-fg');
    if (!bgCanvas || !fgCanvas || typeof RadialLeaf === 'undefined') return;
    RadialLeaf.init(bgCanvas, fgCanvas, config.id);
  }

  // ── Idle Screen ──
  function renderIdle() {
    if (!config || !config.idle) return;
    idleHeadline.innerHTML = config.idle.headline;
    idleCtaText.innerHTML = config.idle.cta;
    // Canvas animation handles the illustration — no static image needed
  }

  // ── Menu Screen ──
  function renderMenu() {
    if (!config || !config.items) return;
    menuItems.innerHTML = '';

    for (var i = 0; i < config.items.length; i++) {
      var item = config.items[i];
      var card = document.createElement('button');
      card.className = 'menu-card';
      card.setAttribute('data-index', String(i));

      var content = document.createElement('div');
      content.className = 'menu-card-content';

      // Tag with pillar icon
      var tag = document.createElement('span');
      tag.className = 'menu-card-tag';
      if (config.icon) {
        var tagIcon = document.createElement('img');
        tagIcon.className = 'menu-card-tag-icon';
        tagIcon.src = config.icon;
        tagIcon.alt = '';
        tag.appendChild(tagIcon);
      }
      var tagText = document.createTextNode(item.tag);
      tag.appendChild(tagText);
      content.appendChild(tag);

      // Title
      var title = document.createElement('span');
      title.className = 'menu-card-title';
      title.textContent = item.title;
      if (item.titleMaxWidth) {
        title.style.maxWidth = item.titleMaxWidth;
      }
      content.appendChild(title);

      // Arrow
      var arrow = document.createElement('img');
      arrow.className = 'menu-card-arrow';
      arrow.src = 'assets/menu-arrow.svg';
      arrow.alt = '';
      content.appendChild(arrow);

      card.appendChild(content);
      card.addEventListener('click', handleMenuCardClick);
      menuItems.appendChild(card);
    }
  }

  function handleMenuCardClick(e) {
    var card = e.currentTarget;
    var index = parseInt(card.getAttribute('data-index'), 10);
    transitionTo(STATE.CONTENT, index);
  }

  // ── Content Screen ──
  function renderContent(index) {
    var item = ContentLoader.getItem(index);
    if (!item) return;

    contentTitle.textContent = item.title;
    contentBody.innerHTML = formatBody(item.body);

    // Hero media
    contentHero.innerHTML = '';
    activeVideo = null;

    if (item.heroLayout === 'phone') {
      // Phone mockup layout with partner logos
      renderPhoneHero(item);
    } else if (item.media) {
      if (item.media.type === 'video') {
        var video = createVideoElement(item);
        contentHero.appendChild(video);
        activeVideo = video;
      } else {
        var img = document.createElement('img');
        img.src = item.media.src;
        img.alt = item.title;
        contentHero.appendChild(img);
      }
    }

    // Optional overlay image (e.g. tilted GIF)
    if (item.overlay) {
      var overlayImg = document.createElement('img');
      overlayImg.src = item.overlay;
      overlayImg.alt = '';
      overlayImg.className = 'hero-overlay';
      contentHero.appendChild(overlayImg);
    }

    // Thumbnail gallery
    contentThumbnails.innerHTML = '';
    if (item.thumbnails && item.thumbnails.length > 1) {
      var thumbLimit = Math.min(item.thumbnails.length, 2);
      for (var t = 0; t < thumbLimit; t++) {
        var thumbBtn = document.createElement('button');
        thumbBtn.className = 'thumb-btn';
        if (t === 0) thumbBtn.classList.add('active');
        thumbBtn.setAttribute('data-src', item.thumbnails[t]);
        thumbBtn.setAttribute('data-index', String(t));
        var thumbImg = document.createElement('img');
        thumbImg.src = item.thumbnails[t];
        thumbImg.alt = '';
        thumbBtn.appendChild(thumbImg);
        thumbBtn.addEventListener('click', handleThumbnailClick);
        contentThumbnails.appendChild(thumbBtn);
      }
    }
  }

  function handleThumbnailClick(e) {
    var btn = e.currentTarget;
    var src = btn.getAttribute('data-src');

    // Swap hero to this image
    stopVideo();
    contentHero.innerHTML = '';
    var img = document.createElement('img');
    img.src = src;
    img.alt = '';
    contentHero.appendChild(img);

    // Update active state on thumbnails
    var allThumbs = contentThumbnails.querySelectorAll('.thumb-btn');
    for (var i = 0; i < allThumbs.length; i++) {
      allThumbs[i].classList.remove('active');
    }
    btn.classList.add('active');
  }

  function createVideoElement(item) {
    var video = document.createElement('video');
    video.src = item.media.src;
    video.setAttribute('playsinline', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
    video.muted = true;
    video.setAttribute('preload', 'auto');
    if (item.thumbnails && item.thumbnails.length > 0) {
      video.setAttribute('poster', item.thumbnails[0]);
    }
    video.addEventListener('click', function() {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
    });
    return video;
  }

  function renderPhoneHero(item) {
    var layout = document.createElement('div');
    layout.className = 'hero-phone-layout';

    // Phone mockup with video inside
    var phone = document.createElement('div');
    phone.className = 'phone-mockup';

    if (item.media) {
      if (item.media.type === 'video') {
        var video = document.createElement('video');
        video.src = item.media.src;
        video.setAttribute('playsinline', '');
        video.setAttribute('preload', 'auto');
        if (item.thumbnails && item.thumbnails.length > 0) {
          video.setAttribute('poster', item.thumbnails[0]);
        }
        phone.appendChild(video);
        activeVideo = video;

        // Play button overlay
        var playBtn = document.createElement('button');
        playBtn.className = 'phone-play-btn';
        playBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>';
        phone.appendChild(playBtn);

        // Pause button (hidden until playing)
        var pauseBtn = document.createElement('button');
        pauseBtn.className = 'phone-pause-btn';
        pauseBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="white"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>';
        phone.appendChild(pauseBtn);

        playBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          video.muted = false;
          video.removeAttribute('muted');
          video.volume = 0.5;
          video.play();
          playBtn.style.display = 'none';
          pauseBtn.style.display = 'flex';
        });

        pauseBtn.addEventListener('click', function(e) {
          e.stopPropagation();
          video.pause();
          pauseBtn.style.display = 'none';
          playBtn.style.display = 'flex';
        });

        video.addEventListener('ended', function() {
          pauseBtn.style.display = 'none';
          playBtn.style.display = 'flex';
        });
      } else {
        var img = document.createElement('img');
        img.src = item.media.src;
        img.alt = item.title;
        phone.appendChild(img);
      }
    }

    layout.appendChild(phone);

    // Partner logos column
    if (item.partnerLogos && item.partnerLogos.length > 0) {
      var logos = document.createElement('div');
      logos.className = 'partner-logos';
      for (var i = 0; i < item.partnerLogos.length; i++) {
        var logoImg = document.createElement('img');
        logoImg.src = item.partnerLogos[i];
        logoImg.alt = '';
        logos.appendChild(logoImg);
      }
      layout.appendChild(logos);
    }

    contentHero.appendChild(layout);
  }

  function stopVideo() {
    if (activeVideo) {
      activeVideo.pause();
      activeVideo.currentTime = 0;
      activeVideo = null;
    }
  }

  function formatBody(text) {
    if (!text) return '';
    // If already contains HTML tags, use as-is
    if (text.indexOf('<p>') !== -1 || text.indexOf('<br') !== -1) {
      return text;
    }
    // Otherwise wrap paragraphs split by double newlines
    var paragraphs = text.split(/\n\n+/);
    var html = '';
    for (var i = 0; i < paragraphs.length; i++) {
      var p = paragraphs[i].replace(/\n/g, '<br>').trim();
      if (p) html += '<p>' + p + '</p>';
    }
    return html;
  }

  // ── Navigation (wrap-around) ──
  function goNext() {
    var count = ContentLoader.getItemCount();
    if (count === 0) return;
    var next = (currentItemIndex + 1) % count;
    transitionTo(STATE.CONTENT, next);
  }

  function goPrev() {
    var count = ContentLoader.getItemCount();
    if (count === 0) return;
    var prev = (currentItemIndex - 1 + count) % count;
    transitionTo(STATE.CONTENT, prev);
  }

  // ── Events ──
  function wireEvents() {
    // Idle screen: any touch goes to menu
    document.getElementById('screen-idle').addEventListener('click', function() {
      if (currentState === STATE.IDLE) {
        transitionTo(STATE.MENU);
      }
    });

    document.getElementById('screen-idle').addEventListener('touchstart', function(e) {
      if (currentState === STATE.IDLE) {
        e.preventDefault();
        transitionTo(STATE.MENU);
      }
    }, { passive: false });

    // Content nav buttons
    document.getElementById('nav-prev').addEventListener('click', function(e) {
      e.stopPropagation();
      goPrev();
    });

    document.getElementById('nav-home').addEventListener('click', function(e) {
      e.stopPropagation();
      stopVideo();
      transitionTo(STATE.MENU);
    });

    document.getElementById('nav-next').addEventListener('click', function(e) {
      e.stopPropagation();
      goNext();
    });

    // Global touch/click listener for idle timer reset
    var frame = document.getElementById('app-frame');
    ['click', 'touchstart', 'scroll'].forEach(function(evt) {
      frame.addEventListener(evt, resetIdleTimer, { passive: true });
    });
  }

  // ── Idle Timer ──
  function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(function() {
      if (currentState !== STATE.IDLE) {
        stopVideo();
        transitionTo(STATE.IDLE);
      }
    }, IDLE_TIMEOUT);
  }

  // ── Boot ──
  document.addEventListener('DOMContentLoaded', init);

})();
