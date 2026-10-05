document.addEventListener("DOMContentLoaded", () => {
  const openYullaBtn = document.getElementById("open-yulla");
  if (openYullaBtn) {
    openYullaBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.create({ url: "https://www.str8m.gg/yulla" });
      } else {
        window.open("https://www.str8m.gg/yulla", "_blank");
      }
    });
  }
});
