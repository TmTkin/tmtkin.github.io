const dialog = document.querySelector(".image-lightbox");

if (dialog && typeof dialog.showModal === "function") {
  const dialogImage = dialog.querySelector("img");
  const closeButton = dialog.querySelector(".image-lightbox-close");

  document.querySelectorAll(".image-lightbox-trigger").forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      dialogImage.src = trigger.href;
      dialogImage.alt = trigger.querySelector("img")?.alt ?? "";
      dialog.showModal();
    });
  });

  closeButton.addEventListener("click", () => dialog.close());

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && dialog.open) {
      event.preventDefault();
      dialog.close();
    }
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.addEventListener("close", () => {
    dialogImage.removeAttribute("src");
    dialogImage.alt = "";
  });
}