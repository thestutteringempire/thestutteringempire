(function(){
  var start = new Date(2022, 9, 15); // October 15, 2022 (month is 0-indexed)
  var now = new Date();

  // Normalize both dates to midnight so partial-day time doesn't skew the count
  var startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  var nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  var msPerDay = 1000 * 60 * 60 * 24;
  var diffDays = Math.round((nowMidnight - startMidnight) / msPerDay);

  // Exclude both the start day and the current day from the count
  var activeDays = diffDays - 1;
  if (activeDays < 0) activeDays = 0;

  var formatted = activeDays.toLocaleString('en-US');

  var el = document.getElementById('active-days');
  if (el){
    el.textContent = formatted;
  }

  var yearEl = document.getElementById('copyright-year');
  if (yearEl){
    yearEl.textContent = now.getFullYear();
  }
})();
