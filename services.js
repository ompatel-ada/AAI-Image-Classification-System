"use strict";

const modelURLs = {
  gender: "https://teachablemachine.withgoogle.com/models/cv1XKFYWC/",
  age: "https://teachablemachine.withgoogle.com/models/jIIkmEh8n/",
  glasses: "https://teachablemachine.withgoogle.com/models/ylTyeAEhu/"
};

// Confidence thresholds
const LIKELY_THRESHOLD = 0.60;
const IS_THRESHOLD = 0.80;

let models = {};
let inputImage = null;
let agentResults = [];

async function loadSingleModel(modelBaseURL) {
  const modelURL = modelBaseURL + "model.json";
  const metadataURL = modelBaseURL + "metadata.json";
  return await tmImage.load(modelURL, metadataURL);
}

async function preloadModels() {
  const resultsContainer = document.getElementById("results");
  resultsContainer.className = "status-box";
  resultsContainer.innerHTML = "Loading models...";

  try {
    models.gender = await loadSingleModel(modelURLs.gender);
    models.age = await loadSingleModel(modelURLs.age);
    models.glasses = await loadSingleModel(modelURLs.glasses);

    resultsContainer.innerHTML = "Models loaded successfully. Please upload an image.";
  } catch (error) {
    console.error("Error loading models:", error);
    resultsContainer.innerHTML = "Error loading models. Please refresh the page.";
  }
}

function getTopPrediction(predictions) {
  return predictions.reduce((best, current) =>
    current.probability > best.probability ? current : best
  );
}

function formatClassName(className) {
  const normalised = className.toLowerCase();

  if (normalised === "male") return "Male";
  if (normalised === "female") return "Female";
  if (normalised === "young") return "Young";
  if (normalised === "old") return "Old";
  if (normalised === "glasses") return "With Glasses";
  if (normalised === "no_glasses" || normalised === "no glasses") return "Without Glasses";

  return className;
}

function getCategoryTitle(categoryKey) {
  if (categoryKey === "gender") return "Gender Classifier";
  if (categoryKey === "age") return "Age Classifier";
  if (categoryKey === "glasses") return "Eyewear Classifier";
  return "Classifier";
}

function interpretConfidence(categoryKey, className, probability) {
  const percentage = (probability * 100).toFixed(1);
  const formattedClass = formatClassName(className);

  if (probability >= IS_THRESHOLD) {
    return {
      category: getCategoryTitle(categoryKey),
      text: `Subject is ${formattedClass}`,
      percentage: `${percentage}%`,
      level: "is",
      cssClass: "status-is",
      badgeClass: "badge-is",
      badgeText: "High Confidence"
    };
  }

  if (probability >= LIKELY_THRESHOLD) {
    return {
      category: getCategoryTitle(categoryKey),
      text: `Subject is likely ${formattedClass}`,
      percentage: `${percentage}%`,
      level: "likely",
      cssClass: "status-likely",
      badgeClass: "badge-likely",
      badgeText: "Medium Confidence"
    };
  }

  return {
    category: getCategoryTitle(categoryKey),
    text: `Subject could be ${formattedClass}`,
    percentage: `${percentage}%`,
    level: "could",
    cssClass: "status-could",
    badgeClass: "badge-could",
    badgeText: "Low Confidence"
  };
}

async function classifyImage(imgElement) {
  agentResults = [];

  const genderPredictions = await models.gender.predict(imgElement);
  const agePredictions = await models.age.predict(imgElement);
  const glassesPredictions = await models.glasses.predict(imgElement);

  const topGender = getTopPrediction(genderPredictions);
  const topAge = getTopPrediction(agePredictions);
  const topGlasses = getTopPrediction(glassesPredictions);

  agentResults.push(interpretConfidence("gender", topGender.className, topGender.probability));
  agentResults.push(interpretConfidence("age", topAge.className, topAge.probability));
  agentResults.push(interpretConfidence("glasses", topGlasses.className, topGlasses.probability));

  displayResults();
}

function displayResults() {
  const resultsContainer = document.getElementById("results");

  if (agentResults.length === 0) {
    resultsContainer.className = "status-box";
    resultsContainer.innerHTML = "Please upload an image...";
    return;
  }

  resultsContainer.className = "";

  resultsContainer.innerHTML = agentResults
    .map(result => `
      <div class="result-card">
        <div class="result-label">${result.category}</div>
        <div class="result-text ${result.cssClass}">${result.text}</div>
        <div class="result-confidence">Confidence: ${result.percentage}</div>
        <div class="badge ${result.badgeClass}">${result.badgeText}</div>
      </div>
    `)
    .join("");
}

function drawImageContain(img, x, y, boxWidth, boxHeight) {
  const imgAspect = img.width / img.height;
  const boxAspect = boxWidth / boxHeight;

  let drawWidth, drawHeight;

  if (imgAspect > boxAspect) {
    drawWidth = boxWidth;
    drawHeight = boxWidth / imgAspect;
  } else {
    drawHeight = boxHeight;
    drawWidth = boxHeight * imgAspect;
  }

  const offsetX = x + (boxWidth - drawWidth) / 2;
  const offsetY = y + (boxHeight - drawHeight) / 2;

  image(img, offsetX, offsetY, drawWidth, drawHeight);
}

function setup() {
  const canvas = createCanvas(420, 420);
  canvas.parent("image_container");
  background("#eef4fb");

  preloadModels();

  document.getElementById("imageUpload").addEventListener("change", function (event) {
    const file = event.target.files[0];

    if (file) {
      const img = createImg(URL.createObjectURL(file), "", "", async () => {
        img.hide();
        inputImage = img;

        const resultsContainer = document.getElementById("results");
        resultsContainer.className = "status-box";
        resultsContainer.innerHTML = "Classifying image...";

        await classifyImage(img.elt);
      });
    }
  });
}

function draw() {
  background("#eef4fb");

  stroke("#c9d8ea");
  strokeWeight(2);
  fill("#f8fbff");
  rect(10, 10, width - 20, height - 20, 12);

  noStroke();

  if (inputImage) {
    drawImageContain(inputImage, 20, 20, width - 40, height - 40);
  }
}