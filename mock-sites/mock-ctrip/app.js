const params = new URLSearchParams(window.location.search);
const from = params.get("from") || "WUH";
const to = params.get("to") || "BJS";
const date = params.get("date") || "2026-08-16";

const routeInfo = document.getElementById("routeInfo");
if (routeInfo) {
  routeInfo.textContent = `路线：${from} -> ${to} (${date})`;
}

const listContainer = document.getElementById("ctrip-flight-list");

if (listContainer) {
  // 模拟 1.2 秒延迟加载
  setTimeout(() => {
    const flights = [
      { num: "南方航空 CZ3137", dep: "08:20", arr: "10:25", depAir: "武汉天河T3", arrAir: "北京大兴", price: "¥620起" },
      { num: "东方航空 MU2451", dep: "11:00", arr: "13:10", depAir: "武汉天河T3", arrAir: "首都国际T2", price: "¥680" },
      { num: "中国国航 CA1342", dep: "15:30", arr: "17:40", depAir: "武汉天河T3", arrAir: "首都国际T3", price: "¥710" },
      { num: "海南航空 HU7182", dep: "20:10", arr: "22:15", depAir: "武汉天河T3", arrAir: "北京大兴", price: "¥590起" },
    ];

    listContainer.innerHTML = flights
      .map(
        (f) => `
      <div class="ctrip-flight-card">
        <div class="flight-main">
          <div class="ctrip-flight-num">${f.num}</div>
          <div class="time-group">
            <div class="ctrip-dep-time">${f.dep}</div>
            <div class="ctrip-dep-airport">${f.depAir}</div>
          </div>
          <div>→</div>
          <div class="time-group">
            <div class="ctrip-arr-time">${f.arr}</div>
            <div class="ctrip-arr-airport">${f.arrAir}</div>
          </div>
        </div>
        <div>
          <div class="ctrip-price-text">${f.price}</div>
          <div class="ctrip-tax-text">税费: ¥70</div>
          <div class="ctrip-expand-btn">展开舱位详情 ▾</div>
        </div>
      </div>
    `
      )
      .join("");
  }, 1200);
}

const searchBtn = document.getElementById("searchBtn");
if (searchBtn) {
  searchBtn.addEventListener("click", () => {
    const origin = document.querySelector('[data-ctrip-input="origin"]').value;
    const dest = document.querySelector('[data-ctrip-input="destination"]').value;
    const depDate = document.querySelector('[data-ctrip-input="date"]').value;
    window.location.href = `search.html?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(dest)}&date=${encodeURIComponent(depDate)}`;
  });
}
