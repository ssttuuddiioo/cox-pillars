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
  var idleHeadline, idleCtaText, idleIllustration;
  var menuItems;
  var contentTitle, contentHero, contentThumbnails, contentBody;
  var navPrev, navHome, navNext;
  var activeVideo = null;

  // ── Initialize ──
  function init() {
    cacheDOM();
    wireEvents();
    ContentLoader.load(function(cfg) {
      config = cfg;
      applyTheme(config.color);
      renderIdle();
      renderMenu();
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
    idleIllustration = document.getElementById('idle-illustration');
    menuItems = document.getElementById('menu-items');
    contentTitle = document.getElementById('content-title');
    contentHero = document.getElementById('content-hero');
    contentThumbnails = document.getElementById('content-thumbnails');
    contentBody = document.getElementById('content-body');
    navPrev = document.getElementById('nav-prev');
    navHome = document.getElementById('nav-home');
    navNext = document.getElementById('nav-next');
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

  // ── Idle Screen ──
  function renderIdle() {
    if (!config || !config.idle) return;
    idleHeadline.innerHTML = config.idle.headline;
    idleCtaText.innerHTML = config.idle.cta;
    if (config.idle.illustration) {
      var img = document.createElement('img');
      img.src = config.idle.illustration;
      img.alt = '';
      idleIllustration.innerHTML = '';
      idleIllustration.appendChild(img);
    }
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
    contentHero.style.position = 'relative';

    if (item.media) {
      if (item.media.type === 'video') {
        var video = document.createElement('video');
        video.src = item.media.src;
        video.setAttribute('playsinline', '');
        video.setAttribute('preload', 'metadata');
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
        contentHero.appendChild(video);
        activeVideo = video;
      } else {
        var img = document.createElement('img');
        img.src = item.media.src;
        img.alt = item.title;
        contentHero.appendChild(img);
        activeVideo = null;
      }
    }

    // Thumbnail gallery
    contentThumbnails.innerHTML = '';
    if (item.thumbnails && item.thumbnails.length > 1) {
      for (var t = 0; t < item.thumbnails.length; t++) {
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
