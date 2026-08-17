(function(){
  // If this specific page load was caused by the browser's reload/refresh
  // action (as opposed to a normal link click or history navigation),
  // send the visitor back to the splash screen so they have to hit
  // "Enter" again. Regular nav-tab clicks are unaffected since those are
  // "navigate" type loads, not "reload" type loads.
  function wasReloaded(){
    if (window.performance && typeof window.performance.getEntriesByType === 'function'){
      const entries = window.performance.getEntriesByType('navigation');
      if (entries && entries.length && entries[0].type){
        return entries[0].type === 'reload';
      }
    }
    // Fallback for older browsers without the Navigation Timing Level 2 API
    if (window.performance && window.performance.navigation){
      return window.performance.navigation.type === 1; // 1 = TYPE_RELOAD
    }
    return false;
  }

  if (wasReloaded()){
    // Reset the saved playback position so that once the visitor makes it
    // back through the splash screen and hits "Enter" again, the track
    // starts over from the beginning instead of resuming where it left off.
    try {
      sessionStorage.removeItem('sdn-audio-time');
      sessionStorage.removeItem('sdn-audio-enabled');
      sessionStorage.removeItem('sdn-audio-muted');
    } catch (e) { /* sessionStorage unavailable, safe to ignore */ }

    window.location.replace('splash.html');
  }
})();
