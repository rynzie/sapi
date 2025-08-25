const imageInput = document.getElementById("imageUpload")
const webcamButton = document.getElementById("webcamButton")
const exitWebcamButton = document.getElementById("exitWebcamButton")
const captureButton = document.getElementById("captureButton")
const webcam = document.getElementById("webcam")
const preview = document.getElementById("preview")
const result = document.getElementById("result")
const detectButton = document.getElementById("detectButton")
const loader = document.getElementById("loader")

const printButton = document.getElementById("printButton")
const printImage = document.getElementById("printImage")
const printDetail = document.getElementById("printDetail")

let base64Image = ""
let webcamStream = null
let detectionInterval = null
let isLive = false
let firstLiveDetection = true
let allowDetection = true

imageInput.addEventListener("change", function () {
  const file = this.files[0]
  resetHasil()

  if (file) {
    const reader = new FileReader()
    reader.onload = function (e) {
      base64Image = e.target.result.replace(/^data:image\/(png|jpeg|jpg);base64,/, "")
      preview.src = e.target.result
      preview.style.display = "block"
      webcam.style.display = "none"
    }
    reader.readAsDataURL(file)
  }
})

webcamButton.addEventListener("click", async function () {
  resetHasil()
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
    })
    webcamStream = stream
    webcam.srcObject = stream

    webcam.style.display = "block"
    preview.style.display = "none"

    webcamButton.style.display = "none"
    exitWebcamButton.style.display = "inline-block"
    captureButton.style.display = "inline-block"
    detectButton.style.display = "none"

    isLive = true
    allowDetection = true
    firstLiveDetection = true
    detectionInterval = setInterval(() => {
      ambilFrameDariKamera()
    }, 1000)
  } catch (err) {
    console.error("Tidak dapat mengakses kamera:", err)
    result.innerHTML = "Tidak dapat mengakses kamera."
  }
})

function ambilFrameDariKamera() {
  if (!webcam.videoWidth || !webcam.videoHeight) return

  const canvas = document.createElement("canvas")
  canvas.width = webcam.videoWidth
  canvas.height = webcam.videoHeight
  const ctx = canvas.getContext("2d")
  ctx.drawImage(webcam, 0, 0)

  base64Image = canvas.toDataURL("image/jpeg").replace(/^data:image\/(png|jpeg|jpg);base64,/, "")
  kirimKeRoboflow(true)
}

captureButton.addEventListener("click", function () {
  if (!webcam.videoWidth || !webcam.videoHeight) return

  if (detectionInterval) {
    clearInterval(detectionInterval)
    detectionInterval = null
  }
  stopWebcam()

  isLive = false
  allowDetection = false
  resetHasil()

  const canvas = document.createElement("canvas")
  canvas.width = webcam.videoWidth
  canvas.height = webcam.videoHeight
  const ctx = canvas.getContext("2d")
  ctx.drawImage(webcam, 0, 0)

  base64Image = canvas.toDataURL("image/jpeg").replace(/^data:image\/(png|jpeg|jpg);base64,/, "")
  preview.src = canvas.toDataURL("image/jpeg")
  preview.style.display = "block"
  webcam.style.display = "none"

  captureButton.style.display = "none"
  detectButton.style.display = "inline-block"
})

exitWebcamButton.addEventListener("click", function () {
  stopWebcam()
  resetSemua()
})

function stopWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach((track) => track.stop())
    webcamStream = null
  }
  if (detectionInterval) {
    clearInterval(detectionInterval)
    detectionInterval = null
  }
  isLive = false
}

function resetSemua() {
  preview.src = ""
  preview.style.display = "block"
  webcam.style.display = "none"

  webcamButton.style.display = "inline-block"
  exitWebcamButton.style.display = "none"
  captureButton.style.display = "none"
  detectButton.style.display = "inline-block"

  imageInput.value = ""
  base64Image = ""
  resetHasil()
}

function resetHasil() {
  result.innerHTML = ""
  printButton.style.display = "none"
}

printButton.addEventListener("click", function () {
  const modal = new bootstrap.Modal(document.getElementById("printModal"))
  modal.show()
})

function tampilkanHasil(className, confidence) {
  result.innerHTML = `
    Jenis kelamin: <strong>${className.toUpperCase()}</strong><br>
    Akurasi: ${confidence}%`

  if (!isLive) {
    printButton.style.display = "inline-block"
    printImage.src = preview.src || webcam.src
    printDetail.innerHTML = `
      <strong>Jenis kelamin:</strong> ${className.toUpperCase()}<br>
      <strong>Akurasi:</strong> ${confidence}%<br>
      <strong>Tanggal:</strong> ${new Date().toLocaleString()}
    `
  } else {
    printButton.style.display = "none"
  }
}

function kirimKeRoboflow(fromLive = false) {
  if (!base64Image) return
  if (!allowDetection && fromLive) return

  if (!fromLive || firstLiveDetection) {
    loader.style.display = "block"
    result.innerHTML = ""
  }

  fetch("https://detect.roboflow.com/male-cow-or-female-cow/1?api_key=Q0Ki6HgByuyWhNRKwMf7", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: base64Image,
  })
    .then((res) => res.json())
    .then((data) => {
      if (!allowDetection && fromLive) return

      if (data.predictions && data.predictions.length > 0) {
        const prediction = data.predictions[0]
        const className = prediction.class
        const confidence = (prediction.confidence * 100).toFixed(2)

        tampilkanHasil(className, confidence)
      } else {
        result.innerHTML = "Tidak dapat mengenali jenis kelamin sapi."
        printButton.style.display = "none"
      }
    })
    .catch((err) => {
      console.error(err)
      result.innerHTML = "Terjadi kesalahan saat mendeteksi."
      printButton.style.display = "none"
    })
    .finally(() => {
      if (!fromLive || firstLiveDetection) {
        loader.style.display = "none"
        firstLiveDetection = false
      }
    })
}

detectButton.addEventListener("click", function () {
  if (base64Image) {
    allowDetection = true
    kirimKeRoboflow(false)
  }
})
