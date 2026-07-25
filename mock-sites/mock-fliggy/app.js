const params = new URLSearchParams(window.location.search);
const from = params.get("from") || "WUH";
const to = params.get("to") || "BJS";
const date = params.get("date") || "2026-08-16";

const fliggyTitle = document.getElementById("fliggyTitle");
if (fliggyTitle) {
  fliggyTitle.textContent = `飞猪机票：${from} -> ${to} (${date})`;
}

const listContainer = document.getElementById("fliggy-flight-list");
if (listContainer) {
  // 模拟二次刷新（显示会员价与公开价）
  setTimeout(() => {
    listContainer.innerHTML = `
      <div class="fliggy-flight-card">
        <div>
          <div class="fliggy-flight-num">南方航空 CZ3137</div>
          <div><span class="fliggy-dep-time">08:20</span> (<span class="fliggy-dep-airport">武汉天河T3</span>) → <span class="fliggy-arr-time">10:25</span> (<span class="fliggy-arr-airport">北京大兴</span>)</div>
        </div>
        <div>
          <div class="fliggy-price-text">¥580 <span class="member-tag">会员专享</span></div>
          <div style="font-size: 11px; color: #999;">含税待确认</div>
        </div>
      </div>
      <div class="fliggy-flight-card">
        <div>
          <div class="fliggy-flight-num">中国国航 CA1342</div>
          <div><span class="fliggy-dep-time">15:30</span> (<span class="fliggy-dep-airport">武汉天河T3</span>) → <span class="fliggy-arr-time">17:40</span> (<span class="fliggy-arr-airport">首都国际T3</span>)</div>
        </div>
        <div>
          <div class="fliggy-price-text">¥700</div>
        </div>
      </div>
    `;
  }, 1000);
}

// 模拟输入下拉绑定
const depInput = document.getElementById("depCityName");
const originOptions = document.getElementById("originOptions");

if (depInput && originOptions) {
  depInput.addEventListener("input", () => {
    originOptions.style.display = "block";
  });
  originOptions.addEventListener("click", (e) => {
    if (e.target.classList.contains("fliggy-option-item")) {
      depInput.value = e.target.textContent;
      originOptions.style.display = "none";
    }
  });
}

const fliggySearchBtn = document.getElementById("fliggySearchBtn");
if (fliggySearchBtn) {
  fliggySearchBtn.addEventListener("click", () => {
    const origin = document.getElementById("depCityName").value || "WUH";
    const dest = document.getElementById("arrCityName").value || "BJS";
    const depDate = document.getElementById("depDate").value;
    window.location.href = `results.html?from=${encodeURIComponent(origin)}&to=${encodeURIComponent(dest)}&date=${encodeURIComponent(depDate)}`;
  });
}
