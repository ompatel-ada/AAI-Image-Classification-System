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
  document.getElementById("results").innerHTML = "Loading models...";

  models.gender = await loadSingleModel(modelURLs.gender);
  models.age = await loadSingleModel(modelURLs.age);
  models.glasses = await loadSingleModel(modelURLs.glasses);

  document.getElementById("results").innerHTML = "Models loaded. Please upload an image...";
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

function interpretConfidence(className, probability) {
  const percentage = (probability * 100).toFixed(1);
  const formattedClass = formatClassName(className);

  if (probability >= IS_THRESHOLD) {
    return `Subject is ${formattedClass} (${percentage}%)`;
  }

  if (probability >= LIKELY_THRESHOLD) {
    return `Subject is likely ${formattedClass} (${percentage}%)`;
  }

  return `Subject could be ${formattedClass} (${percentage}%)`;
}

async function classifyImage(imgElement) {
  agentResults = [];

  const genderPredictions = await models.gender.predict(imgElement);
  const agePredictions = await models.age.predict(imgElement);
  const glassesPredictions = await models.glasses.predict(imgElement);

  const topGender = getTopPrediction(genderPredictions);
  const topAge = getTopPrediction(agePredictions);
  const topGlasses = getTopPrediction(glassesPredictions);

  agentResults.push(interpretConfidence(topGender.className, topGender.probability));
  agentResults.push(interpretConfidence(topAge.className, topAge.probability));
  agentResults.push(interpretConfidence(topGlasses.className, topGlasses.probability));

  displayResults();
}

function displayResults() {
  if (agentResults.length === 0) {
    document.getElementById("results").innerHTML = "Please upload an image...";
    return;
  }

  document.getElementById("results").innerHTML = agentResults
    .map(result => `<div>${result}</div>`)
    .join("");
}

function setup() {
  const canvas = createCanvas(480, 360);
  canvas.parent("image_container");
  background("#829FC4");

  preloadModels();

  document.getElementById("imageUpload").addEventListener("change", function (event) {
    const file = event.target.files[0];

    if (file) {
      const img = createImg(URL.createObjectURL(file), "", "", async () => {
        img.hide();
        inputImage = img;

        document.getElementById("results").innerHTML = "Classifying image...";
        await classifyImage(img.elt);
      });
    }
  });
}

function draw() {
  background("#143C73");

  if (inputImage) {
    image(inputImage, 0, 0, width, height);
  }
}