import { BlockingDetectionResult, BlockingState } from "@/shared/types/platform";

export function detectCommonBlockingState(): BlockingDetectionResult {
  const url = window.location.href.toLowerCase();
  const html = document.body ? document.body.innerText.toLowerCase() : "";
  const hasPasswordField = Boolean(document.querySelector('input[type="password"], input[autocomplete="current-password"]'));
  const hasLoginForm = hasPasswordField && /登录|login|账号/.test(html);

  if (url.includes("login") || url.includes("passport") || html.includes("请先登录") || hasLoginForm) {
    return {
      state: "login_required",
      message: "需要登录才能查看机票价格",
      evidence: ["URL包含login/passport、页面显示请先登录，或出现账号密码登录表单"],
    };
  }

  if (
    url.includes("captcha") ||
    url.includes("sec") ||
    html.includes("验证码") ||
    html.includes("拖动滑块") ||
    document.querySelector("#nc_1_wrapper, .geetest_holder, #baxia-dialog-content")
  ) {
    return {
      state: "captcha",
      message: "触发平台安全验证码",
      evidence: ["发现验证码控件或拖动滑块提示"],
    };
  }

  if (html.includes("短信验证") || html.includes("动态口令")) {
    return {
      state: "sms_verification",
      message: "需要进行二次短信验证",
      evidence: ["页面要求输入短信验证码"],
    };
  }

  return {
    state: "none",
    message: "正常页面",
    evidence: [],
  };
}
