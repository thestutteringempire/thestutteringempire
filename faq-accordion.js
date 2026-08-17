(function(){
  function setupAccordion(){
    var items = document.querySelectorAll('.faq-item');
    if (!items.length) return;

    items.forEach(function(item){
      var question = item.querySelector('.faq-question');
      if (!question) return;

      question.addEventListener('click', function(){
        var isOpen = item.classList.contains('open');

        // Close every item first, then open the clicked one if it wasn't
        // already open - this enforces "only one answer visible at a time".
        items.forEach(function(other){
          other.classList.remove('open');
          var otherAnswer = other.querySelector('.faq-answer');
          if (otherAnswer) otherAnswer.style.maxHeight = null;
          var otherQuestion = other.querySelector('.faq-question');
          if (otherQuestion) otherQuestion.setAttribute('aria-expanded', 'false');
        });

        if (!isOpen){
          item.classList.add('open');
          var answer = item.querySelector('.faq-answer');
          if (answer) answer.style.maxHeight = answer.scrollHeight + 'px';
          question.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', setupAccordion);
  } else {
    setupAccordion();
  }
})();
