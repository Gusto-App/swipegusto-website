/* Gusto · Home — widget "Anche l'acqua conta".
   Riproduce lo stato del prototipo: waterMl parte da 800, i pulsanti aggiungono
   250/500/750 ml con clamp a 2000, etichetta in formato italiano "x,y / 2,0 L". */
(function () {
  "use strict";

  var MAX = 2000;
  var waterMl = 800;

  var fill = document.querySelector("[data-water-fill]");
  var label = document.querySelector("[data-water-label]");
  var buttons = document.querySelectorAll("[data-water-add]");

  if (!fill || !label) return;

  function format(ml) {
    return (ml / 1000).toFixed(1).replace(".", ",") + " / 2,0 L";
  }

  function render() {
    var pct = Math.max(0, Math.min(100, (waterMl / MAX) * 100));
    fill.style.width = pct + "%";
    label.textContent = format(waterMl);
  }

  Array.prototype.forEach.call(buttons, function (btn) {
    btn.addEventListener("click", function () {
      var add = parseInt(btn.getAttribute("data-water-add"), 10) || 0;
      waterMl = Math.min(MAX, waterMl + add);
      render();
    });
  });

  render();
})();
