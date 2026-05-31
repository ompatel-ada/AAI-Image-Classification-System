"use strict";

const modelURLBase = "https://teachablemachine.withgoogle.com/models/6kvLm3cR5/";

let model;
let inputImage = null;
let predictions = [];

async function preloadModel() {
  const modelURL = modelURLBase + "model.json";
  const metadataURL = modelURLBase + "metadata.json";

  model = await tmImage.load(modelURL, metadataURL);
}

function setup() {
  const canvas = createCanvas(480, 360);
  canvas.parent("image_container");
  background("#c0c0c0");

  preloadModel();

  document.getElementById("imageUpload").addEventListener("change", function (event) {
    const file = event.target.files[0];

    if (file) {
      const img = createImg(URL.createObjectURL(file), "", "", async () => {
        img.hide();
        inputImage = img;

        predictions = await model.predict(img.elt);
      });
    }
  });
}

function draw() {
  background("#c0c0c0");

  if (inputImage) {
    image(inputImage, 0, 0, width, height);
  }

  if (predictions.length > 0) {
    document.getElementById("results").innerHTML = predictions
      .map(prediction =>
        `${prediction.className}: ${(prediction.probability * 100).toFixed(1)}%`
      )
      .join(", ");
  } else {
    document.getElementById("results").innerHTML = "Please upload an image...";
  }
}