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

let base64Image = ""
let webcamStream = null
let detectionInterval = null
let isLive = false
let firstLiveDetection = true
let allowDetection = true

let cocoModel = null
let cocoReadyPromise = null

function ensureCocoLoaded() {
  if (cocoReadyPromise) return cocoReadyPromise

  cocoReadyPromise = new Promise((resolve, reject) => {
    let checks = 0
    const interval = setInterval(() => {
      checks++
      if (window.cocoSsd) {
        clearInterval(interval)
        window.cocoSsd
          .load()
          .then((model) => {
            cocoModel = model
            console.log("COCO-SSD loaded")
            resolve(model)
          })
          .catch(reject)
      } else if (checks > 100) {
        clearInterval(interval)
        reject(new Error("COCO-SSD script not found"))
      }
    }, 200)
  })

  return cocoReadyPromise
}

async function safeCocoDetect(el) {
  try {
    if (!cocoModel) await ensureCocoLoaded()
    if (!cocoModel) return []
    const preds = await cocoModel.detect(el)
    return preds || []
  } catch (e) {
    console.error("COCO detect error", e)
    return []
  }
}

async function isCowDetected(el) {
  const preds = await safeCocoDetect(el)
  return preds.some((p) => p.class === "cow" && p.score > 0.55)
}

function resetHasil() {
  result.innerHTML = ""
  printButton.style.display = "none"
  const img = document.getElementById("printImage")
  const detail = document.getElementById("printDetail")
  if (img) img.src = ""
  if (detail) detail.innerHTML = ""
}

function resetSemua() {
  preview.src = ""
  preview.style.display = "none"
  webcam.style.display = "none"
  webcamButton.style.display = "inline-block"
  exitWebcamButton.style.display = "none"
  captureButton.style.display = "none"
  detectButton.style.display = "inline-block"
  imageInput.value = ""
  base64Image = ""
  resetHasil()
}

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
  allowDetection = false
}

imageInput.addEventListener("change", function () {
  const file = this.files[0]
  resetHasil()
  if (!file) return

  const reader = new FileReader()
  reader.onload = function (e) {
    preview.src = e.target.result
    preview.style.display = "block"
    webcam.style.display = "none"
    base64Image = e.target.result.replace(/^data:image\/(png|jpeg|jpg);base64,/, "")
  }
  reader.readAsDataURL(file)
})

webcamButton.addEventListener("click", async function () {
  resetHasil()
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
    })
    webcamStream = stream
    webcam.srcObject = stream
    await webcam.play()

    webcam.style.display = "block"
    preview.style.display = "none"
    webcamButton.style.display = "none"
    exitWebcamButton.style.display = "inline-block"
    captureButton.style.display = "inline-block"
    detectButton.style.display = "none"

    isLive = true
    allowDetection = true
    firstLiveDetection = true

    detectionInterval = setInterval(() => ambilFrameDariKamera(), 1000)
    ensureCocoLoaded().catch(() => {})
  } catch (err) {
    console.error(err)
    result.innerHTML = "Tidak dapat mengakses kamera."
  }
})

async function ambilFrameDariKamera() {
  if (!webcam.videoWidth || !webcam.videoHeight) return

  const canvas = document.createElement("canvas")
  canvas.width = webcam.videoWidth
  canvas.height = webcam.videoHeight
  const ctx = canvas.getContext("2d")
  ctx.drawImage(webcam, 0, 0)

  if (firstLiveDetection) {
    loader.style.display = "block"
  }

  const cowDetected = await isCowDetected(canvas)

  loader.style.display = "none"

  if (!cowDetected) {
    result.innerHTML = "<span style='color:red'>❌ Tidak ada sapi di frame</span>"
    base64Image = ""
    return
  }

  base64Image = canvas.toDataURL("image/jpeg").replace(/^data:image\/(png|jpeg|jpg);base64,/, "")
  result.innerHTML = "<span style='color:green'>✔ Sapi terdeteksi (live)</span>"

  kirimKeRoboflow(true)
  firstLiveDetection = false
}

captureButton.addEventListener("click", async function () {
  if (!webcam.videoWidth || !webcam.videoHeight) return
  if (detectionInterval) clearInterval(detectionInterval)

  const canvas = document.createElement("canvas")
  canvas.width = webcam.videoWidth
  canvas.height = webcam.videoHeight
  const ctx = canvas.getContext("2d")
  ctx.drawImage(webcam, 0, 0)

  preview.src = canvas.toDataURL("image/jpeg")
  preview.style.display = "block"
  webcam.style.display = "none"

  loader.style.display = "block"
  await ensureCocoLoaded()
  const cowDetected = await isCowDetected(preview)
  loader.style.display = "none"

  if (!cowDetected) {
    result.innerHTML = "<span style='color:red'>❌ Bukan sapi (hasil capture)</span>"
    base64Image = ""
  } else {
    base64Image = preview.src.replace(/^data:image\/(png|jpeg|jpg);base64,/, "")
  }

  stopWebcam()
  isLive = false
  allowDetection = false
  resetHasil()

  captureButton.style.display = "none"
  detectButton.style.display = "inline-block"
})

exitWebcamButton.addEventListener("click", function () {
  stopWebcam()
  allowDetection = false
  resetSemua()
})

function kirimKeRoboflow(fromLive = false) {
  if (!base64Image) return
  if (!allowDetection && fromLive) return

  loader.style.display = "block"
  result.innerHTML = ""

  fetch("https://detect.roboflow.com/male-cow-or-female-cow/1?api_key=Q0Ki6HgByuyWhNRKwMf7", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: base64Image,
  })
    .then((res) => res.json())
    .then((data) => {
      if (!allowDetection && fromLive) return
      if (data.predictions && data.predictions.length > 0) {
        const pred = data.predictions[0]
        tampilkanHasil(pred.class, (pred.confidence * 100).toFixed(2))
      } else {
        result.innerHTML = "Tidak dapat mengenali jenis kelamin sapi."
        printButton.style.display = "none"
      }
    })
    .catch((err) => {
      console.error(err)
      result.innerHTML = "Terjadi kesalahan"
      printButton.style.display = "none"
    })
    .finally(() => {
      loader.style.display = "none"
    })
}

function tampilkanHasil(className, confidence) {
  result.innerHTML = `Jenis kelamin: <strong>${className.toUpperCase()}</strong><br> Akurasi: ${confidence}%`
  if (!isLive) {
    printButton.style.display = "inline-block"
    document.getElementById("printImage").src = preview.src
    document.getElementById("printDetail").innerHTML = `
      <strong>Jenis kelamin:</strong> ${className.toUpperCase()}<br>
      <strong>Akurasi:</strong> ${confidence}%<br>
      <strong>Tanggal:</strong> ${new Date().toLocaleString()}
    `
  } else {
    printButton.style.display = "none"
  }
}

detectButton.addEventListener("click", async function () {
  if (!preview.src) return

  loader.style.display = "block"
  result.innerHTML = ""

  await ensureCocoLoaded()
  const cowDetected = await isCowDetected(preview)
  loader.style.display = "none"

  if (!cowDetected) {
    result.innerHTML = "<span style='color:red'>❌ Objek bukan sapi. Deteksi dibatalkan.</span>"
    printButton.style.display = "none"
    base64Image = ""
    return
  }

  if (!base64Image) base64Image = preview.src.replace(/^data:image\/(png|jpeg|jpg);base64,/, "")
  allowDetection = true
  kirimKeRoboflow(false)
})

printButton.addEventListener("click", function () {
  const modal = new bootstrap.Modal(document.getElementById("printModal"))
  modal.show()
})
