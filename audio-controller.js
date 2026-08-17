(function(){
  var AUDIO_SRC = 'audio/anthem.mp3';
  var ENABLED_KEY = 'sdn-audio-enabled';
  var TIME_KEY = 'sdn-audio-time';
  var MUTED_KEY = 'sdn-audio-muted';
  var SAVE_INTERVAL_MS = 100;

  var audio = document.getElementById('bg-audio');
  if (!audio) return;

  var enabled = sessionStorage.getItem(ENABLED_KEY) === '1';
  if (!enabled) return;

  audio.preload = 'auto';
  audio.loop = true;
  audio.volume = 1.0;
  audio.src = AUDIO_SRC;

  // Apply whatever mute state the visitor last set, so muting on one page
  // carries over to every other page instead of resetting per nav click.
  audio.muted = sessionStorage.getItem(MUTED_KEY) === '1';

  var savedTime = parseFloat(sessionStorage.getItem(TIME_KEY));
  if (!isNaN(savedTime) && savedTime > 0){
    audio.currentTime = savedTime;
  }

  var attempted = false;

  function startPlayback(){
    if (attempted) return;
    attempted = true;
    var playPromise = audio.play();
    if (playPromise && typeof playPromise.catch === 'function'){
      playPromise.catch(function(err){
        attempted = false;
        var resumeOnce = function(){
          attempted = true;
          audio.play().catch(function(){ attempted = false; });
          document.removeEventListener('click', resumeOnce);
        };
        document.addEventListener('click', resumeOnce);
      });
    }
  }

  // Fire as early and as often as the browser will realistically allow -
  // right now (script runs immediately, before the rest of the page has
  // even been parsed, since this tag sits at the very top of <head>),
  // and again the moment the browser signals it actually has enough
  // data to play without stalling.
  startPlayback();
  audio.addEventListener('loadedmetadata', startPlayback, { once: true });
  audio.addEventListener('canplay', startPlayback, { once: true });
  audio.addEventListener('canplaythrough', startPlayback, { once: true });

  // Whenever the visitor toggles mute (via the browser's native audio
  // controls, right-click menu, or any other means), remember that choice
  // so the next page load starts already in the same muted/unmuted state.
  audio.addEventListener('volumechange', function(){
    sessionStorage.setItem(MUTED_KEY, audio.muted ? '1' : '0');
  });

  var saveTimer = setInterval(function(){
    if (!audio.paused){
      sessionStorage.setItem(TIME_KEY, String(audio.currentTime));
    }
  }, SAVE_INTERVAL_MS);

  function persistTime(){
    sessionStorage.setItem(TIME_KEY, String(audio.currentTime));
  }

  window.addEventListener('pagehide', function(){
    persistTime();
    clearInterval(saveTimer);
  });
  window.addEventListener('beforeunload', persistTime);
  document.addEventListener('visibilitychange', function(){
    if (document.visibilityState === 'hidden') persistTime();
  });

  // Save the instant a nav link is clicked/pressed, before the browser
  // even begins tearing down the current page - this is the single
  // biggest lever for a tight handoff, since it captures the precise
  // moment of departure rather than relying on unload timing.
  function attachNavSaveListeners(){
    var navLinks = document.querySelectorAll('nav a:not([target="_blank"])');
    navLinks.forEach(function(link){
      link.addEventListener('pointerdown', persistTime);
      link.addEventListener('click', persistTime);
    });
  }
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', attachNavSaveListeners);
  } else {
    attachNavSaveListeners();
  }
})();
