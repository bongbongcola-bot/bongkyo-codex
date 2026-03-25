const themes = [
  {
    title: "차분한 시작",
    description: "작은 변화가 화면 전체의 분위기를 바꾸는 예제입니다.",
    bgStart: "#f7efe5",
    bgEnd: "#dce8f6",
    cardBg: "rgba(255, 255, 255, 0.72)",
    cardBorder: "rgba(255, 255, 255, 0.6)",
    textMain: "#1f2a37",
    textSoft: "#52606d",
    buttonBg: "#1f2a37",
    buttonText: "#f8fafc",
    secondaryBg: "transparent",
    secondaryBorder: "rgba(31, 42, 55, 0.18)",
    shadow: "0 24px 60px rgba(31, 42, 55, 0.16)"
  },
  {
    title: "햇살 한 조각",
    description: "따뜻한 색감으로 바뀌며 화면이 조금 더 부드럽게 느껴집니다.",
    bgStart: "#ffe7c2",
    bgEnd: "#ffd2cc",
    cardBg: "rgba(255, 250, 242, 0.76)",
    cardBorder: "rgba(255, 255, 255, 0.65)",
    textMain: "#5c3317",
    textSoft: "#8a5430",
    buttonBg: "#a54d22",
    buttonText: "#fffaf4",
    secondaryBg: "transparent",
    secondaryBorder: "rgba(92, 51, 23, 0.18)",
    shadow: "0 24px 60px rgba(165, 77, 34, 0.18)"
  },
  {
    title: "깊은 바다 공기",
    description: "푸른 계열의 조합으로 조금 더 시원하고 또렷한 느낌을 줍니다.",
    bgStart: "#d8f3ff",
    bgEnd: "#9bb8ff",
    cardBg: "rgba(243, 251, 255, 0.74)",
    cardBorder: "rgba(255, 255, 255, 0.68)",
    textMain: "#11324d",
    textSoft: "#31536f",
    buttonBg: "#124e78",
    buttonText: "#f4fbff",
    secondaryBg: "transparent",
    secondaryBorder: "rgba(17, 50, 77, 0.16)",
    shadow: "0 24px 60px rgba(18, 78, 120, 0.2)"
  },
  {
    title: "저녁의 여유",
    description: "잔잔한 노을빛을 담아 조금 더 감성적인 분위기로 전환합니다.",
    bgStart: "#f6d6bd",
    bgEnd: "#d7c0f1",
    cardBg: "rgba(255, 247, 242, 0.72)",
    cardBorder: "rgba(255, 255, 255, 0.64)",
    textMain: "#402b3a",
    textSoft: "#6f5266",
    buttonBg: "#6d435a",
    buttonText: "#fff7fb",
    secondaryBg: "transparent",
    secondaryBorder: "rgba(64, 43, 58, 0.16)",
    shadow: "0 24px 60px rgba(109, 67, 90, 0.18)"
  }
];

const root = document.documentElement;
const body = document.body;
const title = document.getElementById("title");
const description = document.getElementById("description");
const nextButton = document.getElementById("nextButton");
const resetButton = document.getElementById("resetButton");

let currentThemeIndex = 0;

function applyTheme(index) {
  const theme = themes[index];

  title.textContent = theme.title;
  description.textContent = theme.description;
  body.dataset.theme = String(index);

  root.style.setProperty("--bg-start", theme.bgStart);
  root.style.setProperty("--bg-end", theme.bgEnd);
  root.style.setProperty("--card-bg", theme.cardBg);
  root.style.setProperty("--card-border", theme.cardBorder);
  root.style.setProperty("--text-main", theme.textMain);
  root.style.setProperty("--text-soft", theme.textSoft);
  root.style.setProperty("--button-bg", theme.buttonBg);
  root.style.setProperty("--button-text", theme.buttonText);
  root.style.setProperty("--button-secondary-bg", theme.secondaryBg);
  root.style.setProperty("--button-secondary-border", theme.secondaryBorder);
  root.style.setProperty("--shadow", theme.shadow);
}

nextButton.addEventListener("click", () => {
  currentThemeIndex = (currentThemeIndex + 1) % themes.length;
  applyTheme(currentThemeIndex);
});

resetButton.addEventListener("click", () => {
  currentThemeIndex = 0;
  applyTheme(currentThemeIndex);
});

applyTheme(currentThemeIndex);
