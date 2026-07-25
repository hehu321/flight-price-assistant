const params = new URLSearchParams(window.location.search);
const from = params.get("from") || "WUH";
const to = params.get("to") || "BJS";
const date = params.get("date") || "2026-08-16";

const routeTitle = document.getElementById("routeTitle");
if (routeTitle) {
  routeTitle.textContent = `去哪儿机票：${from} ✈ ${to} (${date})`;
}

const listContainer = document.getElementById("qunar-flight-list");
if (listContainer) {
  // 分批加载测试
  setTimeout(() => {
    listContainer.innerHTML = `
      <div class="qunar-flight-card">
        <div>
          <div class="qunar-flight-num">南方航空 CZ3137</div>
          <div><span class="qunar-dep-time">08:20</span> (<span class="qunar-dep-airport">武汉天河T3</span>) → <span class="qunar-arr-time">10:25</span> (<span class="qunar-arr-airport">北京大兴</span>)</div>
        </div>
        <div>
          <div class="qunar-price-text">¥605</div>
          <div style="font-size: 12px; color: #888;">券后优惠价</div>
        </div>
      </div>
    `;
  }, 800);

  setTimeout(() => {
    listContainer.innerHTML += `
      <div class="qunar-flight-card">
        <div>
          <div class="qunar-flight-num">东方航空 MU2451</div>
          <div><span class="qunar-dep-time">11:00</span> (<span class="qunar-dep-airport">武汉天河T3</span>) → <span class="qunar-arr-time">13:10</span> (<span class="qunar-arr-airport">首都国际T2</span>)</div>
        </div>
        <div>
          <div class="qunar-price-text">¥670</div>
        </div>
      </div>
    `;
  }, 1600);
}

const qunarSearchBtn = document.getElementById("qunarSearchBtn");
if (qunarSearchBtn) {
  qunarSearchBtn.addEventListener("click", () => {
    const origin = document.querySelector('[data-qunar-input="origin"]').value;
    const dest = document.querySelector('[data-qunar-input="destination"]').value;
    const depDate = document.querySelector('[data-qunar-input="date"]').value;
    window.location.href = `results.html?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(dest)}&date=${encodeURIComponent(depDate)}`;
  });
}
