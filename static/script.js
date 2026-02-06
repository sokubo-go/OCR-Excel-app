document.addEventListener("DOMContentLoaded", () => {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");
  const cameraInput = document.getElementById("cameraInput");
  const selectBtn = document.getElementById("selectBtn");
  const cameraBtn = document.getElementById("cameraBtn");
  const previewArea = document.getElementById("previewArea");
  const previewGrid = document.getElementById("previewGrid");
  const fileCount = document.getElementById("fileCount");
  const selectAllCb = document.getElementById("selectAllCb");
  const clearBtn = document.getElementById("clearBtn");
  const actionArea = document.getElementById("actionArea");
  const convertBtn = document.getElementById("convertBtn");
  const progressArea = document.getElementById("progressArea");
  const progressText = document.getElementById("progressText");
  const errorArea = document.getElementById("errorArea");
  const errorText = document.getElementById("errorText");
  const retryBtn = document.getElementById("retryBtn");
  const resultsArea = document.getElementById("resultsArea");
  const resultsList = document.getElementById("resultsList");
  const mergeBtn = document.getElementById("mergeBtn");
  const newBtn = document.getElementById("newBtn");

  // { file: File, selected: boolean }
  let imageItems = [];
  // { filename: string, blob: Blob, selected: boolean }
  let resultItems = [];

  // === ドラッグ&ドロップ ===
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

  // === ファイル選択 ===
  dropZone.addEventListener("click", (e) => {
    if (
      e.target === selectBtn ||
      selectBtn.contains(e.target) ||
      e.target === cameraBtn ||
      cameraBtn.contains(e.target)
    )
      return;
    fileInput.click();
  });

  selectBtn.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    addFiles(Array.from(fileInput.files));
    fileInput.value = "";
  });

  // === カメラ撮影 ===
  cameraBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    cameraInput.click();
  });

  cameraInput.addEventListener("change", () => {
    if (cameraInput.files.length > 0) {
      addFiles(Array.from(cameraInput.files));
    }
    cameraInput.value = "";
  });

  // === ファイル追加 ===
  function addFiles(files) {
    for (const file of files) {
      imageItems.push({ file, selected: true });
    }
    updatePreview();
  }

  // === プレビュー更新 ===
  function updatePreview() {
    previewGrid.innerHTML = "";
    fileCount.textContent = imageItems.length;

    if (imageItems.length === 0) {
      previewArea.hidden = true;
      actionArea.hidden = true;
      return;
    }

    previewArea.hidden = false;
    actionArea.hidden = false;

    imageItems.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "preview-item" + (item.selected ? " selected" : "");

      const img = document.createElement("img");
      img.src = URL.createObjectURL(item.file);
      img.alt = item.file.name;
      img.onload = () => URL.revokeObjectURL(img.src);

      const overlay = document.createElement("div");
      overlay.className = "item-overlay";

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "item-checkbox";
      cb.checked = item.selected;
      cb.addEventListener("change", () => {
        item.selected = cb.checked;
        div.classList.toggle("selected", cb.checked);
        updateSelectAll();
        updateConvertBtnLabel();
      });

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-btn";
      removeBtn.textContent = "\u00d7";
      removeBtn.title = "\u524a\u9664";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        imageItems.splice(index, 1);
        updatePreview();
      });

      overlay.appendChild(cb);
      overlay.appendChild(removeBtn);

      const fileName = document.createElement("div");
      fileName.className = "file-name";
      fileName.textContent = item.file.name;

      div.appendChild(img);
      div.appendChild(overlay);
      div.appendChild(fileName);
      previewGrid.appendChild(div);
    });

    updateSelectAll();
    updateConvertBtnLabel();
  }

  // === 全選択チェックボックス ===
  selectAllCb.addEventListener("change", () => {
    imageItems.forEach((item) => (item.selected = selectAllCb.checked));
    updatePreview();
  });

  function updateSelectAll() {
    const allSelected = imageItems.length > 0 && imageItems.every((i) => i.selected);
    selectAllCb.checked = allSelected;
  }

  function updateConvertBtnLabel() {
    const count = imageItems.filter((i) => i.selected).length;
    convertBtn.textContent =
      count > 0
        ? `\u9078\u629e\u3057\u305f ${count} \u679a\u3092 Excel \u306b\u5909\u63db`
        : "\u753b\u50cf\u3092\u9078\u629e\u3057\u3066\u304f\u3060\u3055\u3044";
    convertBtn.disabled = count === 0;
  }

  // === クリア ===
  clearBtn.addEventListener("click", () => {
    imageItems = [];
    updatePreview();
  });

  // === 変換 ===
  convertBtn.addEventListener("click", async () => {
    const selected = imageItems.filter((i) => i.selected);
    if (selected.length === 0) return;

    showState("progress");
    progressText.textContent = `AI-OCR\u3067 ${selected.length} \u679a\u3092\u8aad\u307f\u53d6\u308a\u4e2d...`;

    const formData = new FormData();
    for (const item of selected) {
      formData.append("files", item.file);
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

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition") || "";
      let filename = "\u52e4\u52d9\u8868.xlsx";

      const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
      if (filenameMatch) {
        filename = decodeURIComponent(filenameMatch[1]);
      }

      // 結果を保存
      resultItems.push({ filename, blob, selected: false });
      showResults();

      // 自動ダウンロード
      downloadBlob(blob, filename);
    } catch (err) {
      errorText.textContent = err.message;
      showState("error");
    }
  });

  // === 結果表示 ===
  function showResults() {
    showState("results");
    resultsList.innerHTML = "";

    resultItems.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "result-item" + (item.selected ? " selected" : "");

      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = item.selected;
      cb.addEventListener("change", () => {
        item.selected = cb.checked;
        div.classList.toggle("selected", cb.checked);
        updateMergeBtn();
      });

      const info = document.createElement("div");
      info.className = "result-info";

      const name = document.createElement("div");
      name.className = "result-name";
      name.textContent = item.filename;

      const detail = document.createElement("div");
      detail.className = "result-detail";
      detail.textContent = `${(item.blob.size / 1024).toFixed(1)} KB`;

      info.appendChild(name);
      info.appendChild(detail);

      const dlBtn = document.createElement("button");
      dlBtn.className = "btn btn-download";
      dlBtn.textContent = "\u30c0\u30a6\u30f3\u30ed\u30fc\u30c9";
      dlBtn.addEventListener("click", () => downloadBlob(item.blob, item.filename));

      div.appendChild(cb);
      div.appendChild(info);
      div.appendChild(dlBtn);
      resultsList.appendChild(div);
    });

    updateMergeBtn();
  }

  function updateMergeBtn() {
    const count = resultItems.filter((i) => i.selected).length;
    mergeBtn.hidden = count < 2;
    mergeBtn.textContent = `\u9078\u629e\u3057\u305f ${count} \u30d5\u30a1\u30a4\u30eb\u3092\u30de\u30fc\u30b8\u3057\u3066\u51fa\u529b`;
  }

  // === マージ ===
  mergeBtn.addEventListener("click", async () => {
    const selected = resultItems.filter((i) => i.selected);
    if (selected.length < 2) return;

    mergeBtn.disabled = true;
    mergeBtn.textContent = "\u30de\u30fc\u30b8\u4e2d...";

    const formData = new FormData();
    selected.forEach((item, i) => {
      formData.append("files", item.blob, item.filename);
    });

    try {
      const response = await fetch("/api/merge", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(
          err?.detail || `\u30de\u30fc\u30b8\u30a8\u30e9\u30fc (${response.status})`
        );
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition") || "";
      let filename = "\u52e4\u52d9\u8868_\u7d71\u5408.xlsx";

      const filenameMatch = contentDisposition.match(/filename\*=UTF-8''(.+)/);
      if (filenameMatch) {
        filename = decodeURIComponent(filenameMatch[1]);
      }

      downloadBlob(blob, filename);
    } catch (err) {
      alert("\u30de\u30fc\u30b8\u306b\u5931\u6557\u3057\u307e\u3057\u305f: " + err.message);
    } finally {
      mergeBtn.disabled = false;
      updateMergeBtn();
    }
  });

  // === リトライ ===
  retryBtn.addEventListener("click", () => {
    showState("default");
  });

  // === 新規変換 ===
  newBtn.addEventListener("click", () => {
    imageItems = [];
    resultItems = [];
    updatePreview();
    showState("default");
  });

  // === ユーティリティ ===
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function showState(state) {
    progressArea.hidden = state !== "progress";
    errorArea.hidden = state !== "error";
    resultsArea.hidden = state !== "results";
    convertBtn.disabled = state === "progress";

    if (state === "default") {
      // アップロードエリアに戻る
      dropZone.hidden = false;
    }
    if (state === "results") {
      // アップロードエリアも表示したまま（追加変換可能）
      dropZone.hidden = false;
    }
  }
});
