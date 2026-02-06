document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const selectBtn = document.getElementById("selectBtn");
  const previewArea = document.getElementById("previewArea");
  const previewGrid = document.getElementById("previewGrid");
  const fileCount = document.getElementById("fileCount");
  const clearBtn = document.getElementById("clearBtn");
  const actionArea = document.getElementById("actionArea");
  const convertBtn = document.getElementById("convertBtn");
  const progressArea = document.getElementById("progressArea");
  const progressText = document.getElementById("progressText");
  const errorArea = document.getElementById("errorArea");
  const errorText = document.getElementById("errorText");
  const retryBtn = document.getElementById("retryBtn");
  const successArea = document.getElementById("successArea");
  const newBtn = document.getElementById("newBtn");

  let selectedFiles = [];

  // ドラッグ&ドロップ
  dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("drag-over");
  });

  dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/")
    );
    addFiles(files);
  });

  // クリックでファイル選択
  dropZone.addEventListener("click", (e) => {
    if (e.target === selectBtn || selectBtn.contains(e.target)) return;
    fileInput.click();
  });

  selectBtn.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    addFiles(Array.from(fileInput.files));
    fileInput.value = "";
  });

  // ファイル追加
  function addFiles(files) {
    for (const file of files) {
      selectedFiles.push(file);
    }
    updatePreview();
  }

  // プレビュー更新
  function updatePreview() {
    previewGrid.innerHTML = "";
    fileCount.textContent = selectedFiles.length;

    if (selectedFiles.length === 0) {
      previewArea.hidden = true;
      actionArea.hidden = true;
      return;
    }

    previewArea.hidden = false;
    actionArea.hidden = false;

    selectedFiles.forEach((file, index) => {
      const item = document.createElement("div");
      item.className = "preview-item";

      const img = document.createElement("img");
      img.src = URL.createObjectURL(file);
      img.alt = file.name;
      img.onload = () => URL.revokeObjectURL(img.src);

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "\u00d7";
      removeBtn.title = "\u524a\u9664";
      removeBtn.addEventListener("click", () => {
        selectedFiles.splice(index, 1);
        updatePreview();
      });

      const fileName = document.createElement("div");
      fileName.className = "file-name";
      fileName.textContent = file.name;

      item.appendChild(img);
      item.appendChild(removeBtn);
      item.appendChild(fileName);
      previewGrid.appendChild(item);
    });
  }

  // クリア
  clearBtn.addEventListener("click", () => {
    selectedFiles = [];
    updatePreview();
  });

  // 変換
  convertBtn.addEventListener("click", async () => {
    if (selectedFiles.length === 0) return;

    showState("progress");
    progressText.textContent = "AI-OCR\u3067\u8aad\u307f\u53d6\u308a\u4e2d...";

    const formData = new FormData();
    for (const file of selectedFiles) {
      formData.append("files", file);
    }

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(
          err?.detail || `\u30b5\u30fc\u30d0\u30fc\u30a8\u30e9\u30fc (${response.status})`
        );
      }

      progressText.textContent = "Excel\u30d5\u30a1\u30a4\u30eb\u3092\u751f\u6210\u4e2d...";

      // ダウンロード処理
      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition") || "";
      let filename = "\u52e4\u6020\u8868.xlsx";

      // Content-Dispositionからファイル名を取得
      const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
      if (filenameMatch) {
        filename = decodeURIComponent(filenameMatch[1]);
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showState("success");
    } catch (err) {
      errorText.textContent = err.message;
      showState("error");
    }
  });

  // リトライ
  retryBtn.addEventListener("click", () => {
    showState("default");
  });

  // 新規変換
  newBtn.addEventListener("click", () => {
    selectedFiles = [];
    updatePreview();
    showState("default");
  });

  // 状態切り替え
  function showState(state) {
    progressArea.hidden = state !== "progress";
    errorArea.hidden = state !== "error";
    successArea.hidden = state !== "success";

    // 変換中はボタンを無効化
    convertBtn.disabled = state === "progress";

    if (state === "progress") {
      actionArea.hidden = false;
    }
  }
});
