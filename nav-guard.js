(function(){
  var navigating = false;

  function setupNavGuard(){
    var links = document.querySelectorAll('nav a');
    links.forEach(function(link){
      link.addEventListener('click', function(e){
        // Let external links (Discord/Youtube, target="_blank") behave normally.
        if (link.target === '_blank') return;

        if (navigating){
          e.preventDefault();
          return;
        }
        navigating = true;
        // Safety reset in case navigation is somehow cancelled by the browser.
        setTimeout(function(){ navigating = false; }, 1500);
      });
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', setupNavGuard);
  } else {
    setupNavGuard();
  }
})();
