(function(){
  function shuffle(array){
    for (var i = array.length - 1; i > 0; i--){
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = array[i];
      array[i] = array[j];
      array[j] = tmp;
    }
    return array;
  }

  function randomizeMembers(){
    var el = document.getElementById('members-paragraph');
    if (!el) return;

    var names = el.textContent.split(',').map(function(n){ return n.trim(); });
    shuffle(names);
    el.textContent = names.join(', ');
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', randomizeMembers);
  } else {
    randomizeMembers();
  }
})();
