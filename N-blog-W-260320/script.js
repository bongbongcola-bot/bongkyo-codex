const placeInput = document.getElementById("placeInput");
const authorInput = document.getElementById("authorInput");
const keywordInput = document.getElementById("keywordInput");
const featuresInput = document.getElementById("featuresInput");
const photoInput = document.getElementById("photoInput");
const previewGallery = document.getElementById("previewGallery");
const previewText = document.getElementById("previewText");
const blogForm = document.getElementById("blogForm");
const generatedTitle = document.getElementById("generatedTitle");
const resultOutput = document.getElementById("resultOutput");
const copyButton = document.getElementById("copyButton");
const formatButtons = Array.from(document.querySelectorAll(".tab-button"));

let currentFormat = "html";
let uploadedPhotos = [];
let currentDraft = null;

const initialDraft = {
  title: "아직 생성된 제목이 없습니다.",
  html: "<section>\n  <h1>입력값을 넣고 블로그 글 생성을 눌러주세요.</h1>\n</section>",
  md: "# 입력값을 넣고 블로그 글 생성을 눌러주세요.",
  text: "입력값을 넣고 블로그 글 생성을 눌러주세요."
};

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseFeatures(rawText) {
  return rawText
    .split(/\r?\n|,/) 
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildTitle(place, keyword) {
  return `${place} ${keyword} 후기`;
}

function buildPhotoMarkers(photoList) {
  if (!photoList.length) {
    return [];
  }

  return photoList.map((photo, index) => {
    const label = photo.analysis?.label || "현장 사진";
    return `[사진 ${index + 1}: ${photo.name} - ${label}]`;
  });
}

function getPhotoDescription(photo) {
  return photo?.description?.trim() || "";
}

function buildDescriptionBlend(description, fallback) {
  if (!description) {
    return fallback;
  }

  return `${description}라는 느낌이 실제로도 잘 살아 있어서, 그 인상을 자연스럽게 풀어주는 쪽이 훨씬 어울리더라고요.`;
}

function pickPhotosBySlot(photoList, slot) {
  return photoList.filter((photo) => photo.analysis?.slot === slot);
}

function takePhotoMarker(photoList, index = 0) {
  if (!photoList[index]) {
    return "";
  }

  const photo = photoList[index];
  return `[사진 ${uploadedPhotos.indexOf(photo) + 1}: ${photo.name} - ${photo.analysis?.label || "현장 사진"}]`;
}

function buildPlacementGuide(photoList) {
  if (!photoList.length) {
    return [];
  }

    return photoList.map((photo, index) => ({
      line: `사진 ${index + 1}: ${photo.name}`,
      reason: getPhotoDescription(photo) || photo.analysis?.guide || "현장 분위기를 보여주는 문단에 배치"
    }));
}

async function getImageStats(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const sampleWidth = 48;
      const sampleHeight = Math.max(1, Math.round((image.naturalHeight / Math.max(1, image.naturalWidth)) * sampleWidth));
      canvas.width = sampleWidth;
      canvas.height = sampleHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) {
        resolve({
          brightness: 0.5,
          greenRatio: 0,
          blueRatio: 0,
          warmRatio: 0
        });
        return;
      }

      context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
      const data = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
      let brightnessSum = 0;
      let greenCount = 0;
      let blueCount = 0;
      let warmCount = 0;
      const pixelCount = Math.max(1, data.length / 4);

      for (let index = 0; index < data.length; index += 4) {
        const red = data[index];
        const green = data[index + 1];
        const blue = data[index + 2];
        brightnessSum += (red + green + blue) / 3;

        if (green > red * 0.9 && green > blue * 1.08) {
          greenCount += 1;
        }

        if (blue > red * 0.9 && blue > green * 1.04) {
          blueCount += 1;
        }

        if (red > green && green > blue) {
          warmCount += 1;
        }
      }

      resolve({
        brightness: brightnessSum / pixelCount / 255,
        greenRatio: greenCount / pixelCount,
        blueRatio: blueCount / pixelCount,
        warmRatio: warmCount / pixelCount
      });
    };
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function loadImageMeta(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight
      });
    };
    image.onerror = reject;
    image.src = dataUrl;
  });
}

async function detectFaces(dataUrl) {
  if (typeof FaceDetector === "undefined") {
    return [];
  }

  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = dataUrl;
    });

    const detector = new FaceDetector({ fastMode: true, maxDetectedFaces: 5 });
    return await detector.detect(image);
  } catch (error) {
    return [];
  }
}

async function analyzePhoto(file, dataUrl) {
  const meta = await loadImageMeta(dataUrl);
  const faces = await detectFaces(dataUrl);
  const stats = await getImageStats(dataUrl);
  const imageArea = Math.max(1, meta.width * meta.height);
  const largestFaceArea = faces.reduce((max, face) => {
    const area = face.boundingBox.width * face.boundingBox.height;
    return Math.max(max, area);
  }, 0);
  const faceRatio = largestFaceArea / imageArea;
  const aspectRatio = meta.width / Math.max(1, meta.height);
  const lowerName = file.name.toLowerCase();
  const babyHint = /(baby|infant|newborn|아기|베이비|돌|백일)/.test(lowerName);
  const familyHint = /(family|mom|dad|parent|brother|sister|가족|엄마|아빠|부모|형제|자매)/.test(lowerName);
  const indoorHint = /(indoor|inside|hall|room|studio|실내|홀|룸|스튜디오)/.test(lowerName);
  const outdoorHint = /(outdoor|garden|park|terrace|yard|야외|정원|테라스|공원)/.test(lowerName);

  if (babyHint || (faces.length === 1 && faceRatio > 0.11)) {
    return {
      name: file.name,
      dataUrl,
      analysis: {
        slot: "baby",
        label: "아기사진",
        guide: "아기 표정이나 사랑스러운 순간을 설명하는 문단 옆에 배치"
      }
    };
  }

  if (familyHint || faces.length >= 2) {
    return {
      name: file.name,
      dataUrl,
      analysis: {
        slot: "family",
        label: "가족사진",
        guide: "가족 분위기나 함께한 장면을 설명하는 문단 옆에 배치"
      }
    };
  }

  if (outdoorHint || (aspectRatio > 1.3 && (stats.greenRatio > 0.18 || stats.blueRatio > 0.2) && stats.brightness > 0.45)) {
    return {
      name: file.name,
      dataUrl,
      analysis: {
        slot: "outdoor",
        label: "야외 전경",
        guide: "야외 공간감이나 배경 분위기를 설명하는 문단 옆에 배치"
      }
    };
  }

  if (indoorHint || (aspectRatio > 1.18 && stats.warmRatio > 0.28 && stats.brightness > 0.32)) {
    return {
      name: file.name,
      dataUrl,
      analysis: {
        slot: "indoor",
        label: "실내 전경",
        guide: "실내 공간 설명이나 분위기 소개 문단 옆에 배치"
      }
    };
  }

  return {
    name: file.name,
    dataUrl,
    analysis: {
      slot: "detail",
      label: "디테일 컷",
      guide: "소품, 분위기, 작은 포인트를 설명하는 문단 옆에 배치"
    }
  };
}

function trimParagraphsToRange(paragraphs, minLength, maxLength) {
  let joined = paragraphs.join(" ");

  while (joined.length > maxLength && paragraphs.length > 1) {
    const lastIndex = paragraphs.length - 1;
    paragraphs[lastIndex] = paragraphs[lastIndex].slice(0, Math.max(90, paragraphs[lastIndex].length - 120)).trim();
    joined = paragraphs.join(" ");

    if (paragraphs[lastIndex].length <= 100) {
      paragraphs.pop();
      joined = paragraphs.join(" ");
    }
  }

  if (joined.length < minLength) {
    paragraphs.push("방문 목적과 실제 만족 포인트를 한 줄 더 덧붙여주면, 처음 들어온 분들도 글 내용을 훨씬 편하게 이해할 수 있어요.");
    joined = paragraphs.join(" ");
  }

  if (joined.length > maxLength) {
    const overflow = joined.length - maxLength;
    const lastIndex = paragraphs.length - 1;
    paragraphs[lastIndex] = paragraphs[lastIndex].slice(0, Math.max(90, paragraphs[lastIndex].length - overflow - 2)).trim();
  }

  return paragraphs;
}

function buildBodyParagraphs(place, keyword, author, features, photoMarkers) {
  const babyMarker = photoMarkers.baby;
  const familyMarker = photoMarkers.family;
  const outdoorMarker = photoMarkers.outdoor;
  const indoorMarker = photoMarkers.indoor;
  const detailMarker = photoMarkers.detail;
  const babyDescription = photoMarkers.babyDescription;
  const familyDescription = photoMarkers.familyDescription;
  const outdoorDescription = photoMarkers.outdoorDescription;
  const indoorDescription = photoMarkers.indoorDescription;
  const detailDescription = photoMarkers.detailDescription;

  const babyParagraph = babyMarker
    ? `${babyMarker} 이 사진은 제가 촬영하면서 제일 먼저 눈길이 갔던 아기 표정 컷이에요. ${buildDescriptionBlend(babyDescription, "이런 사진은 그냥 예쁘다고만 적기보다는, 실제로 얼마나 귀엽고 사랑스러운 표정이 담겼는지 이야기하는 문단에 같이 들어가야 훨씬 자연스럽더라고요.")}`
    : `제가 촬영한 샘플사진은 현장 분위기를 보여주는 흐름으로 넣어주면 훨씬 자연스럽게 읽혀요.`;

  const featureSentence = features.length
    ? `제가 ${place}에서 촬영하면서 특히 좋다고 느꼈던 부분은 ${features.join(", ")} 였어요. ${keyword} 찾으시는 분들도 이런 실제 포인트를 궁금해하실 것 같아서, 느꼈던 분위기 그대로 풀어보는 쪽이 더 잘 맞겠더라고요.`
    : `${place}의 분위기와 이용 흐름을 중심으로, 제가 직접 촬영하면서 느낀 인상을 자연스럽게 담는 후기형 문단으로 구성했어요.`;

  const familyParagraph = familyMarker
    ? `${familyMarker} 가족사진은 인원만 보이는 컷으로 쓰기보다는, 서로 바라보는 분위기나 함께 있는 자연스러운 느낌을 설명하는 구간에 넣는 게 좋아요. ${buildDescriptionBlend(familyDescription, "제가 현장에서 느낀 따뜻한 공기까지 같이 전해져서 후기 글 흐름이 훨씬 부드러워지더라고요.")}`
    : `${keyword} 검색해서 들어오시는 분들은 사진이랑 같이 실제 분위기를 보고 싶어 하시니까, 제가 현장에서 느꼈던 인상을 본문 중간에 같이 적어주는 방식이 잘 맞아요.`;

  const outdoorParagraph = outdoorMarker
    ? `${outdoorMarker} 이 사진은 야외 배경이 넓게 담긴 컷이라서, 공간감이나 전체 무드를 설명하는 부분에 넣는 게 가장 잘 어울렸어요. ${buildDescriptionBlend(outdoorDescription, "하늘이나 정원, 외부 동선처럼 현장의 큰 분위기를 보여주는 사진은 이런 문단에 들어가야 글이 더 자연스럽게 이어지더라고요.")}`
    : `${place}의 전체 분위기나 공간감을 설명할 때는, 글과 같이 현장 인상이 보이는 사진이 들어가면 훨씬 이해가 쉬워져요.`;

  const indoorParagraph = indoorMarker
    ? `${indoorMarker} 실내 전경 사진은 제가 실제로 머물렀던 공간의 분위기와 구조를 설명하는 부분에 붙여두면 좋아요. ${buildDescriptionBlend(indoorDescription, "조명이나 색감, 공간의 깊이감이 같이 보여서 현장에서 받았던 인상이 더 또렷하게 전달되거든요.")}`
    : `${place} 안쪽 공간을 설명할 때는 조명이나 구조 같은 요소를 함께 적어주면 후기가 더 생생하게 읽혀요.`;

  const extraPhotos = detailMarker
    ? `${detailMarker} 이 사진은 크게 보이는 장면보다는 작은 디테일이나 무드가 살아 있는 컷이라서, 본문에서 분위기 포인트를 설명하는 부분에 붙여주는 게 가장 자연스러웠어요. ${buildDescriptionBlend(detailDescription, "이런 디테일 컷이 들어가면 제가 현장에서 왜 이 장면을 좋게 봤는지도 더 잘 전해지더라고요.")}`
    : `${place}에서 촬영하면서 느꼈던 포인트를 중간중간 짚어주면, 광고 문구보다 훨씬 자연스러운 후기 글로 읽혀요.`;

  const paragraphs = [
    `안녕하세요. 오늘은 제가 ${place}에서 촬영했던 이야기를 바탕으로, ${keyword} 찾으시는 분들께 도움이 될 만한 후기를 편하게 남겨보려고 해요. 직접 촬영하면서 느꼈던 분위기와 눈에 들어왔던 장면들을 제 시선으로 정리해보면 좋겠다 싶었어요.`,
    `${place}처럼 분위기가 중요한 장소는 사진만 보는 것보다, 촬영하는 사람이 현장에서 어떤 느낌을 받았는지 같이 읽히면 훨씬 생생하게 전달되더라고요. 그래서 이번 글도 ${keyword}를 중심으로 제가 실제로 보고 느꼈던 흐름대로 차분하게 풀어봤어요.`,
    babyParagraph,
    featureSentence,
    familyParagraph,
    `제가 촬영하면서 느낀 건 ${place}는 한두 가지 장점만 적는 곳이 아니라는 점이었어요. 오히려 작은 디테일이나 순간적인 분위기가 더 오래 기억에 남는 장소였고, 그런 부분이 사진에도 자연스럽게 담기더라고요.`,
    outdoorParagraph,
    indoorParagraph,
    `특히 ${keyword} 관련 후기는 장소 설명만 길게 적는 것보다, 제가 직접 봤던 장면을 하나씩 붙여서 풀어주는 편이 훨씬 자연스럽게 읽히는 것 같아요. 어느 공간에서 사진이 잘 나왔는지, 어떤 구간이 특히 예뻤는지, 실제로 보면 어떤 느낌인지 이런 부분들이 촬영자 입장에서는 더 중요하게 남거든요.`,
    extraPhotos,
    `이번 글에 들어가는 사진들은 모두 제가 직접 촬영한 샘플사진들이에요. 문단 사이에 자연스럽게 배치해두면 제가 현장에서 느꼈던 공기나 분위기가 조금 더 잘 전달되는 것 같아요. ${place}를 한마디로 정리하자면, ${keyword}를 찾는 분들께 편하게 추천하고 싶은 분위기의 장소였고, 촬영자로서도 기억에 남는 장면이 많은 곳이었어요.`
  ];

  const article = paragraphs.join(" ");

  if (article.length > 1500) {
    return trimParagraphsToRange(paragraphs, 1000, 1500);
  }

  if (article.length < 1000) {
    paragraphs.push(`저처럼 직접 촬영한 사람의 시선에서 풀어낸 후기는 사진이랑 같이 볼 때 훨씬 편하게 읽히더라고요. 마지막에 제가 느낀 한 줄 소감까지 붙여주면 전체 글 분위기도 더 자연스럽게 정리돼요.`);
  }

  return trimParagraphsToRange(paragraphs, 1000, 1500);
}

function buildHtmlOutput(data) {
  const { place, keyword, author, features, title, photos } = data;
  const babyPhotos = pickPhotosBySlot(photos, "baby");
  const familyPhotos = pickPhotosBySlot(photos, "family");
  const outdoorPhotos = pickPhotosBySlot(photos, "outdoor");
  const indoorPhotos = pickPhotosBySlot(photos, "indoor");
  const detailPhotos = pickPhotosBySlot(photos, "detail");
  const photoMarkers = {
    baby: takePhotoMarker(babyPhotos, 0) || takePhotoMarker(photos, 0),
    family: takePhotoMarker(familyPhotos, 0) || takePhotoMarker(photos, 1),
    outdoor: takePhotoMarker(outdoorPhotos, 0) || takePhotoMarker(photos, 2),
    indoor: takePhotoMarker(indoorPhotos, 0) || takePhotoMarker(photos, 3),
    detail: takePhotoMarker(detailPhotos, 0) || takePhotoMarker(photos, 2),
    babyDescription: getPhotoDescription(babyPhotos[0] || photos[0]),
    familyDescription: getPhotoDescription(familyPhotos[0] || photos[1]),
    outdoorDescription: getPhotoDescription(outdoorPhotos[0] || photos[2]),
    indoorDescription: getPhotoDescription(indoorPhotos[0] || photos[3]),
    detailDescription: getPhotoDescription(detailPhotos[0] || photos[2])
  };
  const paragraphs = buildBodyParagraphs(place, keyword, author, features, photoMarkers);
  const photoList = buildPlacementGuide(photos).length
    ? buildPlacementGuide(photos).map((photo) => `    <li>${escapeHtml(photo.line)} - ${escapeHtml(photo.reason)}</li>`).join("\n")
    : "    <li>등록된 샘플사진 없음</li>";

  return [
    "<article>",
    `  <h1>${escapeHtml(title)}</h1>`,
    `  <p><strong>키워드:</strong> ${escapeHtml(keyword)}</p>`,
    `  <p><strong>촬영장소:</strong> ${escapeHtml(place)}</p>`,
    `  <p><strong>작성자:</strong> ${escapeHtml(author)}</p>`,
    `  <h2>블로그 글</h2>`,
    ...paragraphs.map((item) => `  <p>${escapeHtml(item)}</p>`),
    "  <h2>샘플사진 배치 안내</h2>",
    "  <ul>",
    photoList,
    "  </ul>",
    "</article>"
  ].join("\n");
}

function buildMarkdownOutput(data) {
  const { place, keyword, author, features, title, photos } = data;
  const babyPhotos = pickPhotosBySlot(photos, "baby");
  const familyPhotos = pickPhotosBySlot(photos, "family");
  const outdoorPhotos = pickPhotosBySlot(photos, "outdoor");
  const indoorPhotos = pickPhotosBySlot(photos, "indoor");
  const detailPhotos = pickPhotosBySlot(photos, "detail");
  const photoMarkers = {
    baby: takePhotoMarker(babyPhotos, 0) || takePhotoMarker(photos, 0),
    family: takePhotoMarker(familyPhotos, 0) || takePhotoMarker(photos, 1),
    outdoor: takePhotoMarker(outdoorPhotos, 0) || takePhotoMarker(photos, 2),
    indoor: takePhotoMarker(indoorPhotos, 0) || takePhotoMarker(photos, 3),
    detail: takePhotoMarker(detailPhotos, 0) || takePhotoMarker(photos, 2),
    babyDescription: getPhotoDescription(babyPhotos[0] || photos[0]),
    familyDescription: getPhotoDescription(familyPhotos[0] || photos[1]),
    outdoorDescription: getPhotoDescription(outdoorPhotos[0] || photos[2]),
    indoorDescription: getPhotoDescription(indoorPhotos[0] || photos[3]),
    detailDescription: getPhotoDescription(detailPhotos[0] || photos[2])
  };
  const paragraphs = buildBodyParagraphs(place, keyword, author, features, photoMarkers);
  const photoList = buildPlacementGuide(photos).length
    ? buildPlacementGuide(photos).map((photo) => `- ${photo.line} - ${photo.reason}`).join("\n")
    : "- 등록된 샘플사진 없음";

  return [
    `# ${title}`,
    "",
    `키워드: ${keyword}`,
    `촬영장소: ${place}`,
    `작성자: ${author}`,
    "",
    "## 블로그 글",
    ...paragraphs,
    "",
    "## 샘플사진 배치 안내",
    photoList
  ].join("\n");
}

function buildTextOutput(data) {
  const { place, keyword, author, features, title, photos } = data;
  const babyPhotos = pickPhotosBySlot(photos, "baby");
  const familyPhotos = pickPhotosBySlot(photos, "family");
  const outdoorPhotos = pickPhotosBySlot(photos, "outdoor");
  const indoorPhotos = pickPhotosBySlot(photos, "indoor");
  const detailPhotos = pickPhotosBySlot(photos, "detail");
  const photoMarkers = {
    baby: takePhotoMarker(babyPhotos, 0) || takePhotoMarker(photos, 0),
    family: takePhotoMarker(familyPhotos, 0) || takePhotoMarker(photos, 1),
    outdoor: takePhotoMarker(outdoorPhotos, 0) || takePhotoMarker(photos, 2),
    indoor: takePhotoMarker(indoorPhotos, 0) || takePhotoMarker(photos, 3),
    detail: takePhotoMarker(detailPhotos, 0) || takePhotoMarker(photos, 2),
    babyDescription: getPhotoDescription(babyPhotos[0] || photos[0]),
    familyDescription: getPhotoDescription(familyPhotos[0] || photos[1]),
    outdoorDescription: getPhotoDescription(outdoorPhotos[0] || photos[2]),
    indoorDescription: getPhotoDescription(indoorPhotos[0] || photos[3]),
    detailDescription: getPhotoDescription(detailPhotos[0] || photos[2])
  };
  const paragraphs = buildBodyParagraphs(place, keyword, author, features, photoMarkers);
  const photoList = buildPlacementGuide(photos).length
    ? buildPlacementGuide(photos).map((photo, index) => `${index + 1}. ${photo.line} - ${photo.reason}`).join("\n")
    : "1. 등록된 샘플사진 없음";

  return [
    title,
    "",
    `키워드: ${keyword}`,
    `촬영장소: ${place}`,
    `작성자: ${author}`,
    "",
    "블로그 글",
    ...paragraphs,
    "",
    "샘플사진 배치 안내",
    photoList
  ].join("\n");
}

function renderOutput() {
  const draft = currentDraft || initialDraft;
  generatedTitle.textContent = draft.title;
  resultOutput.value = draft[currentFormat];
}

function setFormat(format) {
  currentFormat = format;
  formatButtons.forEach((button) => {
    const active = button.dataset.format === format;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  renderOutput();
}

function renderPreviewGallery() {
  if (!uploadedPhotos.length) {
    previewGallery.style.display = "none";
    previewGallery.innerHTML = "";
    previewText.textContent = "최대 5장까지 업로드할 수 있고, 생성 결과 본문에는 사진이 들어갈 위치가 파일명과 함께 표시됩니다.";
    return;
  }

  previewGallery.style.display = "grid";
  previewGallery.innerHTML = uploadedPhotos
    .map((photo, index) => `
      <div class="preview-item">
        <img src="${photo.dataUrl}" alt="${escapeHtml(photo.name)}">
        <span>사진 ${index + 1}: ${escapeHtml(photo.name)} (${escapeHtml(photo.analysis?.label || "현장 사진")})</span>
        <textarea
          data-photo-index="${index}"
          placeholder="예: 아기가 웃는 표정이 잘 담긴 사진, 정원이 넓게 보이는 컷, 가족이 서로 바라보는 장면"
        >${escapeHtml(photo.description || "")}</textarea>
      </div>
    `)
    .join("");

  previewText.textContent = `${uploadedPhotos.length}장의 샘플사진을 불러왔습니다. 생성 결과 본문 안에는 [사진 n: 파일명] 형식으로 위치가 표시됩니다.`;

  previewGallery.querySelectorAll("textarea").forEach((textarea) => {
    textarea.addEventListener("input", (event) => {
      const index = Number(event.target.dataset.photoIndex);
      if (Number.isNaN(index) || !uploadedPhotos[index]) {
        return;
      }

      uploadedPhotos[index].description = event.target.value.trim();
    });
  });
}

function updatePreview(files) {
  const selectedFiles = Array.from(files || []).slice(0, 5);

  if (!selectedFiles.length) {
    uploadedPhotos = [];
    renderPreviewGallery();
    return;
  }

  if (files.length > 5) {
    previewText.textContent = "샘플사진은 최대 5장까지만 사용할 수 있어 처음 5장만 반영했습니다.";
  }

  Promise.all(
    selectedFiles.map((file) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        resolve({
          file,
          dataUrl: typeof reader.result === "string" ? reader.result : ""
        });
      });
      reader.readAsDataURL(file);
    }))
  ).then((photos) => {
    Promise.all(
      photos
        .filter((photo) => photo.dataUrl)
        .map((photo) => analyzePhoto(photo.file, photo.dataUrl))
    ).then((analyzedPhotos) => {
      uploadedPhotos = analyzedPhotos.map((photo) => ({
        ...photo,
        description: ""
      }));
      renderPreviewGallery();
    });
  });
}

photoInput.addEventListener("change", (event) => {
  updatePreview(event.target.files);
});

formatButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setFormat(button.dataset.format);
  });
});

blogForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const place = placeInput.value.trim();
  const author = authorInput.value.trim();
  const keyword = keywordInput.value.trim();
  const features = parseFeatures(featuresInput.value);
  const title = buildTitle(place, keyword);

  currentDraft = {
    title,
    html: buildHtmlOutput({ place, keyword, author, features, title, photos: uploadedPhotos }),
    md: buildMarkdownOutput({ place, keyword, author, features, title, photos: uploadedPhotos }),
    text: buildTextOutput({ place, keyword, author, features, title, photos: uploadedPhotos })
  };

  renderOutput();
});

copyButton.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(resultOutput.value);
    copyButton.textContent = "복사 완료";
    window.setTimeout(() => {
      copyButton.textContent = "복사";
    }, 1500);
  } catch (error) {
    copyButton.textContent = "복사 실패";
    window.setTimeout(() => {
      copyButton.textContent = "복사";
    }, 1500);
  }
});

setFormat(currentFormat);
renderOutput();
